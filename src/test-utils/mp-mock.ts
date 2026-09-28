/**
 * mp-mock.ts — "mundo" falso de Mercado Pago + fabrica para `vi.mock("mercadopago")`.
 *
 * Firmas copiadas del SDK instalado (node_modules/mercadopago 2.12.0):
 *   new MercadoPagoConfig({ accessToken, options? })
 *   new PreApproval(config).create({ body, requestOptions? })   -> PreApprovalResponse
 *   new PreApproval(config).get({ id, requestOptions? })        -> PreApprovalResponse
 *   new PreApproval(config).update({ id, body, requestOptions? })
 *   new PreApproval(config).search({ options?, requestOptions? }) -> { paging, results }
 *   new Payment(config).get({ id, requestOptions? })            -> PaymentResponse
 *   new Payment(config).search({ options?, requestOptions? })   -> { paging, results }
 *
 * Errores: el SDK real NO lanza `Error`; hace `throw await response.json()`, o sea un OBJETO PLANO
 * `{ message, error, status, cause }`. Este mock lo replica (el webhook usa
 * `err instanceof Error ? err.message : JSON.stringify(err)`). El SDK real ademas reintenta con backoff
 * los errores >= 500; este mock NO reintenta (un solo intento por llamada).
 *
 * Lo que NO se puede garantizar: el formato exacto de cada campo del objeto real de MP (por ejemplo si
 * `payment.preapproval_id` / `payment.external_reference` vienen o no en los pagos de una suscripcion).
 * Por eso createPayment() NO los pone salvo que se los pidas explicitamente.
 */

export type MpApi =
  | "preapproval.get"
  | "preapproval.create"
  | "preapproval.update"
  | "preapproval.search"
  | "payment.get"
  | "payment.search"
  | "invoice.get";

export interface MpAutoRecurring {
  frequency: number;
  frequency_type: string;
  transaction_amount: number;
  currency_id: string;
  start_date?: string;
  end_date?: string;
  free_trial?: { frequency: number; frequency_type: string };
}

export interface MpPreapproval {
  id: string;
  status: string; // pending | authorized | paused | cancelled (| lo que quieras)
  reason?: string;
  external_reference?: string;
  payer_email?: string;
  payer_id?: number;
  collector_id?: number;
  application_id?: number;
  back_url?: string;
  init_point: string;
  auto_recurring: MpAutoRecurring;
  date_created: string;
  last_modified: string;
  next_payment_date?: string;
  payment_method_id?: string | null;
  first_invoice_offset?: string | null;
  summarized?: {
    charged_amount: number | null;
    charged_quantity: number | null;
    last_charged_amount: string | null;
    last_charged_date: string | null;
    pending_charge_amount: number | null;
    pending_charge_quantity: number | null;
    quotas: string | null;
    semaphore: string | null;
  };
  [extra: string]: unknown;
}

export interface MpPayment {
  id: number;
  status: string; // approved | pending | rejected | refunded | cancelled | in_process ...
  status_detail?: string;
  date_created: string;
  date_approved?: string | null;
  date_last_updated?: string;
  external_reference?: string;
  /** Solo existe si lo pedis (createPayment({preapproval_id}) o chargeRecurring()). */
  preapproval_id?: string;
  transaction_amount: number;
  currency_id?: string;
  description?: string;
  payer?: { id?: string; email?: string };
  [extra: string]: unknown;
}

/**
 * Recurso "authorized_payment" (GET /authorized_payments/{id}, clients/invoice del SDK) — lo que
 * dispara el topic `subscription_authorized_payment`. Tiene su PROPIO id (distinto al de
 * `payment`) y referencia el pago real subyacente en `.payment.id` — confirmado contra
 * producción: MP puede notificar `payment` Y `subscription_authorized_payment` para el MISMO
 * cobro, cada uno con su propio data.id pero compartiendo `payment.id`.
 */
export interface MpAuthorizedPayment {
  id: string;
  status: string; // processed | pending | rejected | recycled | cancelled ...
  preapproval_id?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  date_created: string;
  last_modified: string;
  payment?: { id: string; status: string; status_detail?: string };
  [extra: string]: unknown;
}

export interface MpCall {
  seq: number;
  api: MpApi;
  args: unknown;
  accessToken: string | undefined;
  at: Date;
  /** Si la llamada fallo, el objeto/Error lanzado. */
  error?: unknown;
}

export interface MpWorldOptions {
  /** Reloj. Default `() => new Date()` (respeta vi.setSystemTime). */
  now?: () => Date;
  /** Offset horario de los timestamps que emite MP: "-04:00" (default, como la doc de MP) o "Z". */
  tzOffset?: string;
  /** Rechazar (401) las llamadas con accessToken vacio/undefined (default true). */
  requireAccessToken?: boolean;
  /**
   * Access token que MP considera valido. Si se define, otro token => 401.
   * Default: cualquier token no vacio es valido.
   */
  validAccessToken?: string;
}

export interface MpFailOptions {
  times?: number;
  when?: (call: MpCall) => boolean;
}

/** Construye el objeto de error plano que lanza el SDK real. */
export function mpError(status: number, message?: string, error?: string, cause: unknown[] = []): {
  message: string;
  error: string;
  status: number;
  cause: unknown[];
} {
  const names: Record<number, string> = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    429: "too_many_requests",
    500: "internal_server_error",
    502: "bad_gateway",
    503: "service_unavailable",
  };
  return {
    message: message ?? names[status] ?? "error",
    error: error ?? names[status] ?? "error",
    status,
    cause,
  };
}

interface Rule {
  api: MpApi | "*";
  remaining: number;
  opts: MpFailOptions;
  hits: number;
  cancelled: boolean;
  /** Lanzar */
  fail?: unknown;
  /** o responder con esto en vez de lo real */
  respond?: (current: unknown, call: MpCall) => unknown;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class MpWorld {
  preapprovals = new Map<string, MpPreapproval>();
  payments = new Map<string, MpPayment>();
  authorizedPayments = new Map<string, MpAuthorizedPayment>();
  calls: MpCall[] = [];

  private idCounter = 0;
  private paymentCounter = 0;
  private authorizedPaymentCounter = 0;
  private callSeq = 0;
  private rules: Rule[] = [];
  private readonly clock: () => Date;
  private tz: string;
  requireAccessToken: boolean;
  validAccessToken: string | undefined;
  /** Si es true, MP rechaza back_url que no sea https (NO verificado contra MP real; default false). */
  requireHttpsBackUrl = false;

  constructor(private readonly options: MpWorldOptions = {}) {
    this.clock = options.now ?? (() => new Date());
    this.tz = options.tzOffset ?? "-04:00";
    this.requireAccessToken = options.requireAccessToken !== false;
    this.validAccessToken = options.validAccessToken;
  }

  // ── tiempo / ids ──────────────────────────────────────────────────────────

  now(): Date {
    return this.clock();
  }

  /** Formatea una fecha como la emite MP (con offset). */
  mpDate(d: Date | string | number = this.now()): string {
    const date = d instanceof Date ? d : new Date(d);
    if (this.tz === "Z") return date.toISOString();
    const m = /^([+-])(\d{2}):?(\d{2})$/.exec(this.tz);
    if (!m) return date.toISOString();
    const sign = m[1] === "-" ? -1 : 1;
    const offsetMin = sign * (Number(m[2]) * 60 + Number(m[3]));
    const local = new Date(date.getTime() + offsetMin * 60_000);
    return `${local.toISOString().slice(0, -1)}${m[1]}${m[2]}:${m[3]}`;
  }

  /** id de preapproval como los reales: 32 hex en minuscula. */
  nextId(): string {
    this.idCounter += 1;
    return `2c9380847${String(this.idCounter).padStart(23, "0")}`.slice(0, 32).replace(/[^0-9a-f]/g, "0");
  }

  private nextPaymentId(): number {
    this.paymentCounter += 1;
    return 100_000_000 + this.paymentCounter;
  }

  // ── preapprovals ──────────────────────────────────────────────────────────

  /** Registra una preapproval. Todos los campos son opcionales; devuelve la copia guardada. */
  createPreapproval(partial: Partial<MpPreapproval> = {}): MpPreapproval {
    const id = partial.id ?? this.nextId();
    const nowStr = this.mpDate();
    const p: MpPreapproval = {
      reason: "Alliance Learning Center — Plan Mensual",
      payer_id: 1_234_567_890,
      collector_id: 987_654_321,
      application_id: 555_000_111,
      payment_method_id: null,
      first_invoice_offset: null,
      date_created: nowStr,
      last_modified: nowStr,
      back_url: "http://localhost/planes/exito",
      summarized: {
        charged_amount: null,
        charged_quantity: null,
        last_charged_amount: null,
        last_charged_date: null,
        pending_charge_amount: null,
        pending_charge_quantity: null,
        quotas: null,
        semaphore: null,
      },
      ...partial,
      id,
      status: partial.status ?? "pending",
      init_point:
        partial.init_point ?? `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=${id}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 20000,
        currency_id: "ARS",
        ...(partial.auto_recurring ?? {}),
      },
    };
    this.preapprovals.set(id, p);
    return clone(p);
  }

  /**
   * Cambia el estado de una preapproval (lo que pasa en MP cuando el usuario autoriza, pausa o cancela).
   * `last_modified` se actualiza al "ahora" del mundo salvo que pases `lastModified`.
   */
  setPreapprovalStatus(
    id: string,
    status: string,
    opts: { lastModified?: string | Date | number } = {}
  ): MpPreapproval {
    const p = this.mustPreapproval(id);
    p.status = status;
    p.last_modified = this.mpDate(opts.lastModified ?? this.now());
    if (status === "authorized" && !p.next_payment_date) {
      const next = new Date(this.now());
      next.setUTCMonth(next.getUTCMonth() + Number(p.auto_recurring.frequency || 1));
      p.next_payment_date = this.mpDate(next);
    }
    return clone(p);
  }

  /** Atajos: el usuario completo el checkout / MP pauso / cancelo. */
  authorize(id: string, opts?: { lastModified?: string | Date | number }): MpPreapproval {
    return this.setPreapprovalStatus(id, "authorized", opts);
  }
  pause(id: string, opts?: { lastModified?: string | Date | number }): MpPreapproval {
    return this.setPreapprovalStatus(id, "paused", opts);
  }
  cancel(id: string, opts?: { lastModified?: string | Date | number }): MpPreapproval {
    return this.setPreapprovalStatus(id, "cancelled", opts);
  }

  /** Modifica campos arbitrarios (external_reference, auto_recurring, ...). */
  patchPreapproval(id: string, patch: Partial<MpPreapproval>): MpPreapproval {
    const p = this.mustPreapproval(id);
    Object.assign(p, patch);
    return clone(p);
  }

  getPreapproval(id: string): MpPreapproval | undefined {
    const p = this.preapprovals.get(id);
    return p ? clone(p) : undefined;
  }

  /** Todas las preapprovals de un usuario (external_reference), de la mas vieja a la mas nueva. */
  preapprovalsFor(externalReference: string): MpPreapproval[] {
    return [...this.preapprovals.values()]
      .filter((p) => p.external_reference === externalReference)
      .map((p) => clone(p));
  }

  private mustPreapproval(id: string): MpPreapproval {
    const p = this.preapprovals.get(id);
    if (!p) throw new Error(`mp-mock: preapproval inexistente: ${id}`);
    return p;
  }

  // ── pagos ─────────────────────────────────────────────────────────────────

  createPayment(partial: Partial<MpPayment> = {}): MpPayment {
    const id = partial.id ?? this.nextPaymentId();
    const nowStr = this.mpDate();
    const status = partial.status ?? "approved";
    const pay: MpPayment = {
      status_detail: status === "approved" ? "accredited" : undefined,
      date_created: nowStr,
      date_approved: status === "approved" ? nowStr : null,
      date_last_updated: nowStr,
      transaction_amount: 20000,
      currency_id: "ARS",
      description: "Alliance Learning Center",
      payer: { id: "1234567890", email: "cliente@example.com" },
      ...partial,
      id,
      status,
    };
    this.payments.set(String(id), pay);
    return clone(pay);
  }

  setPaymentStatus(id: string | number, status: string): MpPayment {
    const pay = this.mustPayment(id);
    pay.status = status;
    pay.date_last_updated = this.mpDate();
    if (status === "approved" && !pay.date_approved) pay.date_approved = this.mpDate();
    return clone(pay);
  }

  getPayment(id: string | number): MpPayment | undefined {
    const p = this.payments.get(String(id));
    return p ? clone(p) : undefined;
  }

  private mustPayment(id: string | number): MpPayment {
    const p = this.payments.get(String(id));
    if (!p) throw new Error(`mp-mock: pago inexistente: ${id}`);
    return p;
  }

  /**
   * Simula un cobro recurrente de una preapproval. Por defecto el pago lleva `preapproval_id` y
   * `external_reference` (los que tenga la preapproval). Pasa `includePreapprovalId:false` /
   * `includeExternalReference:false` para probar pagos "huerfanos" (H4).
   */
  chargeRecurring(
    preapprovalId: string,
    opts: {
      status?: string;
      amount?: number;
      date?: string | Date | number;
      includePreapprovalId?: boolean;
      includeExternalReference?: boolean;
      extra?: Partial<MpPayment>;
    } = {}
  ): MpPayment {
    const p = this.mustPreapproval(preapprovalId);
    const date = opts.date ?? this.now();
    const status = opts.status ?? "approved";
    const amount = opts.amount ?? p.auto_recurring.transaction_amount;
    const pay = this.createPayment({
      status,
      transaction_amount: amount,
      date_created: this.mpDate(date),
      date_approved: status === "approved" ? this.mpDate(date) : null,
      ...(opts.includePreapprovalId === false ? {} : { preapproval_id: preapprovalId }),
      ...(opts.includeExternalReference === false || !p.external_reference
        ? {}
        : { external_reference: p.external_reference }),
      ...(p.payer_email ? { payer: { id: String(p.payer_id ?? ""), email: p.payer_email } } : {}),
      ...(opts.extra ?? {}),
    });
    if (status === "approved" && p.summarized) {
      p.summarized.charged_quantity = (p.summarized.charged_quantity ?? 0) + 1;
      p.summarized.charged_amount = (p.summarized.charged_amount ?? 0) + amount;
      p.summarized.last_charged_date = this.mpDate(date);
      p.summarized.last_charged_amount = String(amount);
    }
    return pay;
  }

  // ── authorized_payments (topic subscription_authorized_payment) ────────────

  private nextAuthorizedPaymentId(): string {
    this.authorizedPaymentCounter += 1;
    return String(7_000_000_000 + this.authorizedPaymentCounter);
  }

  createAuthorizedPayment(partial: Partial<MpAuthorizedPayment> = {}): MpAuthorizedPayment {
    const id = partial.id ?? this.nextAuthorizedPaymentId();
    const nowStr = this.mpDate();
    const ap: MpAuthorizedPayment = {
      status: "processed",
      date_created: nowStr,
      last_modified: nowStr,
      ...partial,
      id,
    };
    this.authorizedPayments.set(id, ap);
    return clone(ap);
  }

  getAuthorizedPayment(id: string): MpAuthorizedPayment | undefined {
    const p = this.authorizedPayments.get(id);
    return p ? clone(p) : undefined;
  }

  /**
   * Simula el patron real observado en produccion: un cobro recurrente que ademas genera su
   * propio recurso "authorized_payment" (id distinto) referenciando el MISMO payment.id. MP
   * puede notificar `payment` y `subscription_authorized_payment` para el mismo cobro.
   */
  chargeRecurringWithAuthorizedPayment(
    preapprovalId: string,
    opts: Parameters<MpWorld["chargeRecurring"]>[1] = {}
  ): { payment: MpPayment; authorizedPayment: MpAuthorizedPayment } {
    const payment = this.chargeRecurring(preapprovalId, opts);
    const p = this.mustPreapproval(preapprovalId);
    const authorizedPayment = this.createAuthorizedPayment({
      preapproval_id: preapprovalId,
      external_reference: p.external_reference,
      transaction_amount: payment.transaction_amount,
      date_created: payment.date_created,
      last_modified: payment.date_last_updated ?? payment.date_created,
      payment: { id: String(payment.id), status: payment.status, status_detail: payment.status_detail },
    });
    return { payment, authorizedPayment };
  }

  // ── inyeccion de fallos / respuestas ──────────────────────────────────────

  /**
   * Hace fallar la(s) proxima(s) llamada(s) a `api` (o "*"). `error` puede ser:
   *  - number  => mpError(status)  (ej: 500 = MP caido, 404 = no existe, 429 = rate limit)
   *  - string  => mpError(500, string)
   *  - un Error => se lanza tal cual (para probar la rama `instanceof Error`)
   *  - objeto  => se lanza tal cual (forma del SDK real: { message, error, status, cause })
   * Default: mpError(500).
   */
  failNext(api: MpApi | "*", error: number | string | object = 500, opts: MpFailOptions = {}): { readonly hits: number; cancel(): void } {
    const fail =
      typeof error === "number" ? mpError(error) : typeof error === "string" ? mpError(500, error) : error;
    const rule: Rule = { api, remaining: opts.times ?? 1, opts, hits: 0, cancelled: false, fail };
    this.rules.push(rule);
    return {
      get hits() {
        return rule.hits;
      },
      cancel() {
        rule.cancelled = true;
      },
    };
  }

  /**
   * La proxima llamada a `api` recibe `response` (o lo que devuelva la funcion a partir del estado
   * actual) en vez del estado real del mundo. Sirve para simular lecturas VIEJAS / desordenadas:
   * MP notifica el evento N pero el GET ya devuelve el estado N+1 (o al reves).
   */
  respondNext(
    api: MpApi,
    response: object | ((current: unknown, call: MpCall) => unknown),
    opts: MpFailOptions = {}
  ): { readonly hits: number; cancel(): void } {
    const respond: (current: unknown, call: MpCall) => unknown =
      typeof response === "function"
        ? (response as (current: unknown, call: MpCall) => unknown)
        : () => response;
    const rule: Rule = {
      api,
      remaining: opts.times ?? 1,
      opts,
      hits: 0,
      cancelled: false,
      respond,
    };
    this.rules.push(rule);
    return {
      get hits() {
        return rule.hits;
      },
      cancel() {
        rule.cancelled = true;
      },
    };
  }

  clearRules(): void {
    this.rules = [];
  }

  // ── llamadas / contadores ─────────────────────────────────────────────────

  callsTo(api: MpApi): MpCall[] {
    return this.calls.filter((c) => c.api === api);
  }

  count(api: MpApi): number {
    return this.callsTo(api).length;
  }

  /** Contadores por API: { "preapproval.get": 2, ... } */
  get counts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const c of this.calls) out[c.api] = (out[c.api] ?? 0) + 1;
    return out;
  }

  reset(): void {
    this.preapprovals.clear();
    this.payments.clear();
    this.authorizedPayments.clear();
    this.calls = [];
    this.rules = [];
    this.idCounter = 0;
    this.paymentCounter = 0;
    this.authorizedPaymentCounter = 0;
    this.callSeq = 0;
    this.requireAccessToken = this.options.requireAccessToken !== false;
    this.validAccessToken = this.options.validAccessToken;
    this.requireHttpsBackUrl = false;
  }

  // ── internals usados por la fabrica del modulo ────────────────────────────

  /** @internal */
  _enter(api: MpApi, args: unknown, accessToken: string | undefined): { call: MpCall; override?: (current: unknown, call: MpCall) => unknown } {
    this.callSeq += 1;
    const call: MpCall = { seq: this.callSeq, api, args: clone(args ?? null), accessToken, at: this.now() };
    this.calls.push(call);

    if (this.requireAccessToken && (!accessToken || !String(accessToken).trim() || accessToken === "undefined")) {
      call.error = mpError(401, "invalid access token");
      throw call.error;
    }
    if (this.validAccessToken !== undefined && accessToken !== this.validAccessToken) {
      call.error = mpError(401, "invalid access token");
      throw call.error;
    }
    for (const r of this.rules) {
      if (r.cancelled || r.remaining <= 0) continue;
      if (r.api !== "*" && r.api !== api) continue;
      if (r.opts.when && !r.opts.when(call)) continue;
      r.remaining -= 1;
      r.hits += 1;
      if (r.fail !== undefined) {
        call.error = r.fail;
        throw r.fail;
      }
      if (r.respond) return { call, override: r.respond };
    }
    return { call };
  }

  /** @internal */
  _validateCreate(body: Record<string, unknown>): void {
    const missing: string[] = [];
    if (!body.reason) missing.push("reason");
    if (!body.payer_email) missing.push("payer_email");
    if (!body.back_url) missing.push("back_url");
    const ar = body.auto_recurring as Record<string, unknown> | undefined;
    if (!ar) missing.push("auto_recurring");
    else {
      for (const k of ["frequency", "frequency_type", "transaction_amount", "currency_id"]) {
        if (ar[k] === undefined || ar[k] === null) missing.push(`auto_recurring.${k}`);
      }
    }
    if (missing.length) {
      throw mpError(400, `Invalid request: missing or invalid fields: ${missing.join(", ")}`, "bad_request", missing.map((m) => ({ code: "invalid_field", description: m })));
    }
    if (this.requireHttpsBackUrl && !String(body.back_url).startsWith("https://")) {
      throw mpError(400, "back_url must be a valid https url", "bad_request");
    }
    const amount = Number((ar as Record<string, unknown>).transaction_amount);
    if (!(amount > 0)) throw mpError(400, "transaction_amount must be greater than 0", "bad_request");
  }
}

export function createMpWorld(opts?: MpWorldOptions): MpWorld {
  return new MpWorld(opts);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fabrica del modulo "mercadopago"
// ─────────────────────────────────────────────────────────────────────────────

const apiResponse = (status = 200) => ({ status, headers: { "content-type": ["application/json"] } });

/**
 * Devuelve el "modulo" para `vi.mock("mercadopago", ...)`: { MercadoPagoConfig, PreApproval, Payment, default }.
 * `getWorld` se evalua en CADA llamada (permite que el mundo se reinicie entre tests).
 */
export function createMercadoPagoModule(getWorld: () => MpWorld) {
  class MercadoPagoConfig {
    accessToken: string;
    options?: Record<string, unknown>;
    constructor(config: { accessToken: string; options?: Record<string, unknown> }) {
      this.accessToken = config?.accessToken;
      this.options = config?.options;
    }
  }

  /** Aplica override (respondNext) si la regla lo pidio. */
  const settle = <T>(entered: { call: MpCall; override?: (current: unknown, call: MpCall) => unknown }, current: T): T =>
    entered.override ? (entered.override(current, entered.call) as T) : current;

  class PreApproval {
    private config: MercadoPagoConfig;
    constructor(config: MercadoPagoConfig) {
      this.config = config;
    }

    async create({ body }: { body: Record<string, unknown>; requestOptions?: unknown }) {
      const w = getWorld();
      const entered = w._enter("preapproval.create", { body }, this.config?.accessToken);
      w._validateCreate(body);
      const ar = body.auto_recurring as MpAutoRecurring;
      const created = w.createPreapproval({
        status: (body.status as string | undefined) ?? "pending",
        reason: body.reason as string,
        external_reference: body.external_reference as string | undefined,
        payer_email: body.payer_email as string,
        back_url: body.back_url as string,
        auto_recurring: { ...ar },
      });
      const out = settle(entered, { ...created, api_response: apiResponse(201) });
      return out;
    }

    async get({ id }: { id: string; requestOptions?: unknown }) {
      const w = getWorld();
      const entered = w._enter("preapproval.get", { id }, this.config?.accessToken);
      const p = w.getPreapproval(String(id));
      if (!p) throw mpError(404, `Preapproval with id ${id} not found`, "not_found");
      return settle(entered, { ...p, api_response: apiResponse() });
    }

    async update({ id, body }: { id: string; body: Record<string, unknown>; requestOptions?: unknown }) {
      const w = getWorld();
      const entered = w._enter("preapproval.update", { id, body }, this.config?.accessToken);
      const p = w.getPreapproval(String(id));
      if (!p) throw mpError(404, `Preapproval with id ${id} not found`, "not_found");
      const patch: Partial<MpPreapproval> = {};
      for (const k of ["reason", "external_reference", "payer_email", "back_url"] as const) {
        if (body[k] !== undefined) (patch as Record<string, unknown>)[k] = body[k];
      }
      const ar = body.auto_recurring as Partial<MpAutoRecurring> | undefined;
      if (ar) patch.auto_recurring = { ...p.auto_recurring, ...ar };
      w.patchPreapproval(String(id), patch);
      const updated =
        typeof body.status === "string" ? w.setPreapprovalStatus(String(id), body.status) : w.getPreapproval(String(id))!;
      return settle(entered, { ...updated, api_response: apiResponse() });
    }

    async search(data: { options?: Record<string, unknown>; requestOptions?: unknown } = {}) {
      const w = getWorld();
      const entered = w._enter("preapproval.search", data, this.config?.accessToken);
      const o = data.options ?? {};
      let results = [...w.preapprovals.values()].map((p) => clone(p));
      if (o.status) results = results.filter((p) => p.status === o.status);
      if (o.payer_email) results = results.filter((p) => p.payer_email === o.payer_email);
      if (o.external_reference) results = results.filter((p) => p.external_reference === o.external_reference);
      if (o.q) {
        const q = String(o.q).toLowerCase();
        results = results.filter((p) =>
          [p.id, p.payer_email, p.external_reference, p.reason].some((v) => String(v ?? "").toLowerCase().includes(q))
        );
      }
      const total = results.length;
      const offset = Number(o.offset ?? 0);
      const limit = Number(o.limit ?? 50);
      results = results.slice(offset, offset + limit);
      return settle(entered, { paging: { offset, limit, total }, results, api_response: apiResponse() });
    }
  }

  class Payment {
    private config: MercadoPagoConfig;
    constructor(config: MercadoPagoConfig) {
      this.config = config;
    }

    async get({ id }: { id: string | number; requestOptions?: unknown }) {
      const w = getWorld();
      const entered = w._enter("payment.get", { id }, this.config?.accessToken);
      const p = w.getPayment(id);
      if (!p) throw mpError(404, `Payment not found`, "not_found");
      return settle(entered, { ...p, api_response: apiResponse() });
    }

    async search(data: { options?: Record<string, unknown>; requestOptions?: unknown } = {}) {
      const w = getWorld();
      const entered = w._enter("payment.search", data, this.config?.accessToken);
      const o = data.options ?? {};
      let results = [...w.payments.values()].map((p) => clone(p));
      if (o.external_reference) results = results.filter((p) => p.external_reference === o.external_reference);
      if (o.status) results = results.filter((p) => p.status === o.status);
      if (o.preapproval_id) results = results.filter((p) => p.preapproval_id === o.preapproval_id);
      const total = results.length;
      const offset = Number(o.offset ?? 0);
      const limit = Number(o.limit ?? 30);
      results = results.slice(offset, offset + limit);
      return settle(entered, { paging: { total, limit, offset }, results, api_response: apiResponse() });
    }
  }

  class Invoice {
    private config: MercadoPagoConfig;
    constructor(config: MercadoPagoConfig) {
      this.config = config;
    }

    async get({ id }: { id: string; requestOptions?: unknown }) {
      const w = getWorld();
      const entered = w._enter("invoice.get", { id }, this.config?.accessToken);
      const p = w.getAuthorizedPayment(String(id));
      if (!p) throw mpError(404, `Invoice with id ${id} not found`, "not_found");
      return settle(entered, { ...p, api_response: apiResponse() });
    }
  }

  return { MercadoPagoConfig, PreApproval, Payment, Invoice, default: MercadoPagoConfig };
}
