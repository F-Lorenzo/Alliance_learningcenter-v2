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

describe("[cambio de plan] cancela la preapproval vieja en MP antes de crear la nueva", () => {
  it("con una preapproval real vigente, cambiar de plan la cancela en MP y crea la nueva", async () => {
    t.loginAs({ id: TEST_USER_ID });
    const oldPre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ status: "active", plan: "monthly", mp_subscription_id: oldPre.id }, t.now()));

    const res = await POST(buildCheckoutRequest({ plan: "yearly" }));
    expect(res.status).toBe(200);

    // La preapproval vieja quedo cancelada ANTES de crear la nueva.
    const updateCalls = t.mp.callsTo("preapproval.update");
    expect(updateCalls).toHaveLength(1);
    expect((updateCalls[0].args as { id: string; body: { status: string } }).id).toBe(oldPre.id);
    expect(t.mp.getPreapproval(oldPre.id)?.status).toBe("cancelled");
    expect(t.mp.callsTo("preapproval.create")).toHaveLength(1);
    // El cancel ocurre ANTES del create (orden real de las llamadas a MP).
    expect(updateCalls[0].seq).toBeLessThan(t.mp.callsTo("preapproval.create")[0].seq);
  });

  it("si Mercado Pago rechaza la cancelación de la vieja, NO crea la nueva (evita el doble cobro)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    const oldPre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ status: "active", plan: "monthly", mp_subscription_id: oldPre.id }, t.now()));
    t.mp.failNext("preapproval.update", 500);

    const res = await POST(buildCheckoutRequest({ plan: "yearly" }));
    expect(res.status).toBe(409);
    expect(t.mp.callsTo("preapproval.create")).toHaveLength(0); // nunca se creo la nueva
    expect(t.mp.getPreapproval(oldPre.id)?.status).toBe("authorized"); // la vieja sigue como estaba
  });

  it("una fila activa sin mp_subscription_id (alta manual del admin) no intenta cancelar nada en MP", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.db.seed("subscriptions", makeSubscriptionRow({ status: "active", plan: "monthly", mp_subscription_id: null }, t.now()));

    const res = await POST(buildCheckoutRequest({ plan: "yearly" }));
    expect(res.status).toBe(200);
    expect(t.mp.callsTo("preapproval.update")).toHaveLength(0);
    expect(t.mp.callsTo("preapproval.create")).toHaveLength(1);
  });
});
