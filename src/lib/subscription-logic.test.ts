import { describe, it, expect } from "vitest";
import {
  parseSafeDate,
  mapMpStatus,
  planFromFrequency,
  frequencyFromPlan,
  calculateNewPeriodEnd,
  isSubscriptionActive,
  GRACE_PERIOD_DAYS,
} from "./subscription-logic";

describe("parseSafeDate", () => {
  it("parses a valid ISO string", () => {
    const d = parseSafeDate("2025-01-15T10:00:00Z");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(0); // January
  });

  it("returns a Date close to now for null", () => {
    const before = Date.now();
    const d = parseSafeDate(null);
    expect(d.getTime()).toBeGreaterThanOrEqual(before - 10);
  });

  it("returns a Date close to now for invalid string", () => {
    const before = Date.now();
    const d = parseSafeDate("not-a-date");
    expect(d.getTime()).toBeGreaterThanOrEqual(before - 10);
  });
});

describe("mapMpStatus", () => {
  it("maps authorized → active", () => expect(mapMpStatus("authorized")).toBe("active"));
  it("maps paused → past_due", () => expect(mapMpStatus("paused")).toBe("past_due"));
  it("maps cancelled → canceled", () => expect(mapMpStatus("cancelled")).toBe("canceled"));
  // "pending" (preapproval creada, sin autorizar todavia) NO debe dar acceso: mapea a un status
  // propio, no a "trialing" (eso regalaba acceso con solo abrir el checkout sin pagar).
  it("maps pending → pending (no otorga acceso, ver isSubscriptionActive)", () =>
    expect(mapMpStatus("pending")).toBe("pending"));
  it("maps unknown → inactive", () => expect(mapMpStatus("unknown")).toBe("inactive"));
  it("handles undefined → inactive", () => expect(mapMpStatus(undefined)).toBe("inactive"));
});

describe("planFromFrequency", () => {
  it("returns monthly for 1", () => expect(planFromFrequency(1)).toBe("monthly"));
  it("returns yearly for 12", () => expect(planFromFrequency(12)).toBe("yearly"));
  it("returns yearly for 24", () => expect(planFromFrequency(24)).toBe("yearly"));
});

describe("frequencyFromPlan", () => {
  it("returns 1 month for monthly", () => expect(frequencyFromPlan("monthly")).toEqual({ frequency: 1, frequencyType: "months" }));
  it("returns 12 months for yearly", () => expect(frequencyFromPlan("yearly")).toEqual({ frequency: 12, frequencyType: "months" }));
  it("defaults to monthly for null/unknown", () => {
    expect(frequencyFromPlan(null)).toEqual({ frequency: 1, frequencyType: "months" });
    expect(frequencyFromPlan("weird")).toEqual({ frequency: 1, frequencyType: "months" });
  });
});

describe("calculateNewPeriodEnd", () => {
  const paymentDate = new Date("2025-06-01T00:00:00Z");

  it("extends from paymentDate when currentPeriodEnd is null", () => {
    const result = calculateNewPeriodEnd(paymentDate, null, 1, "months");
    expect(result.toISOString()).toBe(new Date("2025-07-01T00:00:00Z").toISOString());
  });

  it("extends from paymentDate when currentPeriodEnd is in the past", () => {
    const pastEnd = new Date("2025-05-01T00:00:00Z");
    const result = calculateNewPeriodEnd(paymentDate, pastEnd, 1, "months");
    expect(result.toISOString()).toBe(new Date("2025-07-01T00:00:00Z").toISOString());
  });

  it("extends from currentPeriodEnd when it is still in the future (no gap)", () => {
    const futureEnd = new Date("2025-06-20T00:00:00Z");
    const result = calculateNewPeriodEnd(paymentDate, futureEnd, 1, "months");
    expect(result.toISOString()).toBe(new Date("2025-07-20T00:00:00Z").toISOString());
  });

  it("handles yearly frequency", () => {
    const result = calculateNewPeriodEnd(paymentDate, null, 1, "years");
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(5); // June
  });

  // WHP-18: Date.setUTCMonth desborda cuando el dia de origen no existe en el mes destino
  // (31 ene + 1 mes -> "3 mar" en vez de fin de febrero). calculateNewPeriodEnd debe clampear.
  it("clamps end-of-month overflow (Jan 31 + 1 month → Feb 28, not Mar 3)", () => {
    const result = calculateNewPeriodEnd(new Date("2025-01-31T00:00:00Z"), null, 1, "months");
    expect(result.toISOString()).toBe(new Date("2025-02-28T00:00:00Z").toISOString());
  });

  it("clamps leap-year Feb 29 + 1 year → Feb 28 of a non-leap year", () => {
    const result = calculateNewPeriodEnd(new Date("2024-02-29T00:00:00Z"), null, 1, "years");
    expect(result.toISOString()).toBe(new Date("2025-02-28T00:00:00Z").toISOString());
  });

  it("does not clamp when the target month has enough days", () => {
    const result = calculateNewPeriodEnd(new Date("2025-01-15T00:00:00Z"), null, 1, "months");
    expect(result.toISOString()).toBe(new Date("2025-02-15T00:00:00Z").toISOString());
  });
});

describe("isSubscriptionActive", () => {
  const now = new Date("2025-06-15T00:00:00Z");

  it("active status with future period_end → has access", () => {
    expect(isSubscriptionActive("active", new Date("2025-07-01T00:00:00Z"), now)).toBe(true);
  });

  it("active status with null period_end → has access", () => {
    expect(isSubscriptionActive("active", null, now)).toBe(true);
  });

  it("active status expired but within grace period → has access", () => {
    const expiredRecently = new Date("2025-06-13T00:00:00Z"); // 2 days ago
    expect(isSubscriptionActive("active", expiredRecently, now)).toBe(true);
  });

  it(`active status expired beyond ${GRACE_PERIOD_DAYS} days → no access`, () => {
    const expiredLong = new Date("2025-06-10T00:00:00Z"); // 5 days ago
    expect(isSubscriptionActive("active", expiredLong, now)).toBe(false);
  });

  it("past_due within grace → has access", () => {
    const expiredRecently = new Date("2025-06-13T00:00:00Z");
    expect(isSubscriptionActive("past_due", expiredRecently, now)).toBe(true);
  });

  it("past_due beyond grace → no access", () => {
    const expiredLong = new Date("2025-06-10T00:00:00Z");
    expect(isSubscriptionActive("past_due", expiredLong, now)).toBe(false);
  });

  it("past_due with null period_end → no access", () => {
    expect(isSubscriptionActive("past_due", null, now)).toBe(false);
  });

  // Cancelar (por el usuario, por MP o por el admin) NO corta el acceso ya pagado: se mantiene
  // hasta current_period_end, sin gracia extra (a diferencia de active/past_due).
  it("canceled with future period_end → access until period_end", () => {
    expect(isSubscriptionActive("canceled", new Date("2025-07-01T00:00:00Z"), now)).toBe(true);
  });

  it("canceled with period_end already past → no access", () => {
    expect(isSubscriptionActive("canceled", new Date("2025-06-01T00:00:00Z"), now)).toBe(false);
  });

  it("canceled exactly at period_end → still has access (inclusive)", () => {
    expect(isSubscriptionActive("canceled", now, now)).toBe(true);
  });

  it("canceled one ms after period_end → no access, and no grace period applies", () => {
    const justAfter = new Date(now.getTime() + 1);
    const periodEnd = now;
    expect(isSubscriptionActive("canceled", periodEnd, justAfter)).toBe(false);
  });

  it("canceled with null period_end → no access (nunca hubo periodo pagado)", () => {
    expect(isSubscriptionActive("canceled", null, now)).toBe(false);
  });

  it("inactive → no access", () => {
    expect(isSubscriptionActive("inactive", null, now)).toBe(false);
  });

  // "pending" (preapproval creada, sin autorizar/cobrar): jamas otorga acceso, con o sin fecha.
  it("pending → no access, even with a future period_end", () => {
    expect(isSubscriptionActive("pending", new Date("2025-07-01T00:00:00Z"), now)).toBe(false);
    expect(isSubscriptionActive("pending", null, now)).toBe(false);
  });
});
