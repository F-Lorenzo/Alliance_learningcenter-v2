#!/usr/bin/env node
/**
 * scripts/check-webhook-health.mjs
 *
 * Prueba en vivo, contra la URL PÚBLICA real, que /api/webhooks/mp esté respondiendo — el mismo
 * camino (DNS + Vercel + firma) que causó el incidente de septiembre/2026: la URL cargada en el
 * panel de Mercado Pago apuntaba al dominio sin "www", que Vercel redirige, y un redirect en un
 * POST rompía la entrega de TODAS las notificaciones, en silencio, durante meses.
 *
 * Este script sigue el MISMO estilo que scripts/upload-guardia-cerrada.mjs (Node puro, sin
 * dependencias nuevas) y NO llama a la API de Mercado Pago ni toca ninguna suscripción real: el
 * payload usa un `type` que el webhook real ignora sin escribir nada, solo prueba que la firma y
 * el camino HTTP funcionan.
 *
 * Cuándo correrlo:
 *   - Después de cambiar la URL del webhook en el panel de Mercado Pago.
 *   - Después de rotar MP_WEBHOOK_SECRET (en Vercel Y en Mercado Pago).
 *   - Después de cualquier cambio de dominio/DNS/redirects en Vercel.
 *   - Antes de confiar en un deploy que toca src/app/api/webhooks/mp.
 *   - Cuando el panel admin muestre el banner "Revisar el webhook de Mercado Pago".
 *
 * Uso:
 *   node scripts/check-webhook-health.mjs
 *   node scripts/check-webhook-health.mjs https://www.alliancebaireslearningcenter.com
 *   node scripts/check-webhook-health.mjs --secret=xxxx https://otra-url-a-probar.com
 *
 * Lee MP_WEBHOOK_SECRET y NEXT_PUBLIC_SITE_URL de .env.local si existen, o de las variables de
 * entorno si ya están exportadas en la shell. --secret=... las pisa (útil para probar el secreto
 * NUEVO antes de guardarlo, comparándolo con el que ya está en Mercado Pago).
 */

import { readFileSync, existsSync } from "fs";
import { createHmac } from "crypto";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return {};
  const out = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function parseArgs(argv) {
  let url;
  let secret;
  for (const arg of argv) {
    if (arg.startsWith("--secret=")) secret = arg.slice("--secret=".length);
    else if (!arg.startsWith("--")) url = arg;
  }
  return { url, secret };
}

const envLocal = loadEnvLocal();
const { url: urlArg, secret: secretArg } = parseArgs(process.argv.slice(2));

const SITE_URL =
  urlArg || process.env.NEXT_PUBLIC_SITE_URL || envLocal.NEXT_PUBLIC_SITE_URL || "https://www.alliancebaireslearningcenter.com";
const SECRET = secretArg || process.env.MP_WEBHOOK_SECRET || envLocal.MP_WEBHOOK_SECRET;

if (!SECRET) {
  console.error(
    "❌ No encontré MP_WEBHOOK_SECRET (ni en .env.local ni en el entorno). Pasalo con --secret=xxxx si querés probar otro valor."
  );
  process.exit(1);
}

const requestId = `manual-check-${Date.now()}`;
const ts = String(Date.now());
const manifest = `request-id:${requestId};ts:${ts};`; // sin data.id — igual que el ping del cron
const v1 = createHmac("sha256", SECRET).update(manifest).digest("hex");
const signature = `ts=${ts},v1=${v1}`;

const targetUrl = `${SITE_URL.replace(/\/$/, "")}/api/webhooks/mp`;
console.log(`→ Probando ${targetUrl} ...`);

const started = Date.now();
try {
  const res = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": signature,
      "x-request-id": requestId,
    },
    body: JSON.stringify({ type: "healthcheck", data: {} }),
    redirect: "manual", // si la URL redirige, quiero VERLO — eso fue exactamente el bug real.
  });
  const ms = Date.now() - started;

  if (res.status >= 300 && res.status < 400) {
    console.error(
      `⚠️  La URL REDIRIGE (HTTP ${res.status}) en vez de responder directo. Esto es EXACTAMENTE lo que rompió el webhook en producción: Mercado Pago no sigue redirects en un POST.`
    );
    const location = res.headers.get("location");
    if (location) console.error(`   Redirige a: ${location}`);
    console.error(`   Arreglo: cargá en el panel de Mercado Pago la URL de DESTINO final (sin redirect), no esta.`);
    process.exit(1);
  }

  const text = await res.text();
  if (res.status === 200) {
    console.log(`✅ OK — HTTP 200 en ${ms}ms. El webhook está respondiendo correctamente en esta URL.`);
    process.exit(0);
  }

  console.error(`❌ HTTP ${res.status} en ${ms}ms.`);
  console.error(`   Respuesta: ${text.slice(0, 500)}`);
  if (res.status === 401) {
    console.error("   401 = firma inválida: MP_WEBHOOK_SECRET no coincide entre Vercel y este script/Mercado Pago.");
  }
  process.exit(1);
} catch (err) {
  console.error(`❌ No se pudo conectar a ${targetUrl}: ${err.message}`);
  process.exit(1);
}
