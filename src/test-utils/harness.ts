/**
 * harness.ts — pega todo el test-utils y documenta el patron de `vi.mock` para probar los route
 * handlers REALES (webhook, checkout, callback, ...) contra fakes en memoria.
 *
 * POR QUE cada test debe declarar sus vi.mock:
 *   `vi.mock(...)` se HOISTEA por archivo (Vitest lo mueve al principio del modulo de test), por lo que
 *   no se puede encapsular en una funcion importada. Lo que SI se puede reutilizar son las fabricas
 *   (adminMock(), serverMock(), mercadopagoMock(), ...) que devuelve este archivo. La fabrica del mock
 *   hace `await import("@/test-utils/harness")` para leer el estado ACTUAL del harness en cada llamada.
 *
 * ── EJEMPLO CANONICO (copiar/pegar como encabezado de un test) ─────────────────────────────────────
 *
 *   import { describe, it, expect, vi } from "vitest";
 *   import { installHarness, TEST_USER_ID } from "@/test-utils/harness";
 *   import { buildWebhookRequest } from "@/test-utils/mp-webhook";
 *
 *   // 1) Mocks: SIEMPRE literales en el archivo de test, ANTES de importar la ruta.
 *   vi.mock("@/lib/supabase/admin", async () => (await import("@/test-utils/harness")).adminMock());
 *   vi.mock("@/lib/supabase/server", async () => (await import("@/test-utils/harness")).serverMock());
 *   vi.mock("mercadopago", async () => (await import("@/test-utils/harness")).mercadopagoMock());
 *   // (opcional) vi.mock("@/lib/rate-limit", async () => (await import("@/test-utils/harness")).rateLimitMock());
 *
 *   // 2) Importar la ruta REAL (los imports estaticos se ejecutan despues de los vi.mock hoisteados).
 *   import { POST } from "@/app/api/webhooks/mp/route";
 *
 *   // 3) Instalar el harness: registra beforeEach/afterEach (estado limpio + env de prueba + red bloqueada).
 *   const t = installHarness();
 *
 *   describe("webhook", () => {
 *     it("preapproval authorized crea la suscripcion", async () => {
 *       const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
 *       const res = await POST(buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id }));
 *       expect(res.status).toBe(200);
 *       expect(t.db.dump("subscriptions")).toHaveLength(1);
 *     });
 *   });
 *
 * IMPORTANTE:
 *  - Usa `t.db`, `t.mp`, `t.server` DENTRO de los tests (son getters al estado vigente).
 *  - No uses `vi.resetModules()` (crearia otra instancia de este modulo y perderias el estado compartido).
 *  - No importes la ruta/app dentro de este archivo (evita imports circulares con los mocks).
 *  - Llama a installHarness() UNA sola vez por archivo de test.
 */

import { afterEach, beforeEach, vi } from "vitest";
import {
  ADMIN_USER_ID,
  OTHER_USER_ID,
  TEST_USER_ID,
  createFakeDb,
  makeUser,
  type FakeDb,
  type FakeDbOptions,
  type FakeUser,
  type Row,
} from "./fake-supabase";
import { createFakeServerClient, type FakeServerClient } from "./fake-supabase-server";
import { MpWorld, createMercadoPagoModule, type MpWorldOptions } from "./mp-mock";
import { TEST_MP_ACCESS_TOKEN, TEST_WEBHOOK_SECRET } from "./mp-webhook";

export { ADMIN_USER_ID, OTHER_USER_ID, TEST_USER_ID, TEST_MP_ACCESS_TOKEN, TEST_WEBHOOK_SECRET };

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface HarnessOptions {
  /** Opciones de createFakeDb (unique, interleave, tablas...). */
  db?: FakeDbOptions;
  /** Opciones del mundo de Mercado Pago. */
  mp?: MpWorldOptions;
  /** Usuario logueado al comienzo de cada test (default: null = anonimo). */
  user?: FakeUser | null;
  /** Emular RLS en el cliente server (default true). */
  rls?: boolean | { adminSchema?: boolean };
  /** Secret del webhook (default TEST_WEBHOOK_SECRET). */
  webhookSecret?: string;
  /** Access token de MP (default TEST_MP_ACCESS_TOKEN). */
  mpAccessToken?: string;
  /** Variables de entorno extra por test (undefined = borrar). Se restauran solas. */
  env?: Record<string, string | undefined>;
  /** Silenciar console.log/info/warn/error (default true). Los mensajes quedan en t.logs. */
  silenceConsole?: boolean;
}

export interface CapturedLogs {
  log: unknown[][];
  info: unknown[][];
  warn: unknown[][];
  error: unknown[][];
  /** Todo junto, como texto (para `expect(t.logs.text()).toContain(...)`). */
  text(): string;
}

export interface RateLimitControl {
  /** true => isRateLimited() devuelve true. Funcion => decide por key. */
  limited: boolean | ((key: string) => boolean);
  calls: Array<{ key: string; limit: number; windowSec: number }>;
}

export interface Harness {
  /** Fake DB (service_role). */
  readonly db: FakeDb;
  /** Mundo falso de Mercado Pago. */
  readonly mp: MpWorld;
  /** Cliente "server" (createClient de @/lib/supabase/server) con el usuario actual. */
  readonly server: FakeServerClient;
  /** Secret del webhook vigente (== process.env.MP_WEBHOOK_SECRET durante el test). */
  readonly webhookSecret: string;
  readonly mpAccessToken: string;
  readonly rateLimit: RateLimitControl;
  readonly logs: CapturedLogs;

  /** Loguea a un usuario (email confirmado por defecto). Devuelve el usuario. */
  loginAs(overrides?: Partial<Omit<FakeUser, "app_metadata" | "user_metadata">> & {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  }): FakeUser;
  /** Deja al cliente server como anonimo. */
  logout(): void;

  /** Cambia una variable de entorno durante el test (undefined la borra). Se restaura en afterEach. */
  setEnv(name: string, value: string | undefined): void;

  /**
   * Congela `Date` en `date` (usa vi.useFakeTimers({toFake:["Date"]}); NO fakea setTimeout, asi que
   * `await` y timers reales siguen funcionando). El fake DB, el mundo MP y las rutas ven ese "ahora".
   */
  setNow(date: Date | string | number): Date;
  /** Avanza el reloj (ms o { days, hours, minutes, months, years }). Si no estaba congelado, parte de "ahora". */
  advance(by: number | { days?: number; hours?: number; minutes?: number; months?: number; years?: number }): Date;
  /** Fecha actual (respeta el reloj congelado). */
  now(): Date;

  /** Hace que createAdminClient() LANCE (p.ej. falta SUPABASE_SERVICE_ROLE_KEY). undefined = arreglar. */
  breakAdminClient(error?: Error | null): void;
  /** Hace que createClient() (server) LANCE / rechace. undefined = arreglar. */
  breakServerClient(error?: Error | null): void;

  /** Vuelve al estado inicial (se llama solo en beforeEach). */
  reset(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado interno
// ─────────────────────────────────────────────────────────────────────────────

interface Internal {
  api: Harness;
  db: FakeDb;
  mp: MpWorld;
  server: FakeServerClient;
  rateLimit: RateLimitControl;
  adminError: Error | null;
  serverError: Error | null;
}

let currentHarness: Internal | null = null;

function current(): Internal {
  if (!currentHarness) {
    throw new Error(
      "[test-utils/harness] installHarness() no fue llamado en este archivo de test (o se uso vi.resetModules()). " +
        "Llamalo a nivel de modulo: const t = installHarness();"
    );
  }
  return currentHarness;
}

// ─────────────────────────────────────────────────────────────────────────────
// installHarness
// ─────────────────────────────────────────────────────────────────────────────

const CONSOLE_METHODS = ["log", "info", "warn", "error"] as const;

export function installHarness(opts: HarnessOptions = {}): Harness {
  const webhookSecret = opts.webhookSecret ?? TEST_WEBHOOK_SECRET;
  const mpAccessToken = opts.mpAccessToken ?? TEST_MP_ACCESS_TOKEN;

  const db = createFakeDb(opts.db);
  const mp = new MpWorld(opts.mp);
  const server = createFakeServerClient(db, { user: opts.user ?? null, rls: opts.rls });
  const rateLimit: RateLimitControl = { limited: false, calls: [] };
  const logs: CapturedLogs = {
    log: [],
    info: [],
    warn: [],
    error: [],
    text() {
      return [...logs.log, ...logs.info, ...logs.warn, ...logs.error]
        .map((args) => args.map((a) => (typeof a === "string" ? a : safeJson(a))).join(" "))
        .join("\n");
    },
  };

  const savedEnv = new Map<string, string | undefined>();
  let fakeTimersOn = false;
  const consoleSpies: Array<{ mockRestore(): void }> = [];

  const setEnv = (name: string, value: string | undefined) => {
    if (!savedEnv.has(name)) savedEnv.set(name, process.env[name]);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };

  const restoreEnv = () => {
    for (const [k, v] of savedEnv) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    savedEnv.clear();
  };

  const setNow = (date: Date | string | number): Date => {
    const d = new Date(date);
    if (!fakeTimersOn) {
      vi.useFakeTimers({ toFake: ["Date"] });
      fakeTimersOn = true;
    }
    vi.setSystemTime(d);
    return d;
  };

  const internal: Internal = {
    api: undefined as unknown as Harness,
    db,
    mp,
    server,
    rateLimit,
    adminError: null,
    serverError: null,
  };

  const api: Harness = {
    get db() {
      return internal.db;
    },
    get mp() {
      return internal.mp;
    },
    get server() {
      return internal.server;
    },
    webhookSecret,
    mpAccessToken,
    rateLimit,
    logs,
    loginAs(overrides = {}) {
      const user = makeUser(overrides, new Date());
      db.seedUsers(user);
      internal.server.setUser(user);
      return user;
    },
    logout() {
      internal.server.setUser(null);
    },
    setEnv,
    setNow,
    advance(by) {
      const base = fakeTimersOn ? new Date() : setNow(new Date());
      const next = new Date(base);
      if (typeof by === "number") next.setTime(next.getTime() + by);
      else {
        if (by.years) next.setUTCFullYear(next.getUTCFullYear() + by.years);
        if (by.months) next.setUTCMonth(next.getUTCMonth() + by.months);
        next.setTime(
          next.getTime() +
            (by.days ?? 0) * 86_400_000 +
            (by.hours ?? 0) * 3_600_000 +
            (by.minutes ?? 0) * 60_000
        );
      }
      vi.setSystemTime(next);
      return next;
    },
    now() {
      return new Date();
    },
    breakAdminClient(error = new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. (simulado)")) {
      internal.adminError = error;
    },
    breakServerClient(error = new Error("cookies() no disponible (simulado)")) {
      internal.serverError = error;
    },
    reset() {
      db.reset();
      mp.reset();
      server.reset();
      rateLimit.limited = false;
      rateLimit.calls = [];
      internal.adminError = null;
      internal.serverError = null;
      logs.log = [];
      logs.info = [];
      logs.warn = [];
      logs.error = [];
    },
  };
  internal.api = api;

  const applyEnv = () => {
    setEnv("MP_WEBHOOK_SECRET", webhookSecret);
    setEnv("MP_ACCESS_TOKEN", mpAccessToken);
    for (const [k, v] of Object.entries(opts.env ?? {})) setEnv(k, v);
  };

  currentHarness = internal;
  applyEnv();

  beforeEach(() => {
    currentHarness = internal;
    api.reset();
    applyEnv();
    if (opts.silenceConsole !== false) {
      for (const m of CONSOLE_METHODS) {
        const spy = vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
          logs[m].push(args);
        });
        consoleSpies.push(spy);
      }
    }
  });

  afterEach(() => {
    for (const s of consoleSpies.splice(0)) s.mockRestore();
    if (fakeTimersOn) {
      vi.useRealTimers();
      fakeTimersOn = false;
    }
    restoreEnv();
  });

  return api;
}

function safeJson(v: unknown): string {
  try {
    return typeof v === "object" ? JSON.stringify(v) : String(v);
  } catch {
    return String(v);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fabricas de mocks (para usar dentro de vi.mock(..., async () => ...))
// ─────────────────────────────────────────────────────────────────────────────

/** vi.mock("@/lib/supabase/admin", async () => (await import("@/test-utils/harness")).adminMock()) */
export function adminMock() {
  return {
    createAdminClient: vi.fn(() => {
      const h = current();
      if (h.adminError) throw h.adminError;
      return h.db.adminClient();
    }),
  };
}

/** vi.mock("@/lib/supabase/server", async () => (await import("@/test-utils/harness")).serverMock()) */
export function serverMock() {
  return {
    createClient: vi.fn(async () => {
      const h = current();
      if (h.serverError) throw h.serverError;
      return h.server;
    }),
  };
}

/** vi.mock("@/lib/supabase/client", ...) — cliente de NAVEGADOR (paginas login/registro/recuperar). Mismo fake. */
export function browserClientMock() {
  return {
    createClient: vi.fn(() => current().server),
  };
}

/**
 * vi.mock("@supabase/ssr", ...) — para probar src/proxy.ts. createServerClient devuelve el cliente fake y
 * captura el adaptador de cookies en `t.server.cookieAdapter` (usar `t.server.simulateSetCookies([...])`).
 */
export function ssrMock() {
  return {
    createServerClient: vi.fn((_url: string, _key: string, options?: { cookies?: unknown }) => {
      const s = current().server;
      s.cookieAdapter = (options?.cookies as FakeServerClient["cookieAdapter"]) ?? null;
      return s;
    }),
    createBrowserClient: vi.fn(() => current().server),
  };
}

/** vi.mock("mercadopago", async () => (await import("@/test-utils/harness")).mercadopagoMock()) */
export function mercadopagoMock() {
  return createMercadoPagoModule(() => current().mp);
}

/**
 * vi.mock("@/lib/rate-limit", ...) (opcional). Reemplaza isRateLimited por un control manual:
 * `t.rateLimit.limited = true`. Si NO se mockea, corre el rate-limit real sobre la tabla rate_limits del fake DB.
 */
export function rateLimitMock() {
  return {
    isRateLimited: vi.fn(async (key: string, limit: number, windowSec: number) => {
      const rl = current().rateLimit;
      rl.calls.push({ key, limit, windowSec });
      return typeof rl.limited === "function" ? rl.limited(key) : rl.limited;
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fila de `subscriptions` con defaults sensatos: active, monthly, periodo hasta +1 mes desde `now`.
 * Pasa `current_period_end: null` para sin fecha. Devuelve el objeto a pasar a `t.db.seed("subscriptions", ...)`.
 */
export function makeSubscriptionRow(overrides: Row = {}, now: Date = new Date()): Row {
  const end = new Date(now);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return {
    user_id: TEST_USER_ID,
    status: "active",
    plan: "monthly",
    mp_subscription_id: null,
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
    ...overrides,
  };
}
