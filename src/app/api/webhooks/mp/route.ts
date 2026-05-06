import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

// Verifica la firma HMAC que MP envía en el header x-signature.
// Se verifica en TODOS los entornos si MP_WEBHOOK_SECRET está configurado.
function verifySignature(xSignature: string, xRequestId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Sin secret configurado: loguear advertencia y rechazar.
    console.warn("[webhooks/mp] MP_WEBHOOK_SECRET no configurado. Rechazando webhook.");
    return false;
  }
  if (!xSignature || !xRequestId) return false;

  // Formato: "ts=<timestamp>,v1=<hash>"
  const parts = Object.fromEntries(xSignature.split(",").map((p) => p.split("=")));
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");
  return hash === v1;
}

export async function POST(request: Request) {
  const db = createAdminClient();
  const rawBody = await request.text();
  const xSignature = request.headers.get("x-signature") ?? "";
  const xRequestId = request.headers.get("x-request-id") ?? "";

  // ── Verificar firma HMAC en todos los entornos ──────────────────────────
  const valid = verifySignature(xSignature, xRequestId);
  if (!valid) {
    console.error("[webhooks/mp] Firma HMAC inválida o secret faltante.");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  // ── Parsear payload ─────────────────────────────────────────────────────
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  // ── Deduplicación: ignorar si ya procesamos este request_id ────────────
  const { data: existing } = await db
    .from("webhook_events")
    .select("id, status")
    .eq("event_id", xRequestId)
    .maybeSingle();

  if (existing) {
    // Ya procesado (o en proceso): idempotente, responder 200.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Registrar el evento como "pending" para auditoría
  await db.from("webhook_events").insert({
    event_id: xRequestId,
    type: String(event.type ?? "unknown"),
    status: "pending",
    payload: event,
  });

  // ── Solo procesamos eventos de suscripciones ───────────────────────────
  if (event.type !== "subscription_preapproval") {
    await db
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", xRequestId);
    return NextResponse.json({ ok: true });
  }

  const subscriptionId = (event.data as Record<string, unknown>)?.id as string | undefined;
  if (!subscriptionId) {
    await db
      .from("webhook_events")
      .update({ status: "failed", error_message: "subscriptionId faltante" })
      .eq("event_id", xRequestId);
    return NextResponse.json({ error: "subscriptionId faltante" }, { status: 422 });
  }

  try {
    // Consultar el estado real de la suscripción en MP
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
    const preApproval = new PreApproval(client);
    const sub = await preApproval.get({ id: subscriptionId });

    const userId = sub.external_reference;
    if (!userId) {
      await db
        .from("webhook_events")
        .update({ status: "failed", error_message: "external_reference vacío" })
        .eq("event_id", xRequestId);
      return NextResponse.json({ error: "Sin userId" }, { status: 422 });
    }

    // Mapear estado MP → estado interno
    const statusMap: Record<string, string> = {
      authorized: "active",
      paused: "past_due",
      cancelled: "canceled",
      pending: "trialing",
    };
    const status = statusMap[sub.status ?? ""] ?? "inactive";

    // Calcular período desde la última fecha de cargo
    const lastModified = sub.last_modified ? new Date(sub.last_modified) : new Date();
    const frequency = sub.auto_recurring?.frequency ?? 1;
    const frequencyType = sub.auto_recurring?.frequency_type ?? "months";
    const periodEnd = new Date(lastModified);
    if (frequencyType === "months") {
      periodEnd.setMonth(periodEnd.getMonth() + frequency);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + frequency);
    }
    const plan = frequency >= 12 ? "yearly" : "monthly";

    // Upsert en Supabase usando service role (bypasea RLS)
    const { data: existingSub } = await db
      .from("subscriptions")
      .select("id")
      .eq("mp_subscription_id", subscriptionId)
      .maybeSingle();

    if (existingSub) {
      await db
        .from("subscriptions")
        .update({
          status,
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("mp_subscription_id", subscriptionId);
    } else {
      await db.from("subscriptions").insert({
        user_id: userId,
        status,
        plan,
        mp_subscription_id: subscriptionId,
        current_period_start: lastModified.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });
    }

    // Marcar como procesado
    await db
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", xRequestId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[webhooks/mp] Error procesando evento:", errorMsg);

    await db
      .from("webhook_events")
      .update({ status: "failed", error_message: errorMsg })
      .eq("event_id", xRequestId);

    // Retornar 500 para que MP reintente automáticamente
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
