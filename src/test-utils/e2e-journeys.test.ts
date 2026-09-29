/**
 * e2e-journeys.test.ts — recorridos completos de cliente, encadenando los handlers/acciones
 * REALES (checkout, webhook, cancelación, admin) tal como los vive un usuario real, en vez de
 * probar cada endpoint aislado. Corre contra el harness (Supabase + Mercado Pago 100% en
 * memoria) — rápido, determinista, sin red — pero ejercita el código de producción de punta a
 * punta.
 *
 * Estos NO reemplazan una prueba real contra Mercado Pago (ver docs/E2E-TESTING.md y
 * scripts/check-webhook-health.mjs para eso — lo único que puede agarrar un problema de
 * DNS/dominio/redirect como el que causó el incidente de septiembre/2026). Lo que SÍ prueban:
 * que la lógica de negocio, encadenada en las secuencias reales que un cliente atraviesa, hace
 * lo correcto.
 */
import { describe, it, expect, vi } from "vitest";
import { installHarness, TEST_USER_ID, ADMIN_USER_ID } from "@/test-utils/harness";
import { buildWebhookRequest, buildCheckoutRequest } from "@/test-utils/mp-webhook";
import { isSubscriptionActive } from "@/lib/subscription-logic";

vi.mock("@/lib/supabase/admin", async () => (await import("@/test-utils/harness")).adminMock());
vi.mock("@/lib/supabase/server", async () => (await import("@/test-utils/harness")).serverMock());
vi.mock("mercadopago", async () => (await import("@/test-utils/harness")).mercadopagoMock());
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { POST as webhookPOST } from "@/app/api/webhooks/mp/route";
import { POST as checkoutPOST } from "@/app/api/checkout/mp/route";
import { cancelSubscription } from "@/app/dashboard/cuenta/actions";
import { toggleSubscription } from "@/app/admin/actions";
import { getSubscription, userHasActiveAccess } from "@/lib/queries";

const t = installHarness();

/** Simula que MP autoriza una preapproval creada por checkout y manda el webhook de alta. */
async function activatePreapprovalFromCheckout(preapprovalId: string) {
  t.mp.authorize(preapprovalId);
  const res = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: preapprovalId }));
  expect(res.status).toBe(200);
}

describe("[E2E] Recorrido: alta nueva → 3 renovaciones mensuales seguidas", () => {
  it("el cliente paga 3 meses seguidos y tiene acceso todo el tiempo, con el vencimiento correcto", async () => {
    t.setNow("2025-01-10T12:00:00.000Z");
    t.loginAs({ id: TEST_USER_ID, email: "cliente@example.com" });

    // 1) El cliente hace click en "Suscribirme" (checkout crea la preapproval en MP).
    const checkoutRes = await checkoutPOST(buildCheckoutRequest({ plan: "monthly", origin: "https://alliance.test" }));
    expect(checkoutRes.status).toBe(200);
    const [preapproval] = t.mp.preapprovalsFor(TEST_USER_ID);
    expect(preapproval.status).toBe("pending");

    // 2) MP lo autoriza (completó el checkout) y notifica.
    await activatePreapprovalFromCheckout(preapproval.id);
    let sub = await getSubscription(TEST_USER_ID);
    expect(sub?.status).toBe("active");
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(true);

    // 3) Tres cobros mensuales sucesivos.
    for (let mes = 1; mes <= 3; mes++) {
      t.advance({ months: 1 });
      const pay = t.mp.chargeRecurring(preapproval.id);
      const res = await webhookPOST(buildWebhookRequest({ type: "payment", dataId: pay.id, requestId: `req-mes-${mes}` }));
      expect(res.status).toBe(200);
    }

    sub = await getSubscription(TEST_USER_ID);
    expect(sub?.status).toBe("active");
    // Vencimiento: alta (10 ene, autorizada el mismo día) + 1 (bootstrap) + 3 pagos = 10 mayo.
    expect(new Date(sub!.current_period_end!).toISOString()).toBe("2025-05-10T12:00:00.000Z");
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(true);

    // Solo UNA fila en toda la historia — nada se duplicó.
    expect(t.db.count("subscriptions")).toBe(1);
  });
});

describe("[E2E] Recorrido: cancelar desde la app mantiene acceso hasta lo pagado, después lo corta", () => {
  it("cancela en MP, sigue viendo contenido hasta current_period_end, después no", async () => {
    t.setNow("2025-03-01T00:00:00.000Z");
    t.loginAs({ id: TEST_USER_ID });
    const checkoutRes = await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }));
    expect(checkoutRes.status).toBe(200);
    const [preapproval] = t.mp.preapprovalsFor(TEST_USER_ID);
    await activatePreapprovalFromCheckout(preapproval.id);
    const activeAfterAlta = await getSubscription(TEST_USER_ID);
    const periodEnd = new Date(activeAfterAlta!.current_period_end!);

    // El cliente cancela desde "Mi cuenta" (server action real).
    const cancelResult = await cancelSubscription();
    expect(cancelResult.ok).toBe(true);
    expect(t.mp.getPreapproval(preapproval.id)?.status).toBe("cancelled");

    // Todavía dentro del período pagado: sigue viendo contenido.
    t.setNow(new Date(periodEnd.getTime() - 60_000)); // 1 minuto antes de vencer
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(true);

    // El webhook de MP (cancelled) llega mas tarde, de forma asincrónica: no debe cambiar nada
    // (ya estaba canceled) ni extender el período.
    const webhookRes = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: preapproval.id, requestId: "req-cancel-webhook" }));
    expect(webhookRes.status).toBe(200);
    const subAfterWebhook = await getSubscription(TEST_USER_ID);
    expect(subAfterWebhook?.current_period_end).toBe(activeAfterAlta!.current_period_end);

    // Una vez pasado el vencimiento, se corta.
    t.setNow(new Date(periodEnd.getTime() + 60_000)); // 1 minuto después
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(false);
  });
});

describe("[E2E] Recorrido del INCIDENTE: cliente se da de baja y vuelve a pagar con una preapproval NUEVA", () => {
  it("se activa solo, sin intervención manual del admin", async () => {
    t.setNow("2025-01-01T00:00:00.000Z");
    t.loginAs({ id: TEST_USER_ID, email: "cliente@example.com" });

    // Alta original, pago, cancelación (mismo camino que cualquier cliente viejo).
    await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }));
    const [oldPreapproval] = t.mp.preapprovalsFor(TEST_USER_ID);
    await activatePreapprovalFromCheckout(oldPreapproval.id);
    await cancelSubscription();
    expect(t.mp.getPreapproval(oldPreapproval.id)?.status).toBe("cancelled");

    // Pasa el tiempo, el período pagado vence, y el cliente vuelve a pagar (preapproval NUEVA:
    // así es como MP modela una re-suscripción real, nunca reactiva la vieja).
    t.advance({ months: 2 });
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(false); // en el medio, sin acceso

    const secondCheckout = await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }));
    expect(secondCheckout.status).toBe(200);
    const preapprovals = t.mp.preapprovalsFor(TEST_USER_ID);
    expect(preapprovals).toHaveLength(2);
    const newPreapproval = preapprovals[1];
    expect(newPreapproval.id).not.toBe(oldPreapproval.id);

    await activatePreapprovalFromCheckout(newPreapproval.id);
    const pay = t.mp.chargeRecurring(newPreapproval.id);
    const paymentRes = await webhookPOST(buildWebhookRequest({ type: "payment", dataId: pay.id }));
    expect(paymentRes.status).toBe(200);

    // Activo SOLO, sin que el admin haya tocado nada.
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(true);
    const sub = await getSubscription(TEST_USER_ID);
    expect(sub?.mp_subscription_id).toBe(newPreapproval.id);
    expect(sub?.status).toBe("active");

    // La fila VIEJA sigue existiendo, cancelada, con su propia identidad — no se mezcló.
    const oldRow = t.db.find("subscriptions", (r) => r.mp_subscription_id === oldPreapproval.id)!;
    expect(oldRow.status).toBe("canceled");
    expect(t.db.count("subscriptions")).toBe(2);

    // Un evento tardío de la preapproval VIEJA (ej. un reintento de MP de hace rato) no la
    // reactiva ni pisa la fila nueva.
    const lateEvent = await webhookPOST(
      buildWebhookRequest({ type: "subscription_preapproval", dataId: oldPreapproval.id, requestId: "req-tardio-viejo" })
    );
    expect(lateEvent.status).toBe(200);
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(true);
    expect((await getSubscription(TEST_USER_ID))?.mp_subscription_id).toBe(newPreapproval.id);
  });
});

describe("[E2E] Recorrido: cambio de plan mensual → anual", () => {
  it("cancela la vieja en MP sola y el cliente queda con acceso anual", async () => {
    t.setNow("2025-02-01T00:00:00.000Z");
    t.loginAs({ id: TEST_USER_ID });
    await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }));
    const [monthlyPre] = t.mp.preapprovalsFor(TEST_USER_ID);
    await activatePreapprovalFromCheckout(monthlyPre.id);
    expect((await getSubscription(TEST_USER_ID))?.plan).toBe("monthly");

    // El cliente va a /planes y elige el plan anual en cambio.
    const switchRes = await checkoutPOST(buildCheckoutRequest({ plan: "yearly" }));
    expect(switchRes.status).toBe(200);
    expect(t.mp.getPreapproval(monthlyPre.id)?.status).toBe("cancelled"); // la vieja, cancelada sola

    const [, yearlyPre] = t.mp.preapprovalsFor(TEST_USER_ID);
    await activatePreapprovalFromCheckout(yearlyPre.id);
    const pay = t.mp.chargeRecurring(yearlyPre.id, { amount: 199000 });
    await webhookPOST(buildWebhookRequest({ type: "payment", dataId: pay.id }));

    const sub = await getSubscription(TEST_USER_ID);
    expect(sub?.plan).toBe("yearly");
    expect(sub?.mp_subscription_id).toBe(yearlyPre.id);
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(true);
  });
});

describe("[E2E] Recorrido: alta manual del admin (cliente que paga por WhatsApp/transferencia)", () => {
  it("el admin activa a mano, el cliente tiene acceso, y al desactivar se corta de inmediato (sin período pagado que respetar)", async () => {
    // Dos sesiones distintas conviviendo, como en la vida real: el admin actúa desde el panel;
    // el cliente consulta su PROPIO acceso desde su sesión (RLS: cada quien ve/opera lo suyo).
    t.loginAs({ id: ADMIN_USER_ID, app_metadata: { role: "super_admin" } });
    const activateResult = await toggleSubscription(TEST_USER_ID, null, "yearly");
    expect(activateResult.ok).toBe(true);
    expect(t.mp.calls).toHaveLength(0); // alta manual: nunca toca Mercado Pago

    t.loginAs({ id: TEST_USER_ID });
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(true);
    const sub = await getSubscription(TEST_USER_ID);
    expect(sub?.mp_subscription_id).toBeNull();

    t.loginAs({ id: ADMIN_USER_ID, app_metadata: { role: "super_admin" } });
    const deactivateResult = await toggleSubscription(TEST_USER_ID, "active", "yearly");
    expect(deactivateResult.ok).toBe(true);
    expect(deactivateResult.warning).toBeUndefined(); // sin preapproval real, nada que fallar en MP

    t.loginAs({ id: TEST_USER_ID });
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(false);
  });
});

// Sanity: confirma que isSubscriptionActive (importado directo, sin pasar por getSubscription)
// concuerda con userHasActiveAccess en los bordes de tiempo usados en estos recorridos.
describe("[E2E] Consistencia de la regla de acceso en los bordes de current_period_end", () => {
  it("isSubscriptionActive y userHasActiveAccess concuerdan en el borde exacto del vencimiento", async () => {
    t.loginAs({ id: TEST_USER_ID });
    const periodEnd = new Date("2025-08-01T00:00:00.000Z");
    t.db.seed("subscriptions", { user_id: TEST_USER_ID, status: "active", plan: "monthly", current_period_end: periodEnd.toISOString() });

    t.setNow(periodEnd);
    expect(isSubscriptionActive("active", periodEnd, periodEnd)).toBe(true);
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(true);

    t.setNow(new Date(periodEnd.getTime() + 3 * 86_400_000 + 1)); // 1ms despues de agotar la gracia
    expect(await userHasActiveAccess(TEST_USER_ID)).toBe(false);
  });
});
