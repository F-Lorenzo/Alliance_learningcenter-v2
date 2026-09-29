import { describe, it, expect, vi } from "vitest";
import { installHarness, TEST_USER_ID, ADMIN_USER_ID, makeSubscriptionRow } from "@/test-utils/harness";

vi.mock("@/lib/supabase/admin", async () => (await import("@/test-utils/harness")).adminMock());
vi.mock("@/lib/supabase/server", async () => (await import("@/test-utils/harness")).serverMock());
vi.mock("mercadopago", async () => (await import("@/test-utils/harness")).mercadopagoMock());
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { toggleSubscription } from "./actions";

const t = installHarness();

function loginAsAdmin() {
  return t.loginAs({ id: ADMIN_USER_ID, app_metadata: { role: "super_admin" } });
}

describe("toggleSubscription (panel admin)", () => {
  it("requiere rol admin: un usuario comun no puede ejecutarla", async () => {
    t.loginAs({ id: TEST_USER_ID });
    await expect(toggleSubscription(TEST_USER_ID, null, "monthly")).rejects.toThrow();
  });

  it("desactivar: marca canceled en la base Y cancela la preapproval REAL en Mercado Pago", async () => {
    loginAsAdmin();
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ user_id: TEST_USER_ID, mp_subscription_id: pre.id, status: "active" }, t.now()));

    const result = await toggleSubscription(TEST_USER_ID, "active", "yearly");
    expect(result.ok).toBe(true);
    expect(result.warning).toBeUndefined();

    // Antes de este fix, MP seguía cobrando aunque el admin diera de baja al usuario.
    expect(t.mp.getPreapproval(pre.id)?.status).toBe("cancelled");
    expect(t.db.dump("subscriptions")[0].status).toBe("canceled");
  });

  it("desactivar corta el acceso DE INMEDIATO, aunque el período pagado/otorgado siga vigente (a diferencia de cancelar desde la app o MP)", async () => {
    loginAsAdmin();
    t.setNow("2025-01-01T00:00:00Z");
    const future = new Date("2026-01-01T00:00:00Z"); // un año de acceso ya otorgado
    t.db.seed("subscriptions", makeSubscriptionRow(
      { user_id: TEST_USER_ID, mp_subscription_id: null, status: "active", current_period_end: future.toISOString() },
      t.now()
    ));

    const result = await toggleSubscription(TEST_USER_ID, "active", "yearly");
    expect(result.ok).toBe(true);
    const row = t.db.dump("subscriptions")[0];
    expect(row.status).toBe("canceled");
    expect(row.current_period_end).toBeNull(); // cortado ya, no "hasta la fecha que quedó cargada"
  });

  it("si Mercado Pago rechaza la cancelación, la baja en la base igual se aplica pero se avisa con `warning`", async () => {
    loginAsAdmin();
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ user_id: TEST_USER_ID, mp_subscription_id: pre.id, status: "active" }, t.now()));
    t.mp.failNext("preapproval.update", 500);

    const result = await toggleSubscription(TEST_USER_ID, "active", "yearly");
    expect(result.ok).toBe(true);
    expect(result.warning).toMatch(/mercado pago/i);
    expect(t.db.dump("subscriptions")[0].status).toBe("canceled"); // el admin no queda bloqueado
  });

  it("desactivar una fila sin mp_subscription_id (alta manual) no llama a Mercado Pago", async () => {
    loginAsAdmin();
    t.db.seed("subscriptions", makeSubscriptionRow({ user_id: TEST_USER_ID, mp_subscription_id: null, status: "active" }, t.now()));
    const result = await toggleSubscription(TEST_USER_ID, "active", "yearly");
    expect(result.ok).toBe(true);
    expect(t.mp.calls).toHaveLength(0);
    expect(t.db.dump("subscriptions")[0].status).toBe("canceled");
  });

  it("activar (alta manual) sin fila previa: crea una fila active con el período del plan elegido", async () => {
    loginAsAdmin();
    t.setNow("2025-01-01T00:00:00Z");
    const result = await toggleSubscription(TEST_USER_ID, null, "monthly");
    expect(result.ok).toBe(true);
    const [sub] = t.db.dump("subscriptions");
    expect(sub.status).toBe("active");
    expect(sub.plan).toBe("monthly");
    expect(new Date(sub.current_period_end as string).toISOString()).toBe("2025-02-01T00:00:00.000Z");
  });

  it("activar reutiliza una fila sin mp_subscription_id, pero NUNCA una vinculada a una preapproval real", async () => {
    loginAsAdmin();
    t.setNow("2025-01-01T00:00:00Z");
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "cancelled" });
    t.db.seed("subscriptions", makeSubscriptionRow(
      { user_id: TEST_USER_ID, mp_subscription_id: pre.id, status: "canceled", current_period_end: "2024-01-01T00:00:00Z" },
      new Date("2023-01-01T00:00:00Z")
    ));

    const result = await toggleSubscription(TEST_USER_ID, "canceled", "yearly");
    expect(result.ok).toBe(true);
    // No reutilizo la fila de MP: crea una fila NUEVA para el alta manual.
    expect(t.db.count("subscriptions")).toBe(2);
    const manualRow = t.db.find("subscriptions", (r) => r.mp_subscription_id === null)!;
    expect(manualRow.status).toBe("active");
    expect(manualRow.plan).toBe("yearly");
    const mpRow = t.db.find("subscriptions", (r) => r.mp_subscription_id === pre.id)!;
    expect(mpRow.status).toBe("canceled"); // sin tocar
  });
});
