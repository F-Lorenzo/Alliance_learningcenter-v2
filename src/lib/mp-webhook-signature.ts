import { createHmac } from "crypto";

/**
 * Manifest HMAC de Mercado Pago: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" — el par
 * "id:" se omite si no hay data.id, tal como indica la documentación de MP.
 *
 * Extraído a un módulo propio (en vez de vivir solo dentro de webhooks/mp/route.ts) para que
 * /api/cron/webhook-healthcheck pueda construir una firma real con el MISMO algoritmo que el
 * verificador espera, sin duplicar la lógica y sin arriesgarse a que las dos copias diverjan.
 */
export function buildMpWebhookManifest(
  dataId: string | undefined,
  requestId: string,
  ts: string
): string {
  return dataId
    ? `id:${dataId};request-id:${requestId};ts:${ts};`
    : `request-id:${requestId};ts:${ts};`;
}

/** Firma un manifest con el secreto del webhook. Devuelve el hash hex (v1). */
export function signMpWebhookManifest(secret: string, manifest: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

/** Arma el header x-signature completo ("ts=...,v1=...") para un data.id/request-id/ts dados. */
export function buildMpXSignatureHeader(
  secret: string,
  dataId: string | undefined,
  requestId: string,
  ts: string = String(Date.now())
): string {
  const manifest = buildMpWebhookManifest(dataId, requestId, ts);
  return `ts=${ts},v1=${signMpWebhookManifest(secret, manifest)}`;
}
