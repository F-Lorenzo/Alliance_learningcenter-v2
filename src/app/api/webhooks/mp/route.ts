import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval, Payment } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";
import {
  parseSafeDate,
  mapMpStatus,
  planFromFrequency,
  calculateNewPeriodEnd,
} from "@/lib/subscription-logic";

/**
 * Verifica la firma HMAC de MP.
 * Formato de x-signature: "ts=<timestamp>,v1=<hash>"
 * Manifest: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 *
 * Si MP_WEBHOOK_SECRET no está configurado, el webhook se rechaza
 * (fail-closed): nunca se procesan payloads sin verificar la firma.
 */
function verifySignature(
  xSignature: string,
  xRequestId: string,
  dataId: string | undefined
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[webhooks/mp] MP_WEBHOOK_SECRET no configurado — rechazando webhook."
    );
    return false;
  }
  if (!xSignature || !xRequestId) {
    console.error("[webhooks/mp] Faltan headers x-signature o x-request-id");
    return false;
  }

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

  const id = dataId ?? xRequestId;
  const manifest = `id:${id};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");

  if (hash !== v1) {
    console.error("[webhooks/mp] Firma HMAC inválida. manifest:", manifest);
    return false;
  }
  return true;
}

async function markEvent(
  db: ReturnType<typeof createAdminClient>,
  eventKey: string,
  status: "processed" | "failed",
  errorMessage?: string
) {
  await db
    .from("webhook_events")
    .update({
      status,
      ...(status === "processed"
        ? { processed_at: new Date().toISOString() }
        : { error_message: errorMessage }),
    })
    .eq("event_id", eventKey);
}

export async function POST(request: Request) {
  const db = createAdminClient();
  const rawBody = await request.text();
  const xSignature = request.headers.get("x-signature") ?? "";
  const xRequestId = request.headers.get("x-request-id") ?? "";

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const dataId = (event.data as Record<string, unknown>)?.id as string | undefined;

  if (!verifySignature(xSignature, xRequestId, dataId)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  console.log("[webhooks/mp] Evento:", event.type, "| data.id:", dataId, "| request-id:", xRequestId);

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
  } else if (inserted === null && !insertError) {
    console.log("[webhooks/mp] Duplicado, ignorando:", eventKey);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

  // ── Evento: subscription_preapproval (alta / cambio de estado) ────────────
  if (event.type === "subscription_preapproval") {
    if (!dataId) {
      await markEvent(db, eventKey, "failed", "data.id faltante");
      return NextResponse.json({ error: "data.id faltante" }, { status: 422 });
    }

    try {
      const preApproval = new PreApproval(client);
      const sub = await preApproval.get({ id: dataId });

      console.log("[webhooks/mp] PreApproval:", { id: dataId, status: sub.status, external_reference: sub.external_reference });

      const userId = sub.external_reference;
      if (!userId) {
        await markEvent(db, eventKey, "failed", "external_reference vacío");
        return NextResponse.json({ error: "Sin userId" }, { status: 422 });
      }

      const status = mapMpStatus(sub.status);
      const lastModified = parseSafeDate(sub.last_modified);
      const frequency = sub.auto_recurring?.frequency ?? 1;
      const frequencyType =
        (sub.auto_recurring?.frequency_type as "months" | "years") ?? "months";
      const plan = planFromFrequency(frequency);

      // Obtener current_period_end actual para no acortarlo.
      // Prioridad: match exacto por mp_subscription_id, luego fallback por user_id.
      let existingSub: { id: string; current_period_end: string | null; mp_subscription_id: string | null } | null = null;
      {
        const { data } = await db
          .from("subscriptions")
          .select("id, current_period_end, mp_subscription_id")
          .eq("mp_subscription_id", dataId)
          .maybeSingle();
        existingSub = data;
      }
      if (!existingSub) {
        const { data } = await db
          .from("subscriptions")
          .select("id, current_period_end, mp_subscription_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        existingSub = data;
      }

      const currentEnd = existingSub?.current_period_end
        ? new Date(existingSub.current_period_end)
        : null;
      const periodEnd = calculateNewPeriodEnd(lastModified, currentEnd, frequency, frequencyType);

      if (existingSub) {
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
          .eq("id", existingSub.id);
        console.log("[webhooks/mp] Sub actualizada:", existingSub.id);
      } else {
        await db.from("subscriptions").insert({
          user_id: userId,
          status,
          plan,
          mp_subscription_id: dataId,
          current_period_start: lastModified.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
        console.log("[webhooks/mp] Nueva sub para userId:", userId);
      }

      await markEvent(db, eventKey, "processed");
      return NextResponse.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[webhooks/mp] Error en preapproval:", msg);
      await markEvent(db, eventKey, "failed", msg);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  }

  // ── Evento: payment (cobro recurrente mensual) ────────────────────────────
  if (event.type === "payment") {
    if (!dataId) {
      await markEvent(db, eventKey, "failed", "data.id faltante");
      return NextResponse.json({ error: "data.id faltante" }, { status: 422 });
    }

    try {
      const paymentApi = new Payment(client);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payment = (await paymentApi.get({ id: dataId })) as any;

      console.log("[webhooks/mp] Payment:", {
        id: dataId,
        status: payment.status,
        preapproval_id: payment.preapproval_id,
        external_reference: payment.external_reference,
      });

      // Solo procesamos pagos aprobados
      if (payment.status !== "approved") {
        console.log("[webhooks/mp] Pago no aprobado, ignorando:", payment.status);
        await markEvent(db, eventKey, "processed");
        return NextResponse.json({ ok: true });
      }

      // preapproval_id exists at runtime but is missing from the SDK types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preapprovalId = (payment as any).preapproval_id as string | undefined;
      const paymentDate = parseSafeDate(payment.date_approved ?? payment.date_created);

      // Buscar suscripción: primero por preapproval_id, fallback por external_reference (userId)
      let subRow: { id: string; current_period_end: string | null } | null = null;

      if (preapprovalId) {
        const { data } = await db
          .from("subscriptions")
          .select("id, current_period_end")
          .eq("mp_subscription_id", preapprovalId as string)
          .maybeSingle();
        subRow = data;
      }

      if (!subRow && payment.external_reference) {
        const { data } = await db
          .from("subscriptions")
          .select("id, current_period_end")
          .eq("user_id", payment.external_reference)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        subRow = data;
      }

      if (!subRow) {
        const msg = `No se encontró suscripción para preapproval_id=${preapprovalId} / external_reference=${payment.external_reference}`;
        console.error("[webhooks/mp]", msg);
        await markEvent(db, eventKey, "failed", msg);
        return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 422 });
      }

      // Extender período
      const currentEnd = subRow.current_period_end ? new Date(subRow.current_period_end) : null;
      // MP plans mensual = 1 month
      const newPeriodEnd = calculateNewPeriodEnd(paymentDate, currentEnd, 1, "months");

      await db
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: newPeriodEnd.toISOString(),
          updated_at: new Date().toISOString(),
          ...(preapprovalId ? { mp_subscription_id: preapprovalId } : {}),
        })
        .eq("id", subRow.id);

      console.log("[webhooks/mp] Período extendido:", { subId: subRow.id, newPeriodEnd: newPeriodEnd.toISOString() });

      await markEvent(db, eventKey, "processed");
      return NextResponse.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[webhooks/mp] Error en payment:", msg);
      await markEvent(db, eventKey, "failed", msg);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  }

  // ── Otros tipos de eventos — ignorar ─────────────────────────────────────
  console.log("[webhooks/mp] Tipo ignorado:", event.type);
  await markEvent(db, eventKey, "processed");
  return NextResponse.json({ ok: true });
}
