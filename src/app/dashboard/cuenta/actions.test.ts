import { describe, it, expect, vi } from "vitest";
import { installHarness, TEST_USER_ID, makeSubscriptionRow } from "@/test-utils/harness";

// vi.mock se hoistea: SIEMPRE antes de importar la ruta real (ver test-utils/harness.ts).
vi.mock("@/lib/supabase/admin", async () => (await import("@/test-utils/harness")).adminMock());
vi.mock("@/lib/supabase/server", async () => (await import("@/test-utils/harness")).serverMock());
vi.mock("mercadopago", async () => (await import("@/test-utils/harness")).mercadopagoMock());
// revalidatePath requiere un request-scope real de Next (static generation store); fuera de un
// request real (como en este test) revienta con un invariant interno. Se mockea, igual que
// cualquier otro test de una server action de Next fuera del runtime del framework.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { cancelSubscription } from "./actions";

const t = installHarness();

describe("cancelSubscription (self-service, Mi cuenta)", () => {
  it("sin sesión → error, no toca nada", async () => {
    const res = await cancelSubscription();
    expect(res.ok).toBe(false);
    expect(t.mp.calls).toHaveLength(0);
  });

  it("sin suscripción → error explicativo", async () => {
    t.loginAs({ id: TEST_USER_ID });
    const res = await cancelSubscription();
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/no encontramos/i);
  });

  it("cancela la preapproval REAL en MP y marca la fila como canceled de inmediato (no espera al webhook)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ mp_subscription_id: pre.id, status: "active" }, t.now()));

    const res = await cancelSubscription();
    expect(res.ok).toBe(true);

    // Se llamó a PreApproval.update({status:"cancelled"}) sobre la preapproval real.
    const calls = t.mp.callsTo("preapproval.update");
    expect(calls).toHaveLength(1);
    expect((calls[0].args as { id: string; body: { status: string } }).id).toBe(pre.id);
    expect((calls[0].args as { id: string; body: { status: string } }).body.status).toBe("cancelled");
    expect(t.mp.getPreapproval(pre.id)?.status).toBe("cancelled");

    // Reflejado ya mismo en la base (no se espera al webhook).
    const [sub] = t.db.dump("subscriptions");
    expect(sub.status).toBe("canceled");
  });

  it("el acceso se mantiene hasta current_period_end tras cancelar (no corta lo ya pagado)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.setNow("2025-06-01T00:00:00Z");
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    const future = new Date("2025-07-01T00:00:00Z");
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: pre.id, status: "active", current_period_end: future.toISOString() },
      t.now()
    ));

    const res = await cancelSubscription();
    expect(res.ok).toBe(true);
    const [sub] = t.db.dump("subscriptions");
    expect(sub.status).toBe("canceled");
    // El fake DB devuelve timestamps en formato PostgREST ("+00:00", no "Z"): comparar por valor.
    expect(new Date(sub.current_period_end as string).toISOString()).toBe(future.toISOString());
  });

  it("si MP rechaza la cancelación, no se marca canceled localmente (evita mentirle al usuario)", async () => {
    t.loginAs({ id: TEST_USER_ID });
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ mp_subscription_id: pre.id, status: "active" }, t.now()));
    t.mp.failNext("preapproval.update", 500);

    const res = await cancelSubscription();
    expect(res.ok).toBe(false);
    const [sub] = t.db.dump("subscriptions");
    expect(sub.status).toBe("active"); // sigue activa: la cancelacion en MP fallo
  });

  it("una fila sin mp_subscription_id (activada manualmente por el admin) se cancela solo en la base", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.db.seed("subscriptions", makeSubscriptionRow({ mp_subscription_id: null, status: "active" }, t.now()));

    const res = await cancelSubscription();
    expect(res.ok).toBe(true);
    expect(t.mp.callsTo("preapproval.update")).toHaveLength(0); // no hay nada que cancelar en MP
    expect(t.db.dump("subscriptions")[0].status).toBe("canceled");
  });

  it("ya estaba cancelada (pero todavía en el período pagado) → idempotente, no vuelve a llamar a MP", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.setNow("2025-06-01T00:00:00Z");
    const future = new Date("2025-07-01T00:00:00Z");
    t.db.seed("subscriptions", makeSubscriptionRow({ status: "canceled", current_period_end: future.toISOString() }, t.now()));
    const res = await cancelSubscription();
    expect(res.ok).toBe(true);
    expect(t.mp.calls).toHaveLength(0);
  });

  it("con varias filas (una vieja cancelada + la vigente), cancela la que hoy da acceso", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.setNow("2025-03-15T00:00:00Z"); // entre el vencimiento de la vieja y el de la vigente
    const oldPre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "cancelled" });
    const newPre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: oldPre.id, status: "canceled", current_period_end: "2025-01-01T00:00:00Z" },
      new Date("2024-01-01T00:00:00Z")
    ));
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: newPre.id, status: "active", current_period_end: "2025-06-01T00:00:00Z" },
      new Date("2025-02-01T00:00:00Z")
    ));

    const res = await cancelSubscription();
    expect(res.ok).toBe(true);
    const calls = t.mp.callsTo("preapproval.update");
    expect(calls).toHaveLength(1);
    expect((calls[0].args as { id: string }).id).toBe(newPre.id); // la VIGENTE, no la vieja

    const oldRow = t.db.find("subscriptions", (r) => r.mp_subscription_id === oldPre.id)!;
    expect(oldRow.status).toBe("canceled"); // sin tocar, ya lo estaba
    const newRow = t.db.find("subscriptions", (r) => r.mp_subscription_id === newPre.id)!;
    expect(newRow.status).toBe("canceled"); // ahora si
  });

  it("sin MP_ACCESS_TOKEN configurado → error claro en vez de reventar", async () => {
    t.loginAs({ id: TEST_USER_ID });
    t.db.seed("subscriptions", makeSubscriptionRow({ status: "active" }, t.now()));
    t.setEnv("MP_ACCESS_TOKEN", undefined);
    const res = await cancelSubscription();
    expect(res.ok).toBe(false);
  });
});
