import { describe, it, expect } from "vitest";
import {
  parseSafeDate,
  mapMpStatus,
  planFromFrequency,
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
  it("maps pending → trialing", () => expect(mapMpStatus("pending")).toBe("trialing"));
  it("maps unknown → inactive", () => expect(mapMpStatus("unknown")).toBe("inactive"));
  it("handles undefined → inactive", () => expect(mapMpStatus(undefined)).toBe("inactive"));
});

describe("planFromFrequency", () => {
  it("returns monthly for 1", () => expect(planFromFrequency(1)).toBe("monthly"));
  it("returns yearly for 12", () => expect(planFromFrequency(12)).toBe("yearly"));
  it("returns yearly for 24", () => expect(planFromFrequency(24)).toBe("yearly"));
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

  it("canceled → no access", () => {
    expect(isSubscriptionActive("canceled", new Date("2025-07-01T00:00:00Z"), now)).toBe(false);
  });

  it("inactive → no access", () => {
    expect(isSubscriptionActive("inactive", null, now)).toBe(false);
  });
});
