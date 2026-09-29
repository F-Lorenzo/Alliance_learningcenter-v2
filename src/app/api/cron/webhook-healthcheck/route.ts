import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMpXSignatureHeader } from "@/lib/mp-webhook-signature";

/**
 * Ping de salud del webhook de Mercado Pago (alerta pasiva).
 *
 * Por qué existe: el incidente de septiembre/2026 fue que la URL del webhook en Mercado Pago
 * apuntaba al dominio sin "www", que en Vercel redirige — rompiendo la entrega de TODAS las
 * notificaciones, silenciosamente, durante meses. Nadie se enteró hasta que un cliente pagó y
 * no se activó. Este endpoint reproduce ese mismo camino (DNS + red + redirect + firma) contra
 * la URL PÚBLICA real (no una llamada interna a la función), disparado por un cron de Vercel
 * (ver vercel.json), y deja registro en `webhook_health_checks` para que el panel admin lo
 * muestre — así una regresión futura de este tipo se detecta en horas, no en meses.
 *
 * No requiere llamar a la API de Mercado Pago: el payload usa un `type` que el webhook real
 * ignora (cae en la rama "Otros tipos de eventos"), así que el ping es gratis y no puede activar
 * ni tocar ninguna suscripción real — solo prueba que la firma y el camino HTTP funcionan.
 *
 * Seguridad: si existe CRON_SECRET, se exige (patrón recomendado por Vercel). Si no existe,
 * corre igual — el peor caso de que alguien más lo dispare es una fila extra e inofensiva en
 * webhook_health_checks, nunca un cargo ni un cambio de datos de un usuario real.
 */

export const maxDuration = 30; // se clampea solo si el plan de Vercel no lo permite

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.alliancebaireslearningcenter.com";
const FETCH_TIMEOUT_MS = 20_000;

interface HealthResult {
  ok: boolean;
  statusCode: number | null;
  error: string | null;
}

async function pingWebhook(): Promise<HealthResult> {
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return { ok: false, statusCode: null, error: "MP_WEBHOOK_SECRET no configurado" };
  }

  const requestId = `healthcheck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const signature = buildMpXSignatureHeader(webhookSecret, undefined, requestId);
  const url = `${SITE_URL.replace(/\/$/, "")}/api/webhooks/mp`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-request-id": requestId,
      },
      body: JSON.stringify({ type: "healthcheck", data: {} }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // El cron corre server-to-server: nunca debe servir una respuesta cacheada.
      cache: "no-store",
    });
    return { ok: res.status === 200, statusCode: res.status, error: res.status === 200 ? null : `HTTP ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, statusCode: null, error: msg };
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const result = await pingWebhook();

  try {
    const db = createAdminClient();
    const { error } = await db.from("webhook_health_checks").insert({
      ok: result.ok,
      status_code: result.statusCode,
      error: result.error,
    });
    if (error) console.error("[cron/webhook-healthcheck] No se pudo registrar el resultado:", error.message);
  } catch (err) {
    console.error("[cron/webhook-healthcheck] No se pudo conectar a la base para registrar el resultado:", err);
  }

  if (!result.ok) {
    console.error("[cron/webhook-healthcheck] El webhook de Mercado Pago no respondió OK:", result);
  }

  // Siempre 200: este endpoint es un chequeo, no debe generar sus propias alertas de
  // infraestructura por devolver un status "de error" cuando el chequeo mismo funcionó bien.
  return NextResponse.json({ checkedWebhook: result });
}
