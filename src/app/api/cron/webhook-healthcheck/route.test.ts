import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installHarness } from "@/test-utils/harness";
import { buildMpWebhookManifest, signMpWebhookManifest } from "@/lib/mp-webhook-signature";

vi.mock("@/lib/supabase/admin", async () => (await import("@/test-utils/harness")).adminMock());

import { GET } from "./route";

const t = installHarness();

/** Reconstruye la firma esperada a partir de los headers que mandó el cron, como haría el webhook real. */
function expectedSignature(secret: string, xSignature: string, requestId: string): string {
  const ts = Object.fromEntries(xSignature.split(",").map((p) => p.split("=")))["ts"];
  const manifest = buildMpWebhookManifest(undefined, requestId, ts);
  return `ts=${ts},v1=${signMpWebhookManifest(secret, manifest)}`;
}

describe("/api/cron/webhook-healthcheck", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("firma correctamente el ping (misma firma que el webhook real espera) y lo manda a /api/webhooks/mp", async () => {
    t.setEnv("MP_WEBHOOK_SECRET", "test-secret-cron");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const res = await GET(new Request("http://localhost/api/cron/webhook-healthcheck"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkedWebhook.ok).toBe(true);
    expect(body.checkedWebhook.statusCode).toBe(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/webhooks\/mp$/);
    expect(init.method).toBe("POST");

    const xSignature = init.headers["x-signature"];
    const requestId = init.headers["x-request-id"];
    expect(xSignature).toBeTruthy();
    expect(requestId).toMatch(/^healthcheck-/);
    // La firma que mandó es EXACTAMENTE la que el verificador real del webhook aceptaría.
    expect(xSignature).toBe(expectedSignature("test-secret-cron", xSignature, requestId));

    const payload = JSON.parse(init.body);
    expect(payload.type).toBe("healthcheck"); // tipo que el webhook real ignora sin tocar nada

    // Se registró el resultado.
    const [row] = t.db.dump("webhook_health_checks");
    expect(row).toMatchObject({ ok: true, status_code: 200, error: null });
  });

  it("si el webhook responde con error, lo registra como ok:false con el status code", async () => {
    t.setEnv("MP_WEBHOOK_SECRET", "test-secret-cron");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "boom" }), { status: 502 }));

    const res = await GET(new Request("http://localhost/api/cron/webhook-healthcheck"));
    expect(res.status).toBe(200); // el cron mismo respondió bien; el problema está en checkedWebhook
    const body = await res.json();
    expect(body.checkedWebhook).toMatchObject({ ok: false, statusCode: 502 });

    const [row] = t.db.dump("webhook_health_checks");
    expect(row).toMatchObject({ ok: false, status_code: 502 });
  });

  it("si la red falla (timeout / DNS / lo que sea), lo registra como ok:false con el error", async () => {
    t.setEnv("MP_WEBHOOK_SECRET", "test-secret-cron");
    fetchMock.mockRejectedValue(new Error("fetch failed: getaddrinfo ENOTFOUND"));

    const res = await GET(new Request("http://localhost/api/cron/webhook-healthcheck"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkedWebhook.ok).toBe(false);
    expect(body.checkedWebhook.error).toMatch(/ENOTFOUND/);

    const [row] = t.db.dump("webhook_health_checks");
    expect(row.ok).toBe(false);
    expect(row.error).toMatch(/ENOTFOUND/);
  });

  it("sin MP_WEBHOOK_SECRET configurado, no intenta pegarle a la red y lo reporta como problema", async () => {
    t.setEnv("MP_WEBHOOK_SECRET", undefined);

    const res = await GET(new Request("http://localhost/api/cron/webhook-healthcheck"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkedWebhook.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con CRON_SECRET configurado, exige el Authorization correcto", async () => {
    t.setEnv("MP_WEBHOOK_SECRET", "test-secret-cron");
    t.setEnv("CRON_SECRET", "s3cr3t");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    const sinAuth = await GET(new Request("http://localhost/api/cron/webhook-healthcheck"));
    expect(sinAuth.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();

    const conAuthMalo = await GET(
      new Request("http://localhost/api/cron/webhook-healthcheck", { headers: { authorization: "Bearer mal" } })
    );
    expect(conAuthMalo.status).toBe(401);

    const conAuthBueno = await GET(
      new Request("http://localhost/api/cron/webhook-healthcheck", { headers: { authorization: "Bearer s3cr3t" } })
    );
    expect(conAuthBueno.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sin CRON_SECRET configurado, corre sin pedir autorización", async () => {
    t.setEnv("MP_WEBHOOK_SECRET", "test-secret-cron");
    t.setEnv("CRON_SECRET", undefined);
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    const res = await GET(new Request("http://localhost/api/cron/webhook-healthcheck"));
    expect(res.status).toBe(200);
  });

  it("si falla el registro en la base, igual responde 200 (el chequeo en si funcionó)", async () => {
    t.setEnv("MP_WEBHOOK_SECRET", "test-secret-cron");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    t.db.failNext("webhook_health_checks", "insert", "boom");

    const res = await GET(new Request("http://localhost/api/cron/webhook-healthcheck"));
    expect(res.status).toBe(200);
  });
});
