import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

// Parsea una fecha de MP de forma defensiva. Si el string es inválido devuelve now().
function parseSafeDate(value: unknown): Date {
  if (!value) return new Date();
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Verifica la firma HMAC de MP.
 * Formato de x-signature: "ts=<timestamp>,v1=<hash>"
 * Manifest correcto: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 *
 * Si MP_WEBHOOK_SECRET no está configurado, deja pasar con una advertencia
 * (modo degradado — útil en staging o si el secret aún no fue configurado).
 */
function verifySignature(
  xSignature: string,
  xRequestId: string,
  dataId: string | undefined
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "[webhooks/mp] MP_WEBHOOK_SECRET no configurado — verificación de firma OMITIDA. Configurá la variable en Vercel."
    );
    return true; // modo degradado: permite el webhook pero loguea la advertencia
  }
  if (!xSignature || !xRequestId) {
    console.error("[webhooks/mp] Faltan headers x-signature o x-request-id");
    return false;
  }

  // Parsear "ts=<timestamp>,v1=<hash>"
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx), p.slice(idx + 1)];
    })
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) {
    console.error("[webhooks/mp] x-signature mal formateado:", xSignature);
    return false;
  }

  // id en el manifest = data.id del payload (el preapproval ID), NO el x-request-id
  const id = dataId ?? xRequestId;
  const manifest = `id:${id};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");

  if (hash !== v1) {
    console.error("[webhooks/mp] Firma HMAC inválida. manifest:", manifest);
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const db = createAdminClient();
  const rawBody = await request.text();
  const xSignature = request.headers.get("x-signature") ?? "";
  const xRequestId = request.headers.get("x-request-id") ?? "";

  // ── Parsear payload primero (necesitamos data.id para el manifest HMAC) ──
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const dataId = (event.data as Record<string, unknown>)?.id as string | undefined;

  // ── Verificar firma HMAC ──────────────────────────────────────────────────
  const valid = verifySignature(xSignature, xRequestId, dataId);
  if (!valid) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  console.log("[webhooks/mp] Evento recibido:", event.type, "| data.id:", dataId, "| request-id:", xRequestId);

  // ── Deduplicación atómica ─────────────────────────────────────────────────
  const eventKey = xRequestId || dataId || String(Date.now());
  const { data: inserted, error: insertError } = await db
    .from("webhook_events")
    .upsert(
      {
        event_id: eventKey,
        type: String(event.type ?? "unknown"),
        status: "pending",
        payload: event,
      },
      { onConflict: "event_id", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (insertError) {
    console.error("[webhooks/mp] Error registrando evento:", insertError.message);
    // Si la tabla no existe seguimos igual — no bloqueamos el flujo de pago
  } else if (inserted === null && !insertError) {
    // Evento duplicado
    console.log("[webhooks/mp] Evento duplicado, ignorando:", eventKey);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // ── Solo procesamos eventos de suscripciones ──────────────────────────────
  if (event.type !== "subscription_preapproval") {
    console.log("[webhooks/mp] Tipo de evento ignorado:", event.type);
    await db
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", eventKey);
    return NextResponse.json({ ok: true });
  }

  if (!dataId) {
    console.error("[webhooks/mp] data.id faltante en evento subscription_preapproval");
    await db
      .from("webhook_events")
      .update({ status: "failed", error_message: "data.id faltante" })
      .eq("event_id", eventKey);
    return NextResponse.json({ error: "data.id faltante" }, { status: 422 });
  }

  try {
    // Consultar estado real de la suscripción en MP
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
    const preApproval = new PreApproval(client);
    const sub = await preApproval.get({ id: dataId });

    console.log("[webhooks/mp] Sub MP:", { id: dataId, status: sub.status, external_reference: sub.external_reference });

    const userId = sub.external_reference;
    if (!userId) {
      console.error("[webhooks/mp] external_reference vacío para sub:", dataId);
      await db
        .from("webhook_events")
        .update({ status: "failed", error_message: "external_reference vacío" })
        .eq("event_id", eventKey);
      return NextResponse.json({ error: "Sin userId" }, { status: 422 });
    }

    // Mapear estado MP → estado interno
    const statusMap: Record<string, string> = {
      authorized: "active",
      paused:     "past_due",
      cancelled:  "canceled",
      pending:    "trialing",
    };
    const status = statusMap[sub.status ?? ""] ?? "inactive";
    console.log("[webhooks/mp] Mapeando status:", sub.status, "→", status, "| userId:", userId);

    // Calcular período
    const lastModified = parseSafeDate(sub.last_modified);
    const frequency     = sub.auto_recurring?.frequency ?? 1;
    const frequencyType = sub.auto_recurring?.frequency_type ?? "months";
    const periodEnd     = new Date(lastModified);
    if (frequencyType === "months") {
      periodEnd.setMonth(periodEnd.getMonth() + frequency);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + frequency);
    }
    const plan = frequency >= 12 ? "yearly" : "monthly";

    // ── Upsert de suscripción ─────────────────────────────────────────────
    // Buscar primero por mp_subscription_id (el más específico).
    // Si no existe, buscar por user_id para actualizar la fila existente
    // en lugar de insertar un duplicado.
    const { data: byMpId } = await db
      .from("subscriptions")
      .select("id")
      .eq("mp_subscription_id", dataId)
      .maybeSingle();

    if (byMpId) {
      // Actualizar fila existente por mp_subscription_id
      await db
        .from("subscriptions")
        .update({
          status,
          plan,
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("mp_subscription_id", dataId);
      console.log("[webhooks/mp] Suscripción actualizada (por mp_subscription_id):", byMpId.id);
    } else {
      // Buscar por user_id para no crear duplicados
      const { data: byUserId } = await db
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byUserId) {
        // Actualizar fila existente del usuario y asignarle el mp_subscription_id
        await db
          .from("subscriptions")
          .update({
            status,
            plan,
            mp_subscription_id: dataId,
            current_period_start: lastModified.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", byUserId.id);
        console.log("[webhooks/mp] Suscripción actualizada (por user_id):", byUserId.id);
      } else {
        // Nuevo suscriptor — insertar
        await db.from("subscriptions").insert({
          user_id:              userId,
          status,
          plan,
          mp_subscription_id:   dataId,
          current_period_start: lastModified.toISOString(),
          current_period_end:   periodEnd.toISOString(),
        });
        console.log("[webhooks/mp] Nueva suscripción insertada para userId:", userId);
      }
    }

    // Marcar evento como procesado
    await db
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", eventKey);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[webhooks/mp] Error procesando evento:", errorMsg);

    await db
      .from("webhook_events")
      .update({ status: "failed", error_message: errorMsg })
      .eq("event_id", eventKey);

    // 500 → MP reintenta automáticamente
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
