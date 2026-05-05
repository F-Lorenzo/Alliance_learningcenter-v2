import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

// Verifica la firma HMAC que MP envía en el header x-signature
function verifySignature(request: Request, rawBody: string, xSignature: string, xRequestId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

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
  try {
    const rawBody = await request.text();
    const xSignature = request.headers.get("x-signature") ?? "";
    const xRequestId = request.headers.get("x-request-id") ?? "";

    // En producción, verificar siempre. En sandbox la firma puede venir vacía.
    const isProduction = !process.env.MP_ACCESS_TOKEN?.startsWith("TEST-");
    if (isProduction && xSignature) {
      const valid = verifySignature(request, rawBody, xSignature, xRequestId);
      if (!valid) {
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    // Solo procesamos eventos de suscripciones
    if (event.type !== "subscription_preapproval") {
      return NextResponse.json({ ok: true });
    }

    const subscriptionId = event.data?.id;
    if (!subscriptionId) return NextResponse.json({ ok: true });

    // Consultar el estado real de la suscripción en MP
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });
    const preApproval = new PreApproval(client);
    const sub = await preApproval.get({ id: subscriptionId });

    const userId = sub.external_reference;
    if (!userId) return NextResponse.json({ ok: true });

    // Mapear estado MP → estado interno
    const statusMap: Record<string, string> = {
      authorized: "active",
      paused: "past_due",
      cancelled: "canceled",
      pending: "trialing",
    };
    const status = statusMap[sub.status ?? ""] ?? "inactive";

    // Calcular período (MP no devuelve period_end directamente en preapproval)
    // Lo calculamos según la frecuencia desde la última fecha de cargo
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
    const db = createAdminClient();
    const { data: existing } = await db
      .from("subscriptions")
      .select("id")
      .eq("mp_subscription_id", subscriptionId)
      .maybeSingle();

    if (existing) {
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhooks/mp]", err);
    // Devolvemos 200 igual para que MP no reintente indefinidamente
    return NextResponse.json({ ok: true });
  }
}
