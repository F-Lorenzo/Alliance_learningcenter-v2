export const GRACE_PERIOD_DAYS = 3;

/** Parses an MP date string defensively. Returns new Date() if invalid. */
export function parseSafeDate(value: unknown): Date {
  if (!value) return new Date();
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Maps MP preapproval status strings to internal status strings. */
export function mapMpStatus(mpStatus: string | undefined | null): string {
  const map: Record<string, string> = {
    authorized: "active",
    paused:     "past_due",
    cancelled:  "canceled",
    pending:    "trialing",
  };
  return map[mpStatus ?? ""] ?? "inactive";
}

/** Derives plan name from frequency. */
export function planFromFrequency(frequency: number): "yearly" | "monthly" {
  return frequency >= 12 ? "yearly" : "monthly";
}

/**
 * Calculates the new period end after a successful payment.
 *
 * Rule:
 * - If `currentPeriodEnd` is still in the future → extend from there (no gap).
 * - If `currentPeriodEnd` is past or null → extend from `paymentDate`.
 */
export function calculateNewPeriodEnd(
  paymentDate: Date,
  currentPeriodEnd: Date | null,
  frequency: number,
  frequencyType: "months" | "years"
): Date {
  const base =
    currentPeriodEnd && currentPeriodEnd > paymentDate
      ? currentPeriodEnd
      : paymentDate;

  const next = new Date(base);
  if (frequencyType === "years") {
    next.setUTCFullYear(next.getUTCFullYear() + frequency);
  } else {
    next.setUTCMonth(next.getUTCMonth() + frequency);
  }
  return next;
}

/**
 * Returns true if the user should have access right now.
 * Includes a 3-day grace period after expiry.
 */
export function isSubscriptionActive(
  status: string,
  currentPeriodEnd: Date | null,
  now: Date = new Date()
): boolean {
  if (status === "active" || status === "trialing") {
    if (!currentPeriodEnd) return true;
    const grace = new Date(currentPeriodEnd);
    grace.setDate(grace.getDate() + GRACE_PERIOD_DAYS);
    return now <= grace;
  }
  if (status === "past_due") {
    if (!currentPeriodEnd) return false;
    const grace = new Date(currentPeriodEnd);
    grace.setDate(grace.getDate() + GRACE_PERIOD_DAYS);
    return now <= grace;
  }
  return false;
}
