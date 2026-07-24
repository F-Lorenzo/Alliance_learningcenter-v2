import { describe, it, expect } from "vitest";
import { calculateNewPeriodEnd, isSubscriptionActive } from "./subscription-logic";

/**
 * Integration-style tests for the renewal flow scenarios.
 */
describe("Renewal flow scenarios", () => {
  it("first payment: no existing sub → period extends 1 month from payment date", () => {
    const paymentDate = new Date("2025-01-10T12:00:00Z");
    const newEnd = calculateNewPeriodEnd(paymentDate, null, 1, "months");
    expect(newEnd.toISOString()).toBe(new Date("2025-02-10T12:00:00Z").toISOString());
    expect(isSubscriptionActive("active", newEnd, paymentDate)).toBe(true);
  });

  it("on-time renewal: payment arrives before expiry → extends from existing end (no gap)", () => {
    const paymentDate = new Date("2025-02-08T00:00:00Z");
    const currentEnd = new Date("2025-02-10T12:00:00Z"); // 2 days in future
    const newEnd = calculateNewPeriodEnd(paymentDate, currentEnd, 1, "months");
    // Should extend from currentEnd, not from payment date
    expect(newEnd.toISOString()).toBe(new Date("2025-03-10T12:00:00Z").toISOString());
  });

  it("late renewal: payment arrives after expiry → extends from payment date", () => {
    const paymentDate = new Date("2025-02-15T00:00:00Z");
    const currentEnd = new Date("2025-02-10T12:00:00Z"); // already expired
    const newEnd = calculateNewPeriodEnd(paymentDate, currentEnd, 1, "months");
    // Should extend from payment date
    expect(newEnd.toISOString()).toBe(new Date("2025-03-15T00:00:00Z").toISOString());
  });

  it("user has access on the last day of grace period", () => {
    const expiredAt = new Date("2025-02-10T12:00:00Z");
    const lastGraceDay = new Date("2025-02-13T11:59:59Z"); // 3 days later, 1s before end
    expect(isSubscriptionActive("active", expiredAt, lastGraceDay)).toBe(true);
  });

  it("user loses access one second after grace period", () => {
    const expiredAt = new Date("2025-02-10T12:00:00Z");
    const afterGrace = new Date("2025-02-13T12:00:01Z");
    expect(isSubscriptionActive("active", expiredAt, afterGrace)).toBe(false);
  });

  it("chained renewals: two payments chain correctly", () => {
    const payment1 = new Date("2025-01-10T00:00:00Z");
    const end1 = calculateNewPeriodEnd(payment1, null, 1, "months");
    // end1 = 2025-02-10

    const payment2 = new Date("2025-02-08T00:00:00Z"); // 2 days before end1
    const end2 = calculateNewPeriodEnd(payment2, end1, 1, "months");
    // Should extend from end1 (2025-02-10) → 2025-03-10
    expect(end2.toISOString()).toBe(new Date("2025-03-10T00:00:00Z").toISOString());
  });
});
