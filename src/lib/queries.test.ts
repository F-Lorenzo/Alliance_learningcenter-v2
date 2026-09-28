import { describe, it, expect, vi } from "vitest";
import { installHarness, TEST_USER_ID, makeSubscriptionRow } from "@/test-utils/harness";

vi.mock("@/lib/supabase/server", async () => (await import("@/test-utils/harness")).serverMock());

import { getSubscription, userHasActiveAccess } from "./queries";

const t = installHarness();

describe("getSubscription", () => {
  it("sin filas → null", async () => {
    t.loginAs({ id: TEST_USER_ID });
    expect(await getSubscription(TEST_USER_ID)).toBeNull();
  });

  it("una sola fila → la devuelve tal cual, sin importar su status", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.db.seed("subscriptions", makeSubscriptionRow({ status: "canceled", current_period_end: null }, t.now()));
    const sub = await getSubscription(TEST_USER_ID);
    expect(sub?.status).toBe("canceled");
  });

  it("[WHP-06] con una fila vieja cancelada y la nueva vigente, devuelve la VIGENTE (no la mas reciente por created_at a ciegas)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.setNow("2025-03-15T00:00:00Z");
    // La fila "vieja" fue creada DESPUES que la nueva (ej. quedo con un created_at mas nuevo por
    // un reinsert manual), pero no da acceso: getSubscription debe preferir la que si lo da.
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: "NEW", status: "active", current_period_end: "2025-06-01T00:00:00Z" },
      new Date("2025-01-01T00:00:00Z")
    ));
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: "OLD", status: "canceled", current_period_end: "2025-01-01T00:00:00Z" },
      new Date("2025-02-01T00:00:00Z") // created_at MAS reciente que la activa
    ));

    const sub = await getSubscription(TEST_USER_ID);
    expect(sub?.mp_subscription_id).toBe("NEW");
    expect(sub?.status).toBe("active");
  });

  it("con dos filas activas, prefiere la de vencimiento mas lejano", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.setNow("2025-03-15T00:00:00Z");
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: "A", status: "active", current_period_end: "2025-06-01T00:00:00Z" },
      new Date("2025-01-01T00:00:00Z")
    ));
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: "B", status: "active", current_period_end: "2026-01-01T00:00:00Z" },
      new Date("2025-02-01T00:00:00Z")
    ));

    const sub = await getSubscription(TEST_USER_ID);
    expect(sub?.mp_subscription_id).toBe("B");
  });

  it("si ninguna fila da acceso, devuelve la mas reciente (para mostrar su estado)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.setNow("2025-03-15T00:00:00Z");
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: "OLDEST", status: "canceled", current_period_end: "2025-01-01T00:00:00Z" },
      new Date("2025-01-01T00:00:00Z")
    ));
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: "NEWEST", status: "canceled", current_period_end: "2025-02-01T00:00:00Z" },
      new Date("2025-02-01T00:00:00Z")
    ));

    const sub = await getSubscription(TEST_USER_ID);
    expect(sub?.mp_subscription_id).toBe("NEWEST");
  });

  it("solo lee las filas del propio usuario (RLS)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.db.seed("subscriptions", makeSubscriptionRow({ user_id: "otro-usuario", status: "active" }, t.now()));
    expect(await getSubscription(TEST_USER_ID)).toBeNull();
  });
});

describe("userHasActiveAccess", () => {
  it("delega en getSubscription + isSubscriptionActive", async () => {
    t.loginAs({ id: TEST_USER_ID });
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(false);
    t.db.seed("subscriptions", makeSubscriptionRow({ status: "active" }, t.now()));
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(true);
  });
});
