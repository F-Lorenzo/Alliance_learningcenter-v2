/**
 * mp-webhook.ts — constructores de Request para probar los route handlers reales:
 *   - POST /api/webhooks/mp    (buildWebhookRequest / signWebhook)
 *   - POST /api/checkout/mp    (buildCheckoutRequest)
 *
 * `signWebhook` replica EXACTAMENTE `verifySignature` de src/app/api/webhooks/mp/route.ts:
 *
 *   x-signature = "ts=<ts>,v1=<hex>"
 *   manifest    = `id:${dataId ?? xRequestId};request-id:${xRequestId};ts:${ts};`
 *   v1          = HMAC-SHA256(secret, manifest) en hex
 *
 * donde `dataId` es `body.data.id` (el route lee el id del BODY, no del query param, y NO lo pasa a
 * minusculas). Si el body no trae data.id, el manifest usa el x-request-id.
 */

import { createHmac } from "node:crypto";

export const TEST_WEBHOOK_SECRET = "test-webhook-secret-not-real";
export const TEST_MP_ACCESS_TOKEN = "TEST-mp-access-token-not-real";
export const WEBHOOK_URL = "http://localhost/api/webhooks/mp";
export const CHECKOUT_URL = "http://localhost/api/checkout/mp";

let requestCounter = 0;
let notificationCounter = 0;
/** x-request-id unico y determinista dentro del proceso: req-0001, req-0002... */
export function nextRequestId(): string {
  requestCounter += 1;
  return `req-${String(requestCounter).padStart(4, "0")}`;
}

export interface SignInput {
  /** Default: process.env.MP_WEBHOOK_SECRET ?? TEST_WEBHOOK_SECRET */
  secret?: string;
  /** data.id que entra al manifest. undefined => se usa requestId (como el route). */
  dataId?: string | number;
  requestId: string;
  /** Default: String(Date.now()) (respeta vi.setSystemTime). */
  ts?: string | number;
}

export interface SignedWebhook {
  /** Valor del header x-signature: "ts=...,v1=...". */
  header: string;
  ts: string;
  v1: string;
  manifest: string;
}

export function signWebhook(input: SignInput): SignedWebhook {
  const secret = input.secret ?? process.env.MP_WEBHOOK_SECRET ?? TEST_WEBHOOK_SECRET;
  const ts = String(input.ts ?? Date.now());
  const id = input.dataId !== undefined && input.dataId !== null ? String(input.dataId) : input.requestId;
  const manifest = `id:${id};request-id:${input.requestId};ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return { header: `ts=${ts},v1=${v1}`, ts, v1, manifest };
}

export type SignatureMode =
  /** Firma correcta (default). */
  | "valid"
  /** v1 con un hash hexadecimal valido pero incorrecto. */
  | "invalid"
  /** Firmada con otro secret. */
  | "wrong_secret"
  /** Sin header x-signature. */
  | "missing"
  /** x-signature sin v1. */
  | "no_v1"
  /** x-signature sin ts. */
  | "no_ts"
  /** x-signature ilegible ("garbage"). */
  | "malformed"
  /** Firmada correctamente pero SIN header x-request-id. */
  | "no_request_id";

export interface BuildWebhookOptions {
  /** Tipo de evento MP: "subscription_preapproval" | "payment" | "subscription_authorized_payment" | ... */
  type: string;
  /**
   * data.id del body. Si se omite, el body no lleva data.id (data: {}), y la firma usa el request-id.
   */
  dataId?: string | number;
  /** x-request-id. Default: nextRequestId(). Reusar el mismo valor simula un REINTENTO de MP. */
  requestId?: string;
  /** Secret con el que se firma (default: env MP_WEBHOOK_SECRET o TEST_WEBHOOK_SECRET). */
  secret?: string;
  /** ts de la firma. Default Date.now(). */
  ts?: string | number;
  /** Se mezcla (deep merge) sobre el body por defecto. */
  body?: Record<string, unknown>;
  /** Body crudo (string). Reemplaza al JSON generado (para probar JSON invalido). La firma sigue usando dataId. */
  rawBody?: string;
  /** Headers extra (pisan a los generados). */
  headers?: Record<string, string>;
  signature?: SignatureMode;
  /** Que data.id se firma realmente (para simular mismatch, p.ej. id en minuscula). Default: dataId. */
  signedDataId?: string | number;
  /** Agregar `?data.id=<id>&type=<type>` a la URL como hace MP (el route lo ignora). Default false. */
  query?: boolean;
  /** Override de URL. */
  url?: string;
  /** action del body (default: "<type>.created" para payment, "created" para el resto). */
  action?: string;
}

function deepMerge(base: Record<string, unknown>, extra: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const cur = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object" && !Array.isArray(cur)) {
      out[k] = deepMerge(cur as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Body por defecto con la forma de las notificaciones reales de MP. */
export function defaultWebhookBody(type: string, dataId: string | number | undefined, action?: string): Record<string, unknown> {
  notificationCounter += 1;
  return {
    action: action ?? (type === "payment" ? "payment.created" : "created"),
    api_version: "v1",
    application_id: 555000111,
    date_created: new Date().toISOString(),
    id: 100000000 + notificationCounter,
    live_mode: true,
    type,
    user_id: "987654321",
    data: dataId === undefined ? {} : { id: String(dataId) },
  };
}

/**
 * Devuelve un `Request` (POST http://localhost/api/webhooks/mp) listo para `await POST(req)`.
 *
 * Ejemplos:
 *   buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id })
 *   buildWebhookRequest({ type: "payment", dataId: pay.id, requestId: "req-A" })    // 1er intento
 *   buildWebhookRequest({ type: "payment", dataId: pay.id, requestId: "req-A" })    // reintento (mismo x-request-id)
 *   buildWebhookRequest({ type: "payment", dataId: "1", signature: "invalid" })     // 401
 */
export function buildWebhookRequest(opts: BuildWebhookOptions): Request {
  const requestId = opts.requestId ?? nextRequestId();
  const mode = opts.signature ?? "valid";
  const dataIdForBody = opts.dataId;
  const signedId = opts.signedDataId !== undefined ? opts.signedDataId : opts.dataId;

  let body = defaultWebhookBody(opts.type, dataIdForBody, opts.action);
  if (opts.body) body = deepMerge(body, opts.body);
  const rawBody = opts.rawBody ?? JSON.stringify(body);

  const headers: Record<string, string> = { "content-type": "application/json" };
  const secret = opts.secret ?? process.env.MP_WEBHOOK_SECRET ?? TEST_WEBHOOK_SECRET;

  const sign = (s: string) => signWebhook({ secret: s, dataId: signedId, requestId, ts: opts.ts });

  switch (mode) {
    case "valid": {
      const sig = sign(secret);
      headers["x-signature"] = sig.header;
      headers["x-request-id"] = requestId;
      break;
    }
    case "wrong_secret": {
      headers["x-signature"] = sign(`${secret}-otro`).header;
      headers["x-request-id"] = requestId;
      break;
    }
    case "invalid": {
      const sig = sign(secret);
      headers["x-signature"] = `ts=${sig.ts},v1=${"0".repeat(64)}`;
      headers["x-request-id"] = requestId;
      break;
    }
    case "missing": {
      headers["x-request-id"] = requestId;
      break;
    }
    case "no_v1": {
      headers["x-signature"] = `ts=${sign(secret).ts}`;
      headers["x-request-id"] = requestId;
      break;
    }
    case "no_ts": {
      headers["x-signature"] = `v1=${sign(secret).v1}`;
      headers["x-request-id"] = requestId;
      break;
    }
    case "malformed": {
      headers["x-signature"] = "garbage";
      headers["x-request-id"] = requestId;
      break;
    }
    case "no_request_id": {
      headers["x-signature"] = sign(secret).header;
      break;
    }
  }
  Object.assign(headers, opts.headers ?? {});

  let url = opts.url ?? WEBHOOK_URL;
  if (opts.query && !opts.url) {
    const q = new URLSearchParams();
    if (dataIdForBody !== undefined) q.set("data.id", String(dataIdForBody));
    q.set("type", opts.type);
    url = `${WEBHOOK_URL}?${q.toString()}`;
  }

  return new Request(url, { method: "POST", headers, body: rawBody });
}

/** Atajo: notificacion con firma invalida (401 esperado). */
export function buildInvalidSignatureRequest(opts: Omit<BuildWebhookOptions, "signature">): Request {
  return buildWebhookRequest({ ...opts, signature: "invalid" });
}

export interface BuildCheckoutOptions {
  plan?: string;
  coupon_code?: string;
  /** Header Origin (el route arma back_url = `${origin}/planes/exito`). Sin origin => NEXT_PUBLIC_SITE_URL o localhost:3000. */
  origin?: string;
  headers?: Record<string, string>;
  /** Body extra / override (se mezcla). */
  body?: Record<string, unknown>;
  /** Body crudo (para probar JSON invalido). */
  rawBody?: string;
}

/** POST http://localhost/api/checkout/mp con { plan, coupon_code } y header Origin opcional. */
export function buildCheckoutRequest(opts: BuildCheckoutOptions = {}): Request {
  const headers: Record<string, string> = { "content-type": "application/json", ...(opts.headers ?? {}) };
  if (opts.origin) headers.origin = opts.origin;
  const body: Record<string, unknown> = {};
  if (opts.plan !== undefined) body.plan = opts.plan;
  if (opts.coupon_code !== undefined) body.coupon_code = opts.coupon_code;
  Object.assign(body, opts.body ?? {});
  return new Request(CHECKOUT_URL, {
    method: "POST",
    headers,
    body: opts.rawBody ?? JSON.stringify(body),
  });
}
