import { describe, it, expect, vi } from "vitest";
import { installHarness } from "@/test-utils/harness";

vi.mock("@/lib/supabase/admin", async () => (await import("@/test-utils/harness")).adminMock());

import { getWebhookHealth } from "./admin-queries";

const t = installHarness();

describe("getWebhookHealth", () => {
  it("sin ningún chequeo registrado todavía (recién desplegado): sin problema, hasData false", async () => {
    const health = await getWebhookHealth();
    expect(health).toEqual({ hasData: false, lastCheck: null, recentFailedEvents: 0, hasProblem: false });
  });

  it("último chequeo ok y sin eventos fallados recientes: todo bien", async () => {
    t.db.seed("webhook_health_checks", { ok: true, status_code: 200, error: null });
    const health = await getWebhookHealth();
    expect(health.hasProblem).toBe(false);
    expect(health.lastCheck?.ok).toBe(true);
  });

  it("último chequeo falló: hasProblem true", async () => {
    t.db.seed("webhook_health_checks", { ok: false, status_code: 502, error: "HTTP 502" });
    const health = await getWebhookHealth();
    expect(health.hasProblem).toBe(true);
    expect(health.lastCheck).toMatchObject({ ok: false, statusCode: 502, error: "HTTP 502" });
  });

  it("usa el chequeo MÁS RECIENTE aunque haya uno viejo con distinto resultado", async () => {
    t.setNow("2025-01-01T00:00:00Z");
    t.db.seed("webhook_health_checks", { ok: false, status_code: 502, error: "viejo" });
    t.setNow("2025-01-02T00:00:00Z");
    t.db.seed("webhook_health_checks", { ok: true, status_code: 200, error: null });

    const health = await getWebhookHealth();
    expect(health.hasProblem).toBe(false);
    expect(health.lastCheck?.ok).toBe(true);
  });

  it("eventos webhook_events fallados en las últimas 24hs cuentan como problema aunque el ping esté ok", async () => {
    t.setNow("2025-06-01T12:00:00Z");
    t.db.seed("webhook_health_checks", { ok: true, status_code: 200, error: null });
    t.db.seed("webhook_events", { event_id: "e1", type: "payment", status: "failed" });
    t.db.seed("webhook_events", { event_id: "e2", type: "payment", status: "failed" });
    t.db.seed("webhook_events", { event_id: "e3", type: "payment", status: "processed" }); // no cuenta

    const health = await getWebhookHealth();
    expect(health.recentFailedEvents).toBe(2);
    expect(health.hasProblem).toBe(true);
  });

  it("eventos fallados de hace MÁS de 24hs no cuentan", async () => {
    t.setNow("2025-06-01T12:00:00Z");
    t.db.seed("webhook_events", {
      event_id: "old",
      type: "payment",
      status: "failed",
      created_at: "2025-05-29T00:00:00Z",
    });
    t.db.seed("webhook_health_checks", { ok: true, status_code: 200, error: null });

    const health = await getWebhookHealth();
    expect(health.recentFailedEvents).toBe(0);
    expect(health.hasProblem).toBe(false);
  });

  it("si la base no está disponible (falta correr una migración, o cualquier otro error), no revienta: devuelve el estado vacío", async () => {
    t.breakAdminClient();
    const health = await getWebhookHealth();
    expect(health).toEqual({ hasData: false, lastCheck: null, recentFailedEvents: 0, hasProblem: false });
  });
});
