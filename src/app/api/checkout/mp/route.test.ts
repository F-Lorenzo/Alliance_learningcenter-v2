import { describe, it, expect, vi } from "vitest";
import { installHarness, TEST_USER_ID, makeSubscriptionRow } from "@/test-utils/harness";
import { buildCheckoutRequest } from "@/test-utils/mp-webhook";

vi.mock("@/lib/supabase/admin", async () => (await import("@/test-utils/harness")).adminMock());
vi.mock("@/lib/supabase/server", async () => (await import("@/test-utils/harness")).serverMock());
vi.mock("mercadopago", async () => (await import("@/test-utils/harness")).mercadopagoMock());

import { POST } from "./route";

const t = installHarness();

describe("[H8 fix] checkout: no permite doblar una suscripción activa del mismo plan", () => {
  it("con una suscripción monthly activa, un nuevo checkout monthly se bloquea (409)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.db.seed("subscriptions", makeSubscriptionRow({ status: "active", plan: "monthly" }, t.now()));

    const res = await POST(buildCheckoutRequest({ plan: "monthly" }));
    expect(res.status).toBe(409);
    expect(t.mp.calls).toHaveLength(0); // ni siquiera se llamo a MP
  });

  it("con una suscripción monthly activa, SI se permite pasar a yearly (cambio de plan)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.db.seed("subscriptions", makeSubscriptionRow({ status: "active", plan: "monthly" }, t.now()));

    const res = await POST(buildCheckoutRequest({ plan: "yearly" }));
    expect(res.status).toBe(200);
    expect(t.mp.callsTo("preapproval.create")).toHaveLength(1);
  });

  it("con una suscripción vieja YA vencida (canceled, current_period_end pasado), se permite comprar de nuevo", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.setNow("2025-06-01T00:00:00Z");
    t.db.seed("subscriptions", makeSubscriptionRow(
      { status: "canceled", plan: "monthly", current_period_end: "2025-01-01T00:00:00Z" },
      new Date("2024-01-01T00:00:00Z")
    ));

    const res = await POST(buildCheckoutRequest({ plan: "monthly" }));
    expect(res.status).toBe(200);
  });

  it("una suscripción canceled pero TODAVÍA dentro del período pagado también bloquea (evita pagar dos veces por el mismo período)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.setNow("2025-06-01T00:00:00Z");
    t.db.seed("subscriptions", makeSubscriptionRow(
      { status: "canceled", plan: "monthly", current_period_end: "2025-07-01T00:00:00Z" },
      new Date("2025-05-01T00:00:00Z")
    ));

    const res = await POST(buildCheckoutRequest({ plan: "monthly" }));
    expect(res.status).toBe(409);
  });

  it("sin ninguna suscripción previa, el checkout funciona normalmente", async () => {
    t.loginAs({ id: TEST_USER_ID });
    const res = await POST(buildCheckoutRequest({ plan: "monthly" }));
    expect(res.status).toBe(200);
  });
});
