export const GRACE_PERIOD_DAYS = 3;

/** Parses an MP date string defensively. Returns new Date() if invalid. */
export function parseSafeDate(value: unknown): Date {
  if (!value) return new Date();
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Maps MP preapproval status strings to internal status strings.
 *
 * `pending` (preapproval creada, todavia sin autorizar/cobrar) mapea a un status propio
 * ("pending") que NO otorga acceso ni extiende el periodo — antes mapeaba a "trialing", lo
 * cual regalaba ~1 mes de acceso con solo abrir el checkout sin llegar a pagar.
 */
export function mapMpStatus(mpStatus: string | undefined | null): string {
  const map: Record<string, string> = {
    authorized: "active",
    paused:     "past_due",
    cancelled:  "canceled",
    pending:    "pending",
  };
  return map[mpStatus ?? ""] ?? "inactive";
}

/** Derives plan name from frequency. */
export function planFromFrequency(frequency: number): "yearly" | "monthly" {
  return frequency >= 12 ? "yearly" : "monthly";
}

/** Inversa de planFromFrequency: frecuencia MP a partir del plan guardado en `subscriptions.plan`. */
export function frequencyFromPlan(plan: string | null | undefined): {
  frequency: number;
  frequencyType: "months";
} {
  return plan === "yearly" ? { frequency: 12, frequencyType: "months" } : { frequency: 1, frequencyType: "months" };
}

/**
 * Suma `frequency` unidades (`frequencyType`) a `base`, en UTC, con el mismo criterio que usa
 * Mercado Pago para meses "cortos": si el dia de partida no existe en el mes/anio destino
 * (ej. 31 de enero + 1 mes, o 29 de febrero bisiesto + 1 anio), se clampea al ultimo dia del
 * mes destino en vez de desbordar al mes siguiente (comportamiento nativo de Date en JS).
 */
function addIntervalUTC(base: Date, frequency: number, frequencyType: "months" | "years"): Date {
  const next = new Date(base);
  const day = next.getUTCDate();
  if (frequencyType === "years") {
    next.setUTCFullYear(next.getUTCFullYear() + frequency);
  } else {
    next.setUTCMonth(next.getUTCMonth() + frequency);
  }
  if (next.getUTCDate() !== day) {
    // Se desbordo al mes siguiente (ej. 31 ene -> 3 mar): clampear al ultimo dia del mes destino.
    next.setUTCDate(0);
  }
  return next;
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

  return addIntervalUTC(base, frequency, frequencyType);
}

/**
 * Returns true if the user should have access right now.
 *
 * - active / trialing (legado): acceso pleno, con `GRACE_PERIOD_DAYS` de gracia tras el
 *   vencimiento (cubre webhooks de renovacion demorados).
 * - past_due: igual, con gracia (MP sigue reintentando el cobro).
 * - canceled: acceso SOLO hasta `current_period_end` (lo ya pagado), sin gracia extra —
 *   cancelar no debe cortar de inmediato un periodo ya cobrado.
 * - pending / inactive / cualquier otro: sin acceso (nunca se confirmo un cobro).
 */
export function isSubscriptionActive(
  status: string,
  currentPeriodEnd: Date | null,
  now: Date = new Date()
): boolean {
  if (status === "active" || status === "trialing") {
    if (!currentPeriodEnd) return true;
    const grace = new Date(currentPeriodEnd);
    grace.setUTCDate(grace.getUTCDate() + GRACE_PERIOD_DAYS);
    return now <= grace;
  }
  if (status === "past_due") {
    if (!currentPeriodEnd) return false;
    const grace = new Date(currentPeriodEnd);
    grace.setUTCDate(grace.getUTCDate() + GRACE_PERIOD_DAYS);
    return now <= grace;
  }
  if (status === "canceled") {
    if (!currentPeriodEnd) return false;
    return now <= currentPeriodEnd;
  }
  return false;
}
