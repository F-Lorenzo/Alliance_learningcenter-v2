import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval, Payment, Invoice } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { timingSafeEqual } from "crypto";
import {
  parseSafeDate,
  mapMpStatus,
  planFromFrequency,
  frequencyFromPlan,
  calculateNewPeriodEnd,
} from "@/lib/subscription-logic";
import { buildMpWebhookManifest, signMpWebhookManifest } from "@/lib/mp-webhook-signature";

/**
 * Verifica la firma HMAC de MP.
 * Formato de x-signature: "ts=<timestamp>,v1=<hash>"
 * Manifest: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (el par "id:" se omite si no
 * hay data.id, tal como indica la documentacion de MP — antes se sustituia por x-request-id).
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
      return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
    })
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1 || !/^[0-9a-f]+$/i.test(v1)) {
    console.error("[webhooks/mp] x-signature mal formateado:", xSignature);
    return false;
  }

  const manifest = buildMpWebhookManifest(dataId, xRequestId, ts);
  const hash = signMpWebhookManifest(secret, manifest);

  const hashBuf = Buffer.from(hash, "hex");
  const v1Buf = Buffer.from(v1, "hex");
  if (hashBuf.length !== v1Buf.length || !timingSafeEqual(hashBuf, v1Buf)) {
    console.error("[webhooks/mp] Firma HMAC inválida. manifest:", manifest);
    return false;
  }
  return true;
}

type AdminDb = ReturnType<typeof createAdminClient>;

/** Marca un evento por su id de fila (no por event_id) y loguea si el propio update falla. */
async function markEvent(
  db: AdminDb,
  eventRowId: string,
  status: "processed" | "failed",
  errorMessage?: string
) {
  const { error } = await db
    .from("webhook_events")
    .update({
      status,
      ...(status === "processed"
        ? { processed_at: new Date().toISOString() }
        : { error_message: errorMessage ?? null }),
    })
    .eq("id", eventRowId);
  if (error) {
    console.error("[webhooks/mp] No se pudo actualizar webhook_events:", error.message);
  }
}

interface SubRow {
  id: string;
  status: string;
  plan: string;
  mp_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  mp_status_as_of: string | null;
  last_payment_id?: string | null;
}

const SUB_SELECT_FOR_CHARGE =
  "id, status, plan, mp_subscription_id, current_period_start, current_period_end, mp_status_as_of, last_payment_id";

interface ApprovedCharge {
  /** Id del PAGO real subyacente (Payment.id, o InvoiceResponse.payment.id) — clave de idempotencia. */
  paymentId: string;
  preapprovalId: string | undefined;
  externalReference: string | undefined;
  chargeDate: Date;
}

/**
 * Aplica un cobro aprobado a la fila de subscriptions correspondiente. La llaman tanto el evento
 * `payment` como `subscription_authorized_payment` — confirmado contra producción que Mercado
 * Pago puede notificar AMBOS para el mismo cobro real, con `data.id` distinto pero refiriendo al
 * mismo pago subyacente. Por eso la idempotencia usa `paymentId` (el id del pago real, no el del
 * evento/recurso que lo notifica): si los dos topics llegan para el mismo cobro, el segundo es
 * un no-op (WHP-09).
 */
async function applyApprovedCharge(
  db: AdminDb,
  eventRowId: string,
  charge: ApprovedCharge
): Promise<NextResponse> {
  // Buscar suscripción: primero por preapproval_id, fallback por external_reference (userId). El
  // fallback SOLO puede tomar una fila sin identidad todavía (mp_subscription_id IS NULL) —
  // nunca una que ya pertenece a otra preapproval (misma razón que WHP-06 en el handler de
  // subscription_preapproval).
  let subRow: SubRow | null = null;

  if (charge.preapprovalId) {
    const { data, error } = await db
      .from("subscriptions")
      .select(SUB_SELECT_FOR_CHARGE)
      .eq("mp_subscription_id", charge.preapprovalId)
      .maybeSingle();
    if (error) {
      await markEvent(db, eventRowId, "failed", `Error buscando por preapproval_id: ${error.message}`);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    subRow = data as SubRow | null;
  }

  if (!subRow && charge.externalReference) {
    const { data, error } = await db
      .from("subscriptions")
      .select(SUB_SELECT_FOR_CHARGE)
      .eq("user_id", charge.externalReference)
      .is("mp_subscription_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      await markEvent(db, eventRowId, "failed", `Error buscando por external_reference: ${error.message}`);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    subRow = data as SubRow | null;
  }

  if (!subRow) {
    const msg = `No se encontró suscripción para preapproval_id=${charge.preapprovalId} / external_reference=${charge.externalReference}`;
    console.error("[webhooks/mp]", msg);
    await markEvent(db, eventRowId, "failed", msg);
    return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 422 });
  }

  // Idempotencia: este MISMO pago ya extendió el período (MP puede notificar el mismo pago más
  // de una vez: `payment` y `subscription_authorized_payment` para el mismo cobro, un
  // creado/actualizado, o un reintento de webhook). No volver a sumar un período completo.
  if (subRow.last_payment_id === charge.paymentId) {
    console.log("[webhooks/mp] Pago ya aplicado, ignorando (idempotente):", charge.paymentId);
    await markEvent(db, eventRowId, "processed");
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Un pago aprobado sobre una suscripción YA cancelada (por el usuario, MP o el admin) no la
  // reactiva: la cancelación es intencional. Una re-suscripción usa una preapproval nueva y
  // consigue su propia fila (ver el fallback de arriba y el handler de preapproval).
  if (subRow.status === "canceled") {
    console.log("[webhooks/mp] Pago aprobado sobre una suscripción cancelada, no se reactiva:", subRow.id);
    await markEvent(db, eventRowId, "processed");
    return NextResponse.json({ ok: true, skipped: "canceled" });
  }

  // Extender período según el plan REAL de la fila (antes se asumía 1 mes siempre, lo que le
  // quitaba 11 meses a cada renovación anual) (WHP-10).
  const currentEnd = subRow.current_period_end ? new Date(subRow.current_period_end) : null;
  const { frequency, frequencyType } = frequencyFromPlan(subRow.plan);
  const newPeriodEnd = calculateNewPeriodEnd(charge.chargeDate, currentEnd, frequency, frequencyType);

  const { error: updateError } = await db
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: newPeriodEnd.toISOString(),
      last_payment_id: charge.paymentId,
      updated_at: new Date().toISOString(),
      ...(charge.preapprovalId ? { mp_subscription_id: charge.preapprovalId } : {}),
    })
    .eq("id", subRow.id);
  if (updateError) {
    await markEvent(db, eventRowId, "failed", `Error extendiendo período: ${updateError.message}`);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  console.log("[webhooks/mp] Período extendido:", {
    subId: subRow.id,
    newPeriodEnd: newPeriodEnd.toISOString(),
    paymentId: charge.paymentId,
  });

  await markEvent(db, eventRowId, "processed");
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const db = createAdminClient();
  const rawBody = await request.text();
  const xSignature = request.headers.get("x-signature") ?? "";
  const xRequestId = request.headers.get("x-request-id") ?? "";

  let event: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    event = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const dataId = (event.data as Record<string, unknown> | undefined)?.id as string | undefined;

  if (!verifySignature(xSignature, xRequestId, dataId)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  console.log("[webhooks/mp] Evento:", event.type, "| data.id:", dataId, "| request-id:", xRequestId);

  // ── Deduplicación ───────────────────────────────────────────────────────────
  // Un evento "processed" jamas se reprocesa. Uno "failed" o "pending" SI: es lo que le llega a
  // MP como reintento tras un fallo previo (o una ejecucion interrumpida a mitad de camino), y
  // descartarlo como "duplicado" perdia el evento para siempre (WHP-04).
  const eventKey = xRequestId || dataId || String(Date.now());

  const { data: existingEvent, error: selectEventError } = await db
    .from("webhook_events")
    .select("id, status")
    .eq("event_id", eventKey)
    .maybeSingle();

  if (selectEventError) {
    console.error("[webhooks/mp] Error consultando webhook_events:", selectEventError.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  let eventRowId: string;
  if (existingEvent) {
    if (existingEvent.status === "processed") {
      console.log("[webhooks/mp] Duplicado (ya procesado), ignorando:", eventKey);
      return NextResponse.json({ ok: true, duplicate: true });
    }
    eventRowId = existingEvent.id;
    const { error: updateEventError } = await db
      .from("webhook_events")
      .update({
        type: String(event.type ?? "unknown"),
        payload: event,
        status: "pending",
        error_message: null,
      })
      .eq("id", eventRowId);
    if (updateEventError) {
      console.error("[webhooks/mp] Error marcando evento para reintento:", updateEventError.message);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
    console.log("[webhooks/mp] Reintento de evento previo:", eventKey, "(status anterior:", existingEvent.status, ")");
  } else {
    const { data: insertedEvent, error: insertEventError } = await db
      .from("webhook_events")
      .insert({
        event_id: eventKey,
        type: String(event.type ?? "unknown"),
        status: "pending",
        payload: event,
      })
      .select("id")
      .single();
    if (insertEventError) {
      // Choque con la constraint UNIQUE(event_id): otra request concurrente para el MISMO
      // evento ya lo esta procesando. Tratarlo como duplicado es seguro (no se pierde: la otra
      // request sigue en vuelo).
      console.log("[webhooks/mp] Inserción concurrente duplicada, ignorando:", eventKey, insertEventError.message);
      return NextResponse.json({ ok: true, duplicate: true });
    }
    eventRowId = insertedEvent.id;
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

  // ── Evento: subscription_preapproval (alta / cambio de estado) ────────────
  if (event.type === "subscription_preapproval") {
    if (!dataId) {
      await markEvent(db, eventRowId, "failed", "data.id faltante");
      return NextResponse.json({ error: "data.id faltante" }, { status: 422 });
    }

    try {
      const preApproval = new PreApproval(client);
      const sub = await preApproval.get({ id: dataId });

      console.log("[webhooks/mp] PreApproval:", { id: dataId, status: sub.status, external_reference: sub.external_reference });

      const userId = sub.external_reference;
      if (!userId) {
        await markEvent(db, eventRowId, "failed", "external_reference vacío");
        return NextResponse.json({ error: "Sin userId" }, { status: 422 });
      }

      const status = mapMpStatus(sub.status);
      const lastModified = parseSafeDate(sub.last_modified);
      const frequency = sub.auto_recurring?.frequency ?? 1;
      const frequencyType =
        (sub.auto_recurring?.frequency_type as "months" | "years") ?? "months";
      const plan = planFromFrequency(frequency);

      // 1) Match exacto: esta preapproval ya tiene su propia fila (la vinculo un evento anterior).
      let existingSub: SubRow | null = null;
      {
        const { data, error } = await db
          .from("subscriptions")
          .select("id, status, plan, mp_subscription_id, current_period_start, current_period_end, mp_status_as_of")
          .eq("mp_subscription_id", dataId)
          .maybeSingle();
        if (error) {
          await markEvent(db, eventRowId, "failed", `Error buscando por mp_subscription_id: ${error.message}`);
          return NextResponse.json({ error: "Error interno" }, { status: 500 });
        }
        existingSub = data as SubRow | null;
      }

      // 2) Fallback: SOLO si no hubo match directo, buscar una fila del mismo usuario que
      //    todavia no tiene identidad (mp_subscription_id IS NULL — creada por el admin, o por
      //    una re-suscripcion cuyo primer evento aun no llego). Nunca tomar una fila que YA
      //    pertenece a otra preapproval: un evento tardio o reintentado de una preapproval
      //    vieja/abandonada no debe pisar la suscripcion vigente de una preapproval distinta
      //    (WHP-06 — esta es la causa mas probable de "pago pero no se activo").
      if (!existingSub) {
        const { data, error } = await db
          .from("subscriptions")
          .select("id, status, plan, mp_subscription_id, current_period_start, current_period_end, mp_status_as_of")
          .eq("user_id", userId)
          .is("mp_subscription_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) {
          await markEvent(db, eventRowId, "failed", `Error buscando fila sin identidad: ${error.message}`);
          return NextResponse.json({ error: "Error interno" }, { status: 500 });
        }
        existingSub = data as SubRow | null;
      }

      // Guarda de orden: si esta MISMA fila ya reflejo un evento mas nuevo, ignorar este
      // (evento desordenado/reintentado tardiamente) en vez de retroceder su estado.
      const priorAsOf = existingSub?.mp_status_as_of ? new Date(existingSub.mp_status_as_of) : null;
      if (existingSub && priorAsOf && lastModified < priorAsOf) {
        console.log("[webhooks/mp] Evento de preapproval desordenado (mas viejo que el ultimo aplicado), ignorando:", dataId);
        await markEvent(db, eventRowId, "processed");
        return NextResponse.json({ ok: true, stale: true });
      }

      // Periodo: NUNCA se calcula a partir de una pausa/cancelacion/pending, y NUNCA se vuelve a
      // calcular si la fila ya tiene uno cargado. Se "bootstrapea" una unica vez, la primera vez
      // que la fila queda autorizada sin ningun periodo previo (por si el webhook de `payment`
      // tarda o nunca llega). Todas las extensiones de renovacion las hace EXCLUSIVAMENTE el
      // handler de `payment`, que es la unica senal que representa un cobro real (WHP-08/09).
      const priorPeriodStart = existingSub?.current_period_start ? new Date(existingSub.current_period_start) : null;
      const priorPeriodEnd = existingSub?.current_period_end ? new Date(existingSub.current_period_end) : null;
      let periodStart = priorPeriodStart;
      let periodEnd = priorPeriodEnd;
      if (status === "active" && periodEnd === null) {
        periodStart = lastModified;
        periodEnd = calculateNewPeriodEnd(lastModified, null, frequency, frequencyType);
      }

      if (existingSub) {
        const { error: updateError } = await db
          .from("subscriptions")
          .update({
            status,
            plan,
            mp_subscription_id: dataId,
            current_period_start: periodStart ? periodStart.toISOString() : null,
            current_period_end: periodEnd ? periodEnd.toISOString() : null,
            mp_status_as_of: lastModified.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSub.id);
        if (updateError) {
          await markEvent(db, eventRowId, "failed", `Error actualizando suscripción: ${updateError.message}`);
          return NextResponse.json({ error: "Error interno" }, { status: 500 });
        }
        console.log("[webhooks/mp] Sub actualizada:", existingSub.id);
      } else {
        const { error: insertError } = await db.from("subscriptions").insert({
          user_id: userId,
          status,
          plan,
          mp_subscription_id: dataId,
          current_period_start: periodStart ? periodStart.toISOString() : null,
          current_period_end: periodEnd ? periodEnd.toISOString() : null,
          mp_status_as_of: lastModified.toISOString(),
        });
        if (insertError) {
          await markEvent(db, eventRowId, "failed", `Error creando suscripción: ${insertError.message}`);
          return NextResponse.json({ error: "Error interno" }, { status: 500 });
        }
        console.log("[webhooks/mp] Nueva sub para userId:", userId);
      }

      await markEvent(db, eventRowId, "processed");
      return NextResponse.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[webhooks/mp] Error en preapproval:", msg);
      await markEvent(db, eventRowId, "failed", msg);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  }

  // ── Evento: payment (cobro recurrente) — única fuente de extensión de período ─
  if (event.type === "payment") {
    if (!dataId) {
      await markEvent(db, eventRowId, "failed", "data.id faltante");
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
        await markEvent(db, eventRowId, "processed");
        return NextResponse.json({ ok: true });
      }

      // preapproval_id exists at runtime but is missing from the SDK types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preapprovalId = (payment as any).preapproval_id as string | undefined;
      const paymentDate = parseSafeDate(payment.date_approved ?? payment.date_created);

      return await applyApprovedCharge(db, eventRowId, {
        paymentId: String(dataId),
        preapprovalId,
        externalReference: payment.external_reference,
        chargeDate: paymentDate,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[webhooks/mp] Error en payment:", msg);
      await markEvent(db, eventRowId, "failed", msg);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  }

  // ── Evento: subscription_authorized_payment — cobro recurrente, topic alternativo ─
  // Confirmado contra producción: Mercado Pago puede notificar este topic (ademas de, o en vez
  // de, `payment`) para un cobro recurrente real. Comparte la MISMA logica idempotente que
  // `payment` a traves de applyApprovedCharge — si ambos llegan para el mismo cobro, el segundo
  // es un no-op.
  if (event.type === "subscription_authorized_payment") {
    if (!dataId) {
      await markEvent(db, eventRowId, "failed", "data.id faltante");
      return NextResponse.json({ error: "data.id faltante" }, { status: 422 });
    }

    try {
      const invoiceApi = new Invoice(client);
      const invoice = await invoiceApi.get({ id: dataId });

      console.log("[webhooks/mp] AuthorizedPayment:", {
        id: dataId,
        status: invoice.status,
        paymentStatus: invoice.payment?.status,
        preapproval_id: invoice.preapproval_id,
        external_reference: invoice.external_reference,
      });

      // Solo procesamos si el pago subyacente esta aprobado (mismo criterio que `payment`).
      if (!invoice.payment || invoice.payment.status !== "approved") {
        console.log("[webhooks/mp] Authorized payment sin pago aprobado, ignorando:", invoice.payment?.status ?? invoice.status);
        await markEvent(db, eventRowId, "processed");
        return NextResponse.json({ ok: true });
      }

      return await applyApprovedCharge(db, eventRowId, {
        paymentId: String(invoice.payment.id),
        preapprovalId: invoice.preapproval_id,
        externalReference: invoice.external_reference,
        chargeDate: parseSafeDate(invoice.last_modified ?? invoice.date_created),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[webhooks/mp] Error en subscription_authorized_payment:", msg);
      await markEvent(db, eventRowId, "failed", msg);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  }

  // ── Otros tipos de eventos — ignorar ─────────────────────────────────────
  console.log("[webhooks/mp] Tipo ignorado:", event.type);
  await markEvent(db, eventRowId, "processed");
  return NextResponse.json({ ok: true });
}
