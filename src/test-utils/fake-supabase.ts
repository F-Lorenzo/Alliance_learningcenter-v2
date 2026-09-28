/**
 * fake-supabase.ts — base de datos EN MEMORIA que imita el subset de supabase-js / PostgREST
 * que usa este repo (grep de todos los `.from(`, `.rpc(`, `.auth.` en src/).
 *
 * Cubre: from(table).select/insert/update/upsert/delete + eq neq gt gte lt lte like ilike is in not
 * match order limit range single maybeSingle throwOnError, select(cols,{count,head}), rpc(),
 * auth.admin.{updateUserById,listUsers,getUserById,createUser,deleteUser} (espias vi.fn).
 *
 * Fidelidad que IMPORTA para los bugs de compra/suscripcion (verificado contra el codigo de
 * @supabase/postgrest-js 2.105.0 instalado):
 *  - maybeSingle(): 0 filas => {data:null,error:null}; 2+ filas => {data:null, error:{code:"PGRST116"},
 *    status:406}. El codigo de la app suele IGNORAR `error` y ve `data === null` como "no existe".
 *  - single(): 0 o 2+ filas => error PGRST116 (en mutaciones se hace ROLLBACK).
 *  - upsert(row,{onConflict, ignoreDuplicates:true}) + conflicto => 0 filas devueltas y SIN error.
 *  - insert/update/delete sin .select() => data:null. update que no matchea nada => sin error.
 *  - UNIQUE configurables (webhook_events.event_id unique; subscriptions SIN unique, como el schema).
 *  - timestamptz se devuelve normalizado como PostgREST: "2025-02-10T12:00:00+00:00".
 *  - ILIKE con % y _ como comodines (un cupon "%" matchea todos; "_" matchea 1 caracter).
 *  - Orden: DESC => NULLS FIRST, ASC => NULLS LAST (defaults de Postgres). Empates se rompen por
 *    orden de insercion (en la direccion del orden).
 *
 * NO cubre (lanza error explicito): selects con relaciones anidadas `tabla(cols)` / `alias:tabla!inner(..)`,
 * .or(), .filter(), .textSearch(), .contains(), columnas JSON `a->b`.
 */

import { vi, type MockedFunction } from "vitest";
import {
  detectPolicyRecursion,
  rlsEnabledFor,
  rowPassesUsing,
  rowPassesWithCheck,
  type RlsContext,
  type RlsSession,
  type Row,
} from "./rls";

export type { Row, RlsSession } from "./rls";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos publicos
// ─────────────────────────────────────────────────────────────────────────────

export type FakeOp = "select" | "insert" | "update" | "delete" | "upsert" | "rpc";
export type FailOp = FakeOp | "*";

/** Forma de los errores de PostgREST tal como los devuelve supabase-js (objeto plano). */
export interface PgError {
  message: string;
  details: string | null;
  hint: string | null;
  code: string;
}

export type ErrorInput = string | Error | Partial<PgError>;

export interface FakeResult<T = unknown> {
  data: T;
  error: PgError | null;
  count: number | null;
  status: number;
  statusText: string;
}

export interface FilterRecord {
  op: string;
  column: string;
  value: unknown;
}

export interface CallRecord {
  /** Numero de orden de EJECUCION (1-based). */
  seq: number;
  /** Nombre de la tabla (o de la funcion si op === "rpc"). */
  table: string;
  op: FakeOp;
  filters: FilterRecord[];
  /** Payload de insert/update/upsert (tal cual lo paso la app) o args del rpc. */
  values?: unknown;
  /** Opciones (onConflict, ignoreDuplicates, count, head...). */
  options?: Record<string, unknown>;
  columns?: string;
  order: Array<{ column: string; ascending: boolean }>;
  limit?: number;
  range?: [number, number];
  single: "single" | "maybeSingle" | null;
  role: RlsSession["role"];
  userId: string | null;
  /** Se completa cuando la llamada termina. */
  result?: { rows: number; error: PgError | null };
}

export type UniqueSpec = string | string[];

export interface DefaultCtx {
  now: Date;
}

export interface TableConfig {
  /** "uuid" (default para tablas desconocidas): genera `id` determinista. "serial": 1,2,3.. "none": sin id. */
  idKind?: "uuid" | "serial" | "none";
  /** Constraints UNIQUE (ademas de la PK `id`). Cada item = una columna o una lista (compuesto). */
  unique?: UniqueSpec[];
  /** Columnas NOT NULL (insert con null/undefined => error 23502 tras aplicar defaults). */
  notNull?: string[];
  /** Valores por defecto en INSERT (valor literal o funcion). */
  defaults?: Record<string, unknown>;
  /** Columnas extra tratadas como timestamptz (ademas de la heuristica por nombre). */
  timestampColumns?: string[];
}

export interface InterleaveInfo {
  table: string;
  op: FakeOp;
  phase: "before" | "after";
  seq: number;
}
export type InterleaveHook = (info: InterleaveInfo) => Promise<void> | void;

export interface FakeDbOptions {
  /** Reloj inyectable. Default: `() => new Date()` (respeta vi.setSystemTime / vi.useFakeTimers). */
  now?: () => Date;
  /**
   * Constraints UNIQUE por tabla. REEMPLAZA la lista de esa tabla (las demas conservan sus defaults).
   * Ej: createFakeDb({ unique: { webhook_events: ["event_id"], subscriptions: ["user_id"] } }).
   * Default: los del schema real (webhook_events.event_id, coupons.code, progress(user_id,lesson_id), ...)
   * y NADA en subscriptions.
   */
  unique?: Record<string, UniqueSpec[]>;
  /** Config completa por tabla (se mezcla sobre los defaults del repo). */
  tables?: Record<string, TableConfig>;
  /**
   * Fuerza entrelazado asincrono entre operaciones concurrentes: antes y despues de CADA operacion
   * se cede el control. `true` = 2 cesiones (microtareas); number = esa cantidad; funcion = hook propio
   * (ver randomInterleave). Usa SOLO microtareas: es seguro con vi.useFakeTimers().
   */
  interleave?: boolean | number | InterleaveHook;
  /** Normalizar timestamptz a formato PostgREST (default true). */
  normalizeTimestamps?: boolean;
  /** Usar los defaults de tablas del repo (default true). */
  repoDefaults?: boolean;
}

export interface FailureOptions {
  /** Cuantas veces fallar (default 1). Infinity = siempre hasta cancel(). */
  times?: number;
  /** Solo falla si el predicado devuelve true para la llamada. */
  when?: (call: CallRecord) => boolean;
  /** true => la promesa RECHAZA (excepcion) en vez de devolver {error}. */
  reject?: boolean;
  /**
   * true => la operacion SE APLICA en la DB pero el cliente recibe error (respuesta perdida /
   * timeout despues del commit). Util para probar reintentos e idempotencia.
   */
  applyBeforeFail?: boolean;
}

export interface FailureHandle {
  readonly hits: number;
  cancel(): void;
}

export interface HoldOptions {
  /** En que fase pausar: "before" = antes de tocar la DB (default); "after" = ya aplicada pero sin responder. */
  phase?: "before" | "after";
  /** Solo pausa la primera llamada que cumpla el predicado. */
  when?: (call: CallRecord) => boolean;
}

export interface Hold {
  /** Se resuelve cuando una llamada que matchea llego al punto de pausa. */
  readonly reached: Promise<CallRecord>;
  /** Reanuda la llamada pausada. Si se llama antes de que llegue, la llamada pasa sin pausar. */
  release(): void;
  readonly triggered: boolean;
  readonly released: boolean;
}

export type RpcHandler = (
  args: Record<string, unknown>,
  ctx: { db: FakeDb; session: RlsSession }
) => unknown | Promise<unknown>;

export interface FakeUser {
  id: string;
  aud?: string;
  role?: string;
  email?: string;
  email_confirmed_at?: string | null;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  identities?: unknown[];
}

export const TEST_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const OTHER_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const ADMIN_USER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/** Crea un usuario de Supabase Auth de prueba (email confirmado por defecto). */
export function makeUser(
  overrides: Partial<Omit<FakeUser, "app_metadata" | "user_metadata">> & {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  } = {},
  now: Date = new Date()
): FakeUser {
  const { app_metadata, user_metadata, ...rest } = overrides;
  return {
    id: TEST_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "cliente@example.com",
    email_confirmed_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    app_metadata: { provider: "email", providers: ["email"], ...(app_metadata ?? {}) },
    user_metadata: { ...(user_metadata ?? {}) },
    ...rest,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Config de tablas del repo (transcripcion de los .sql)
// ─────────────────────────────────────────────────────────────────────────────

const NOW = (d: DefaultCtx) => d.now;

export const REPO_TABLES: Record<string, TableConfig> = {
  // supabase-schema.sql: id = auth.users.id (lo provee quien inserta)
  profiles: { idKind: "none", unique: ["id"], notNull: ["id"], defaults: { created_at: NOW } },
  // supabase-schema.sql: SIN unique en user_id ni en mp_subscription_id (H6)
  subscriptions: {
    idKind: "uuid",
    notNull: ["user_id", "status", "plan"],
    defaults: {
      status: "inactive",
      plan: "monthly",
      mp_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      created_at: NOW,
      updated_at: NOW,
    },
  },
  // create-webhook-events-table.sql
  webhook_events: {
    idKind: "uuid",
    unique: ["event_id"],
    notNull: ["event_id", "type", "status"],
    defaults: {
      status: "pending",
      payload: null,
      error_message: null,
      processed_at: null,
      created_at: NOW,
    },
  },
  // create-rate-limits-table.sql (bigserial)
  rate_limits: { idKind: "serial", notNull: ["user_id"], defaults: { created_at: NOW } },
  // create-coupons-table.sql
  coupons: {
    idKind: "uuid",
    unique: ["code"],
    notNull: ["code", "discount_type", "discount_value", "applicable_plan", "current_uses", "is_active"],
    defaults: {
      description: null,
      applicable_plan: "all",
      max_uses: null,
      current_uses: 0,
      valid_from: null,
      valid_until: null,
      is_active: true,
      created_at: NOW,
      updated_at: NOW,
    },
  },
  categories: { idKind: "uuid", unique: ["slug"], notNull: ["name", "slug"], defaults: { sort_order: 0, created_at: NOW } },
  instructors: { idKind: "uuid", notNull: ["name"], defaults: { sort_order: 0, created_at: NOW } },
  courses: {
    idKind: "uuid",
    unique: ["slug"],
    notNull: ["slug", "title"],
    defaults: {
      total_duration: 0,
      is_free: false,
      is_published: false,
      is_new: false,
      is_featured: false,
      created_at: NOW,
      updated_at: NOW,
    },
  },
  course_categories: { idKind: "none", unique: [["course_id", "category_id"]] },
  lessons: {
    idKind: "uuid",
    unique: [["course_id", "slug"]],
    notNull: ["course_id", "slug", "title"],
    defaults: { duration: 0, video_url: null, is_free: false, sort_order: 0, created_at: NOW },
  },
  progress: {
    idKind: "uuid",
    unique: [["user_id", "lesson_id"]],
    notNull: ["user_id", "lesson_id"],
    defaults: { watched_seconds: 0, completed: false, last_watched_at: NOW },
  },
  favorites: { idKind: "none", unique: [["user_id", "course_id"]], defaults: { created_at: NOW } },
  notes: { idKind: "uuid", notNull: ["user_id", "lesson_id", "text"], defaults: { timestamp_seconds: 0, created_at: NOW } },
  lesson_notes: {
    idKind: "uuid",
    notNull: ["user_id", "lesson_id", "text", "timestamp_sec"],
    defaults: { timestamp_sec: 0, created_at: NOW },
  },
  // Usada por proxy.ts / admin actions pero NO creada por ningun .sql del repo.
  admins: { idKind: "none", unique: ["user_id"], notNull: ["user_id"] },
};

/** Config para tablas no declaradas: id uuid + created_at. */
const UNKNOWN_TABLE: TableConfig = { idKind: "uuid", defaults: { created_at: NOW } };

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades internas
// ─────────────────────────────────────────────────────────────────────────────

function pgError(message: string, code: string, details: string | null = null, hint: string | null = null): PgError {
  return { message, details, hint, code };
}

class PgThrow extends Error {
  constructor(
    public readonly pg: PgError,
    public readonly httpStatus = 400
  ) {
    super(pg.message);
  }
}

function toPgError(input: ErrorInput | undefined): PgError {
  if (input === undefined) return pgError("fake-supabase: injected failure", "XX000");
  if (typeof input === "string") return pgError(input, "XX000");
  if (input instanceof Error) {
    const anyErr = input as Error & Partial<PgError>;
    return pgError(anyErr.message, anyErr.code ?? "XX000", anyErr.details ?? null, anyErr.hint ?? null);
  }
  return {
    message: input.message ?? "fake-supabase: injected failure",
    details: input.details ?? null,
    hint: input.hint ?? null,
    code: input.code ?? "XX000",
  };
}

const jsonClone = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));
const deepClone = <T>(v: T): T => (v === undefined ? v : (structuredClone(v) as T));

const ISO_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?)?$/;

/** Formato de timestamptz que devuelve PostgREST: 2025-02-10T12:00:00+00:00 (fraccion sin ceros finales). */
export function toPgTimestamp(d: Date): string {
  const iso = d.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  const [main, frac] = iso.slice(0, -1).split(".");
  const f = (frac ?? "").replace(/0+$/, "");
  return `${main}${f ? "." + f : ""}+00:00`;
}

const TS_NAME_RE = /(_at|_start|_end)$/;
const TS_NAMES = new Set(["valid_from", "valid_until"]);

function sqlCompare(a: unknown, b: unknown): number | null {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  const sign = (n: number) => (n < 0 ? -1 : n > 0 ? 1 : 0);
  if (typeof a === "number" && typeof b === "number") return sign(a - b);
  if (typeof a === "number" && typeof b === "string" && b.trim() !== "" && !Number.isNaN(Number(b))) {
    return sign(a - Number(b));
  }
  if (typeof b === "number" && typeof a === "string" && a.trim() !== "" && !Number.isNaN(Number(a))) {
    return sign(Number(a) - b);
  }
  if (typeof a === "string" && typeof b === "string" && ISO_RE.test(a) && ISO_RE.test(b)) {
    const ta = Date.parse(a);
    const tb = Date.parse(b);
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return sign(ta - tb);
  }
  const sa = typeof a === "object" ? JSON.stringify(a) : String(a);
  const sb = typeof b === "object" ? JSON.stringify(b) : String(b);
  return sa === sb ? 0 : sa < sb ? -1 : 1;
}

function escapeRe(c: string): string {
  return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** LIKE/ILIKE de Postgres: % = cualquier cadena, _ = un caracter, \ escapa. (`*` tambien, alias de PostgREST.) */
function likeToRegex(pattern: string, caseInsensitive: boolean): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\" && i + 1 < pattern.length) re += escapeRe(pattern[++i]);
    else if (c === "%" || c === "*") re += ".*";
    else if (c === "_") re += ".";
    else re += escapeRe(c);
  }
  return new RegExp(`^${re}$`, caseInsensitive ? "is" : "s");
}

type Tri = boolean | null; // null = NULL de SQL (la fila no pasa el WHERE)

function evalFilter(f: FilterRecord, data: Row): Tri {
  const col = data[f.column] === undefined ? null : data[f.column];
  const val = f.value;
  switch (f.op) {
    case "eq": {
      const c = sqlCompare(col, val);
      return c === null ? null : c === 0;
    }
    case "neq": {
      const c = sqlCompare(col, val);
      return c === null ? null : c !== 0;
    }
    case "gt": {
      const c = sqlCompare(col, val);
      return c === null ? null : c > 0;
    }
    case "gte": {
      const c = sqlCompare(col, val);
      return c === null ? null : c >= 0;
    }
    case "lt": {
      const c = sqlCompare(col, val);
      return c === null ? null : c < 0;
    }
    case "lte": {
      const c = sqlCompare(col, val);
      return c === null ? null : c <= 0;
    }
    case "like":
    case "ilike": {
      if (col === null) return null;
      return likeToRegex(String(val), f.op === "ilike").test(String(col));
    }
    case "in": {
      if (col === null) return null;
      const list = Array.isArray(val) ? val : [val];
      return list.some((v) => sqlCompare(col, v) === 0);
    }
    case "is": {
      if (val === null || val === "null") return col === null;
      if (val === true || val === "true") return col === true;
      if (val === false || val === "false") return col === false;
      return false;
    }
    default:
      throw new Error(`fake-supabase: operador de filtro no soportado: ${f.op}`);
  }
}

function matchFilters(filters: FilterRecord[], data: Row): boolean {
  for (const f of filters) {
    if (f.op === "not") {
      const inner = f.value as { operator: string; value: unknown };
      const r = evalFilter({ op: inner.operator, column: f.column, value: inner.value }, data);
      if (r !== false) return false; // NOT(true)=false; NOT(NULL)=NULL => no pasa
      continue;
    }
    if (evalFilter(f, data) !== true) return false;
  }
  return true;
}

interface ColumnSpec {
  star: boolean;
  cols: Array<{ out: string; col: string }>;
}

function parseColumns(spec: string | undefined): ColumnSpec {
  const s = (spec ?? "*").trim() || "*";
  if (s.includes("(")) {
    throw new Error(
      `fake-supabase: select con relaciones anidadas no soportado: "${s}". ` +
        "Usa consultas separadas o registra los datos ya unidos."
    );
  }
  const out: ColumnSpec = { star: false, cols: [] };
  for (const raw of s.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    if (part === "*") {
      out.star = true;
      continue;
    }
    const idx = part.indexOf(":");
    if (idx > 0 && !part.includes("::")) out.cols.push({ out: part.slice(0, idx).trim(), col: part.slice(idx + 1).trim() });
    else out.cols.push({ out: part, col: part });
  }
  return out;
}

function projectRow(data: Row, spec: ColumnSpec): Row {
  const out: Row = {};
  if (spec.star) Object.assign(out, deepClone(data));
  for (const { out: o, col } of spec.cols) out[o] = data[col] === undefined ? null : deepClone(data[col]);
  return out;
}

interface StoredRow {
  seq: number;
  data: Row;
}

function normalizeUnique(specs: UniqueSpec[] | undefined): string[][] {
  return (specs ?? []).map((s) => (Array.isArray(s) ? [...s] : [s]));
}

// ─────────────────────────────────────────────────────────────────────────────
// FakeDb
// ─────────────────────────────────────────────────────────────────────────────

interface FailureDef {
  table: string;
  op: FailOp;
  error: PgError;
  original?: ErrorInput;
  remaining: number;
  hits: number;
  opts: FailureOptions;
  cancelled: boolean;
}

interface HoldDef {
  table: string;
  op: FakeOp | "*";
  phase: "before" | "after";
  when?: (call: CallRecord) => boolean;
  triggered: boolean;
  released: boolean;
  resolveReached: (c: CallRecord) => void;
  gate: Promise<void>;
  openGate: () => void;
}

export class FakeDb {
  /** Registro de TODAS las llamadas ejecutadas, en orden de ejecucion. */
  calls: CallRecord[] = [];
  /** Usuarios de Supabase Auth (para auth.admin.*). */
  users = new Map<string, FakeUser>();
  /** Espias de auth.admin (updateUserById, listUsers, ...). */
  readonly auth: { admin: FakeAdminAuth };

  private tablesData = new Map<string, StoredRow[]>();
  private seqCounter = 0;
  private idCounter = 0;
  private serialCounters = new Map<string, number>();
  private callSeq = 0;
  private failures: FailureDef[] = [];
  private holds: HoldDef[] = [];
  private rpcHandlers = new Map<string, RpcHandler>();
  private interleaveCfg: InterleaveHook | null;
  private readonly clock: () => Date;
  private readonly configs: Record<string, TableConfig>;
  private readonly normalizeTs: boolean;
  private readonly opts: FakeDbOptions;

  constructor(opts: FakeDbOptions = {}) {
    this.opts = opts;
    this.clock = opts.now ?? (() => new Date());
    this.normalizeTs = opts.normalizeTimestamps !== false;
    this.configs = {};
    if (opts.repoDefaults !== false) {
      for (const [k, v] of Object.entries(REPO_TABLES)) this.configs[k] = { ...v };
    }
    for (const [k, v] of Object.entries(opts.tables ?? {})) this.configs[k] = { ...(this.configs[k] ?? {}), ...v };
    for (const [k, v] of Object.entries(opts.unique ?? {})) this.configs[k] = { ...(this.configs[k] ?? {}), unique: v };
    this.interleaveCfg = FakeDb.toInterleave(opts.interleave);
    this.auth = { admin: createAdminAuth(this) };
    this.installBuiltinRpcs();
  }

  // ── reloj / ids ───────────────────────────────────────────────────────────

  now(): Date {
    return this.clock();
  }

  /** uuid determinista: 00000000-0000-4000-8000-000000000001, ...002, ... */
  nextId(): string {
    this.idCounter += 1;
    return `00000000-0000-4000-8000-${String(this.idCounter).padStart(12, "0")}`;
  }

  // ── configuracion ─────────────────────────────────────────────────────────

  private static toInterleave(v: FakeDbOptions["interleave"]): InterleaveHook | null {
    if (!v) return null;
    if (typeof v === "function") return v;
    const n = v === true ? 2 : v;
    return async () => {
      for (let i = 0; i < n; i++) await Promise.resolve();
    };
  }

  /** Cambia el entrelazado en caliente (false para apagarlo). */
  setInterleave(v: FakeDbOptions["interleave"]): void {
    this.interleaveCfg = FakeDb.toInterleave(v);
  }

  /** Agrega/pisa constraints UNIQUE de una tabla. Ej: db.setUnique("subscriptions", ["user_id"]). */
  setUnique(table: string, specs: UniqueSpec[]): void {
    this.configs[table] = { ...(this.configs[table] ?? {}), unique: specs };
  }

  /** Mezcla config de una tabla (defaults, notNull, idKind, ...). */
  configureTable(table: string, cfg: TableConfig): void {
    this.configs[table] = { ...(this.configs[table] ?? {}), ...cfg };
  }

  /** Registra (o pisa) una funcion RPC. `handler` devuelve el `data`; para fallar lanza `rpcFail()`. */
  registerRpc(name: string, handler: RpcHandler): void {
    this.rpcHandlers.set(name, handler);
  }

  private installBuiltinRpcs(): void {
    // create-coupons-table.sql: UPDATE coupons SET current_uses = current_uses + 1, updated_at = now() WHERE id = coupon_id
    this.rpcHandlers.set("increment_coupon_uses", (args) => {
      const id = args.coupon_id;
      const row = this.rawRows("coupons").find((r) => r.data.id === id);
      if (row) {
        row.data.current_uses = (Number(row.data.current_uses) || 0) + 1;
        row.data.updated_at = this.tsOut(this.now());
      }
      return null; // RETURNS void
    });
  }

  // ── acceso directo a datos (no pasa por hooks / fallos / calls) ───────────

  private rawRows(table: string): StoredRow[] {
    let rows = this.tablesData.get(table);
    if (!rows) {
      rows = [];
      this.tablesData.set(table, rows);
    }
    return rows;
  }

  private cfg(table: string): TableConfig {
    return this.configs[table] ?? UNKNOWN_TABLE;
  }

  private uniqueSets(table: string): string[][] {
    const c = this.cfg(table);
    const sets = normalizeUnique(c.unique);
    const idKind = c.idKind ?? "uuid";
    if (idKind !== "none" && !sets.some((s) => s.length === 1 && s[0] === "id")) sets.unshift(["id"]);
    return sets;
  }

  private isTsColumn(table: string, col: string): boolean {
    return TS_NAME_RE.test(col) || TS_NAMES.has(col) || (this.cfg(table).timestampColumns ?? []).includes(col);
  }

  private tsOut(d: Date): string {
    return this.normalizeTs ? toPgTimestamp(d) : d.toISOString();
  }

  /** Fila (con defaults, normalizada) lista para guardar. Lanza PgThrow si viola NOT NULL / timestamps. */
  private buildRow(table: string, input: Row): Row {
    const cfg = this.cfg(table);
    const row: Row = jsonClone(input);
    const now = this.now();
    for (const [k, def] of Object.entries(cfg.defaults ?? {})) {
      if (row[k] === undefined) {
        const v = typeof def === "function" ? (def as (c: DefaultCtx) => unknown)({ now }) : deepClone(def);
        row[k] = v instanceof Date ? v.toISOString() : v;
      }
    }
    const idKind = cfg.idKind ?? "uuid";
    if (idKind === "uuid" && (row.id === undefined || row.id === null)) row.id = this.nextId();
    if (idKind === "serial" && (row.id === undefined || row.id === null)) {
      const n = (this.serialCounters.get(table) ?? 0) + 1;
      this.serialCounters.set(table, n);
      row.id = n;
    }
    this.normalizeRowTimestamps(table, row);
    for (const c of cfg.notNull ?? []) {
      if (row[c] === undefined || row[c] === null) {
        throw new PgThrow(
          pgError(
            `null value in column "${c}" of relation "${table}" violates not-null constraint`,
            "23502",
            `Failing row contains (${Object.values(row).map((v) => (v === null || v === undefined ? "null" : String(v))).join(", ")}).`
          )
        );
      }
    }
    return row;
  }

  private normalizeRowTimestamps(table: string, row: Row): void {
    for (const [k, v] of Object.entries(row)) {
      if (v === null || v === undefined || !this.isTsColumn(table, k)) continue;
      if (v instanceof Date) {
        row[k] = this.tsOut(v);
        continue;
      }
      if (typeof v !== "string") {
        throw new PgThrow(
          pgError(`invalid input syntax for type timestamp with time zone: "${String(v)}"`, "22007")
        );
      }
      const t = Date.parse(v);
      if (Number.isNaN(t)) {
        throw new PgThrow(pgError(`invalid input syntax for type timestamp with time zone: "${v}"`, "22007"));
      }
      row[k] = this.tsOut(new Date(t));
    }
  }

  /** Busca fila que viole algun UNIQUE con `candidate` (excluyendo la fila `except`). */
  private findUniqueConflict(table: string, candidate: Row, except?: StoredRow): { row: StoredRow; cols: string[] } | null {
    for (const cols of this.uniqueSets(table)) {
      if (cols.some((c) => candidate[c] === null || candidate[c] === undefined)) continue; // NULL no colisiona
      const hit = this.rawRows(table).find(
        (r) => r !== except && cols.every((c) => sqlCompare(r.data[c], candidate[c]) === 0)
      );
      if (hit) return { row: hit, cols };
    }
    return null;
  }

  private uniqueViolation(table: string, cols: string[], candidate: Row): PgThrow {
    return new PgThrow(
      pgError(
        `duplicate key value violates unique constraint "${table}_${cols.join("_")}_key"`,
        "23505",
        `Key (${cols.join(", ")})=(${cols.map((c) => String(candidate[c])).join(", ")}) already exists.`
      ),
      409
    );
  }

  private insertStored(table: string, input: Row): StoredRow {
    const row = this.buildRow(table, input);
    const conflict = this.findUniqueConflict(table, row);
    if (conflict) throw this.uniqueViolation(table, conflict.cols, row);
    this.seqCounter += 1;
    const stored: StoredRow = { seq: this.seqCounter, data: row };
    this.rawRows(table).push(stored);
    return stored;
  }

  // ── helpers para tests ────────────────────────────────────────────────────

  /**
   * Inserta filas SIN pasar por hooks/fallos/calls (setup de datos). Aplica defaults, normaliza
   * timestamps y respeta UNIQUE/NOT NULL (lanza Error si se violan). Devuelve copias de lo insertado.
   */
  seed<T extends Row = Row>(table: string, rows: Row | Row[]): T[] {
    const list = Array.isArray(rows) ? rows : [rows];
    const out: T[] = [];
    for (const r of list) {
      try {
        out.push(deepClone(this.insertStored(table, r).data) as T);
      } catch (e) {
        if (e instanceof PgThrow) throw new Error(`fake-supabase seed(${table}) fallo: [${e.pg.code}] ${e.pg.message} ${e.pg.details ?? ""}`);
        throw e;
      }
    }
    return out;
  }

  /** Copia de todas las filas de la tabla en orden de insercion (incluye todas las columnas). */
  dump<T extends Row = Row>(table: string): T[] {
    return this.rawRows(table).map((r) => deepClone(r.data) as T);
  }

  dumpAll(): Record<string, Row[]> {
    const out: Record<string, Row[]> = {};
    for (const t of this.tablesData.keys()) out[t] = this.dump(t);
    return out;
  }

  count(table: string, pred?: (row: Row) => boolean): number {
    const rows = this.rawRows(table);
    return pred ? rows.filter((r) => pred(r.data)).length : rows.length;
  }

  find<T extends Row = Row>(table: string, pred: (row: Row) => boolean): T | undefined {
    const r = this.rawRows(table).find((x) => pred(x.data));
    return r ? (deepClone(r.data) as T) : undefined;
  }

  filter<T extends Row = Row>(table: string, pred: (row: Row) => boolean): T[] {
    return this.rawRows(table)
      .filter((x) => pred(x.data))
      .map((r) => deepClone(r.data) as T);
  }

  /** Vacia una tabla (o todo si no se pasa nombre) sin tocar calls/config. */
  clear(table?: string): void {
    if (table) this.tablesData.delete(table);
    else this.tablesData.clear();
  }

  tableNames(): string[] {
    return [...this.tablesData.keys()];
  }

  /** Foto del estado de datos (para restaurar entre escenarios). */
  snapshot(): Record<string, Row[]> {
    return this.dumpAll();
  }

  restore(snap: Record<string, Row[]>): void {
    this.tablesData.clear();
    for (const [t, rows] of Object.entries(snap)) {
      const list = this.rawRows(t);
      for (const r of rows) {
        this.seqCounter += 1;
        list.push({ seq: this.seqCounter, data: deepClone(r) });
      }
    }
  }

  /** Registra usuarios de Supabase Auth para auth.admin.* (updateUserById, listUsers...). */
  seedUsers(users: FakeUser | FakeUser[]): void {
    for (const u of Array.isArray(users) ? users : [users]) this.users.set(u.id, deepClone(u));
  }

  callsFor(table: string, op?: FakeOp): CallRecord[] {
    return this.calls.filter((c) => c.table === table && (!op || c.op === op));
  }

  clearCalls(): void {
    this.calls = [];
    this.callSeq = 0;
  }

  /** Reinicia TODO (datos, llamadas, fallos, pausas, contadores, usuarios, espias, rpc custom). */
  reset(): void {
    for (const h of this.holds) h.openGate();
    this.holds = [];
    this.failures = [];
    this.tablesData.clear();
    this.calls = [];
    this.callSeq = 0;
    this.seqCounter = 0;
    this.idCounter = 0;
    this.serialCounters.clear();
    this.users.clear();
    this.rpcHandlers.clear();
    this.installBuiltinRpcs();
    this.interleaveCfg = FakeDb.toInterleave(this.opts.interleave);
    this.auth.admin = createAdminAuth(this);
  }

  // ── inyeccion de fallos y pausas ──────────────────────────────────────────

  /**
   * Hace fallar la(s) proxima(s) llamada(s) a (table, op). `table` puede ser "*" y `op` "*".
   * Para op "rpc", `table` es el nombre de la funcion.
   * Por defecto devuelve `{ data:null, error }` SIN aplicar la operacion (como un error de Postgres).
   */
  failNext(table: string, op: FailOp, error?: ErrorInput, opts: FailureOptions = {}): FailureHandle {
    const def: FailureDef = {
      table,
      op,
      error: toPgError(error),
      original: error,
      remaining: opts.times ?? 1,
      hits: 0,
      opts,
      cancelled: false,
    };
    this.failures.push(def);
    return {
      get hits() {
        return def.hits;
      },
      cancel() {
        def.cancelled = true;
      },
    };
  }

  clearFailures(): void {
    this.failures = [];
  }

  /**
   * Pausa la PROXIMA llamada que matchee (table, op) hasta que se llame `release()`.
   * Sirve para forzar carreras de forma DETERMINISTA:
   *
   *   const h = db.hold("subscriptions", "update");
   *   const p1 = POST(reqA);          // A llega al update y queda pausada
   *   await h.reached;
   *   await POST(reqB);               // B corre completa mientras A esta pausada
   *   h.release(); await p1;
   */
  hold(table: string, op: FakeOp | "*", opts: HoldOptions = {}): Hold {
    let resolveReached!: (c: CallRecord) => void;
    const reached = new Promise<CallRecord>((res) => {
      resolveReached = res;
    });
    let openGate!: () => void;
    const gate = new Promise<void>((res) => {
      openGate = res;
    });
    const def: HoldDef = {
      table,
      op,
      phase: opts.phase ?? "before",
      when: opts.when,
      triggered: false,
      released: false,
      resolveReached,
      gate,
      openGate: () => {
        def.released = true;
        openGate();
      },
    };
    this.holds.push(def);
    return {
      reached,
      release: () => def.openGate(),
      get triggered() {
        return def.triggered;
      },
      get released() {
        return def.released;
      },
    };
  }

  // ── internals de ejecucion (usados por QueryBuilder / RpcBuilder) ─────────

  /** @internal */
  _beginCall(partial: Omit<CallRecord, "seq">): CallRecord {
    this.callSeq += 1;
    const call: CallRecord = { ...partial, seq: this.callSeq };
    this.calls.push(call);
    return call;
  }

  /** @internal */
  async _gate(call: CallRecord, phase: "before" | "after"): Promise<void> {
    if (phase === "before" || phase === "after") {
      const hold = this.holds.find(
        (h) =>
          !h.triggered &&
          h.phase === phase &&
          (h.table === "*" || h.table === call.table) &&
          (h.op === "*" || h.op === call.op) &&
          (!h.when || h.when(call))
      );
      if (hold) {
        hold.triggered = true;
        hold.resolveReached(call);
        await hold.gate;
      }
    }
    if (this.interleaveCfg) await this.interleaveCfg({ table: call.table, op: call.op, phase, seq: call.seq });
  }

  /** @internal */
  _matchFailure(call: CallRecord): FailureDef | null {
    for (const f of this.failures) {
      if (f.cancelled || f.remaining <= 0) continue;
      if (f.table !== "*" && f.table !== call.table) continue;
      if (f.op !== "*" && f.op !== call.op) continue;
      if (f.opts.when && !f.opts.when(call)) continue;
      f.remaining -= 1;
      f.hits += 1;
      return f;
    }
    return null;
  }

  /** @internal */
  _ctx(session: RlsSession): RlsContext {
    return {
      userId: session.userId,
      now: this.now(),
      rows: (t) => this.rawRows(t).map((r) => r.data),
    };
  }

  /** @internal — ejecuta una operacion sincrona sobre el store con rollback ante error. */
  _transact<T>(table: string, fn: () => T): T {
    const before = this.rawRows(table).map((r) => ({ seq: r.seq, data: deepClone(r.data) }));
    const beforeSerial = this.serialCounters.get(table);
    try {
      return fn();
    } catch (e) {
      this.tablesData.set(table, before);
      if (beforeSerial === undefined) this.serialCounters.delete(table);
      else this.serialCounters.set(table, beforeSerial);
      throw e;
    }
  }

  /** @internal */
  _rows(table: string): StoredRow[] {
    return this.rawRows(table);
  }
  /** @internal */
  _insert(table: string, input: Row): StoredRow {
    return this.insertStored(table, input);
  }
  /** @internal */
  _buildRow(table: string, input: Row): Row {
    return this.buildRow(table, input);
  }
  /** @internal */
  _conflict(table: string, candidate: Row, except?: StoredRow) {
    return this.findUniqueConflict(table, candidate, except);
  }
  /** @internal */
  _uniqueViolation(table: string, cols: string[], candidate: Row) {
    return this.uniqueViolation(table, cols, candidate);
  }
  /** @internal */
  _uniqueSets(table: string) {
    return this.uniqueSets(table);
  }
  /** @internal */
  _normalizePatch(table: string, patch: Row): Row {
    const p = jsonClone(patch);
    this.normalizeRowTimestamps(table, p);
    return p;
  }
  /** @internal */
  _notNullCheck(table: string, row: Row): void {
    for (const c of this.cfg(table).notNull ?? []) {
      if (row[c] === undefined || row[c] === null) {
        throw new PgThrow(
          pgError(`null value in column "${c}" of relation "${table}" violates not-null constraint`, "23502")
        );
      }
    }
  }
  /** @internal */
  _rpcHandler(name: string): RpcHandler | undefined {
    return this.rpcHandlers.get(name);
  }

  // ── API estilo supabase-js ────────────────────────────────────────────────

  /** Query builder. Sin `session` = service_role (bypasea RLS), como createAdminClient(). */
  from(table: string, session?: RlsSession): QueryBuilder {
    return new QueryBuilder(this, table, session ?? { role: "service_role", userId: null });
  }

  rpc(name: string, args: Record<string, unknown> = {}, session?: RlsSession): RpcBuilder {
    return new RpcBuilder(this, name, args, session ?? { role: "service_role", userId: null });
  }

  /** Cliente estilo `createAdminClient()` (service_role): { from, rpc, auth.admin }. */
  adminClient(): FakeAdminClient {
    return {
      from: (t: string) => this.from(t),
      rpc: (n: string, a?: Record<string, unknown>) => this.rpc(n, a),
      auth: this.auth,
    };
  }
}

export interface FakeAdminClient {
  from(table: string): QueryBuilder;
  rpc(name: string, args?: Record<string, unknown>): RpcBuilder;
  auth: { admin: FakeAdminAuth };
}

export function createFakeDb(opts?: FakeDbOptions): FakeDb {
  return new FakeDb(opts);
}

/** Lanzar desde un handler de rpc para devolver `{ error }`. */
export function rpcFail(message: string, code = "P0001"): never {
  throw new PgThrow(pgError(message, code));
}

/**
 * Hook de interleave pseudo-aleatorio pero REPRODUCIBLE (mulberry32): cede entre 0 y `maxTicks`
 * microtareas antes/despues de cada operacion. Probar varias semillas explora distintas carreras.
 */
export function randomInterleave(seed: number, maxTicks = 5): InterleaveHook {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return async () => {
    const n = Math.floor(rnd() * (maxTicks + 1));
    for (let i = 0; i < n; i++) await Promise.resolve();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QueryBuilder
// ─────────────────────────────────────────────────────────────────────────────

type Mode = "select" | "insert" | "update" | "delete" | "upsert";

export class QueryBuilder<Data = Row[] | null> implements PromiseLike<FakeResult<Data>> {
  private mode: Mode | null = null;
  private columns = "*";
  private returning = false;
  private countOpt: string | null = null;
  private head = false;
  private payload: Row | Row[] | null = null;
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private filters: FilterRecord[] = [];
  private orders: Array<{ column: string; ascending: boolean; nullsFirst?: boolean }> = [];
  private limitN: number | null = null;
  private offsetN = 0;
  private rangeRec: [number, number] | undefined;
  private singleMode: "single" | "maybeSingle" | null = null;
  private throwOnErr = false;

  constructor(
    private readonly db: FakeDb,
    private readonly table: string,
    private readonly session: RlsSession
  ) {}

  // ── verbos ────────────────────────────────────────────────────────────────

  select(columns = "*", opts: { count?: "exact" | "planned" | "estimated"; head?: boolean } = {}): this {
    this.columns = columns;
    if (opts.count) this.countOpt = opts.count;
    if (opts.head) this.head = true;
    if (this.mode === null) this.mode = "select";
    else this.returning = true;
    return this;
  }

  insert(values: Row | Row[], opts: { count?: string } = {}): this {
    this.mode = "insert";
    this.payload = values;
    if (opts.count) this.countOpt = opts.count;
    return this;
  }

  update(values: Row, opts: { count?: string } = {}): this {
    this.mode = "update";
    this.payload = values;
    if (opts.count) this.countOpt = opts.count;
    return this;
  }

  upsert(
    values: Row | Row[],
    opts: { onConflict?: string; ignoreDuplicates?: boolean; count?: string } = {}
  ): this {
    this.mode = "upsert";
    this.payload = values;
    this.upsertOpts = { onConflict: opts.onConflict, ignoreDuplicates: opts.ignoreDuplicates };
    if (opts.count) this.countOpt = opts.count;
    return this;
  }

  delete(opts: { count?: string } = {}): this {
    this.mode = "delete";
    if (opts.count) this.countOpt = opts.count;
    return this;
  }

  // ── filtros ───────────────────────────────────────────────────────────────

  private addFilter(op: string, column: string, value: unknown): this {
    this.filters.push({ op, column, value });
    return this;
  }
  eq(column: string, value: unknown): this {
    return this.addFilter("eq", column, value);
  }
  neq(column: string, value: unknown): this {
    return this.addFilter("neq", column, value);
  }
  gt(column: string, value: unknown): this {
    return this.addFilter("gt", column, value);
  }
  gte(column: string, value: unknown): this {
    return this.addFilter("gte", column, value);
  }
  lt(column: string, value: unknown): this {
    return this.addFilter("lt", column, value);
  }
  lte(column: string, value: unknown): this {
    return this.addFilter("lte", column, value);
  }
  like(column: string, pattern: string): this {
    return this.addFilter("like", column, pattern);
  }
  ilike(column: string, pattern: string): this {
    return this.addFilter("ilike", column, pattern);
  }
  is(column: string, value: null | boolean | string): this {
    return this.addFilter("is", column, value);
  }
  in(column: string, values: readonly unknown[]): this {
    return this.addFilter("in", column, [...values]);
  }
  not(column: string, operator: string, value: unknown): this {
    return this.addFilter("not", column, { operator, value });
  }
  match(query: Record<string, unknown>): this {
    for (const [k, v] of Object.entries(query)) this.addFilter("eq", k, v);
    return this;
  }

  // ── modificadores ─────────────────────────────────────────────────────────

  order(column: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}): this {
    this.orders.push({ column, ascending: opts.ascending !== false, nullsFirst: opts.nullsFirst });
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number): this {
    this.offsetN = from;
    this.limitN = to - from + 1;
    this.rangeRec = [from, to];
    return this;
  }
  single(): QueryBuilder<Row | null> {
    this.singleMode = "single";
    return this as unknown as QueryBuilder<Row | null>;
  }
  maybeSingle(): QueryBuilder<Row | null> {
    this.singleMode = "maybeSingle";
    return this as unknown as QueryBuilder<Row | null>;
  }
  throwOnError(): this {
    this.throwOnErr = true;
    return this;
  }
  /** Compat: no hace nada. */
  abortSignal(): this {
    return this;
  }
  /** Compat: solo cambia el tipo. */
  returns<T>(): QueryBuilder<T> {
    return this as unknown as QueryBuilder<T>;
  }

  // ── thenable ──────────────────────────────────────────────────────────────

  then<R1 = FakeResult<Data>, R2 = never>(
    onfulfilled?: ((value: FakeResult<Data>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  // ── ejecucion ─────────────────────────────────────────────────────────────

  private async execute(): Promise<FakeResult<Data>> {
    const mode: Mode = this.mode ?? "select";
    const db = this.db;
    const call = db._beginCall({
      table: this.table,
      op: mode,
      filters: this.filters.map((f) => ({ ...f })),
      values: this.payload === null ? undefined : jsonClone(this.payload),
      options: {
        ...(this.countOpt ? { count: this.countOpt } : {}),
        ...(this.head ? { head: true } : {}),
        ...this.upsertOpts,
      },
      columns: mode === "select" || this.returning ? this.columns : undefined,
      order: this.orders.map((o) => ({ column: o.column, ascending: o.ascending })),
      limit: this.limitN ?? undefined,
      range: this.rangeRec,
      single: this.singleMode,
      role: this.session.role,
      userId: this.session.userId,
    });

    await db._gate(call, "before");
    const failure = db._matchFailure(call);

    let result: FakeResult<Data>;
    if (failure && !failure.opts.applyBeforeFail) {
      result = this.failResult(call, failure) as FakeResult<Data>;
    } else {
      result = this.run(mode, call) as FakeResult<Data>;
      if (failure) result = this.failResult(call, failure) as FakeResult<Data>;
    }
    await db._gate(call, "after");

    if (this.throwOnErr && result.error) {
      const e = new Error(result.error.message) as Error & PgError;
      e.name = "PostgrestError";
      Object.assign(e, result.error);
      throw e;
    }
    return result;
  }

  private failResult(call: CallRecord, f: { error: PgError; original?: ErrorInput; opts: FailureOptions }): FakeResult<null> {
    if (f.opts.reject) {
      call.result = { rows: 0, error: f.error };
      throw f.original instanceof Error ? f.original : new Error(f.error.message);
    }
    call.result = { rows: 0, error: f.error };
    return { data: null, error: f.error, count: null, status: f.error.code === "XX000" ? 500 : 400, statusText: "Error" };
  }

  private okResult(call: CallRecord, rows: Row[], count: number | null, status: number, asData: boolean): FakeResult<unknown> {
    call.result = { rows: rows.length, error: null };
    let data: unknown = asData ? rows : null;
    if (asData && this.singleMode === "maybeSingle") {
      // Replica postgrest-js processResponse: 0 -> null, 1 -> obj, 2+ -> error PGRST116 (mutacion YA aplicada)
      if (rows.length > 1) {
        const error = pgError(
          "JSON object requested, multiple (or no) rows returned",
          "PGRST116",
          `Results contain ${rows.length} rows, application/vnd.pgrst.object+json requires 1 row`
        );
        call.result = { rows: rows.length, error };
        return { data: null, error, count: null, status: 406, statusText: "Not Acceptable" };
      }
      data = rows[0] ?? null;
    } else if (asData && this.singleMode === "single") {
      data = rows[0];
    }
    return { data, error: null, count, status, statusText: status === 201 ? "Created" : status === 204 ? "No Content" : "OK" };
  }

  private singleError(call: CallRecord, n: number): FakeResult<null> {
    const error = pgError(
      "JSON object requested, multiple (or no) rows returned",
      "PGRST116",
      `The result contains ${n} rows`
    );
    call.result = { rows: n, error };
    return { data: null, error, count: null, status: 406, statusText: "Not Acceptable" };
  }

  private run(mode: Mode, call: CallRecord): FakeResult<unknown> {
    try {
      const cmd = mode === "upsert" ? "insert" : mode;
      if (this.session.role !== "service_role" && rlsEnabledFor(this.table)) {
        const rels = new Set<string>();
        const check = (c: "select" | "insert" | "update" | "delete") => {
          const rel = detectPolicyRecursion(this.table, c, { adminSchema: this.session.adminSchema });
          if (rel) rels.add(rel);
        };
        check(cmd);
        if (mode === "upsert") check("update");
        if (rels.size) {
          throw new PgThrow(pgError(`infinite recursion detected in policy for relation "${[...rels][0]}"`, "42P17"), 500);
        }
      }
      switch (mode) {
        case "select":
          return this.runSelect(call);
        case "insert":
          return this.runInsert(call);
        case "update":
          return this.runUpdate(call);
        case "delete":
          return this.runDelete(call);
        case "upsert":
          return this.runUpsert(call);
      }
    } catch (e) {
      if (e instanceof PgThrow) {
        call.result = { rows: 0, error: e.pg };
        return { data: null, error: e.pg, count: null, status: e.httpStatus, statusText: "Error" };
      }
      throw e;
    }
  }

  private visible(table: string, cmd: "select" | "update" | "delete", stored: StoredRow): boolean {
    return rowPassesUsing(table, cmd, stored.data, this.session, this.db._ctx(this.session));
  }

  private compareRows(a: StoredRow, b: StoredRow): number {
    for (const o of this.orders) {
      const va = a.data[o.column] === undefined ? null : a.data[o.column];
      const vb = b.data[o.column] === undefined ? null : b.data[o.column];
      if (va === null && vb === null) continue;
      // Defaults de Postgres: ASC => NULLS LAST, DESC => NULLS FIRST
      const nullsFirst = o.nullsFirst ?? !o.ascending;
      if (va === null) return nullsFirst ? -1 : 1;
      if (vb === null) return nullsFirst ? 1 : -1;
      const c = sqlCompare(va, vb) ?? 0;
      if (c !== 0) return o.ascending ? c : -c;
    }
    const asc = this.orders.length === 0 ? true : this.orders[0].ascending;
    return asc ? a.seq - b.seq : b.seq - a.seq;
  }

  private matched(cmd: "select" | "update" | "delete"): StoredRow[] {
    const rows = this.db._rows(this.table).filter((r) => matchFilters(this.filters, r.data) && this.visible(this.table, cmd, r));
    if (this.orders.length || cmd === "select") rows.sort((a, b) => this.compareRows(a, b));
    return rows;
  }

  private runSelect(call: CallRecord): FakeResult<unknown> {
    const spec = parseColumns(this.columns);
    let rows = this.matched("select");
    const total = rows.length;
    rows = rows.slice(this.offsetN, this.limitN === null ? undefined : this.offsetN + this.limitN);
    const count = this.countOpt ? total : null;
    if (this.head) return this.okResult(call, [], count, 200, false);
    const projected = rows.map((r) => projectRow(r.data, spec));
    if (this.singleMode === "single" && projected.length !== 1) return this.singleError(call, projected.length);
    return this.okResult(call, projected, count, 200, true);
  }

  /** Error de single(): dentro de una transaccion provoca ROLLBACK de la mutacion. */
  private singleRowError(n: number): PgThrow {
    return new PgThrow(
      pgError("JSON object requested, multiple (or no) rows returned", "PGRST116", `The result contains ${n} rows`),
      406
    );
  }

  private rlsViolation(): PgThrow {
    return new PgThrow(pgError(`new row violates row-level security policy for table "${this.table}"`, "42501"), 403);
  }

  private runInsert(call: CallRecord): FakeResult<unknown> {
    const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
    const spec = parseColumns(this.columns);
    const ctx = this.db._ctx(this.session);
    const inserted = this.db._transact(this.table, () => {
      const out: StoredRow[] = [];
      for (const input of list) {
        const stored = this.db._insert(this.table, input);
        if (!rowPassesWithCheck(this.table, "insert", stored.data, this.session, ctx)) throw this.rlsViolation();
        out.push(stored);
      }
      if (this.returning && this.singleMode === "single" && out.length !== 1) throw this.singleRowError(out.length);
      return out;
    });
    const rows = inserted.map((r) => projectRow(r.data, spec));
    return this.okResult(call, rows, this.countOpt ? inserted.length : null, 201, this.returning);
  }

  private runUpdate(call: CallRecord): FakeResult<unknown> {
    const patch = this.db._normalizePatch(this.table, (this.payload ?? {}) as Row);
    const spec = parseColumns(this.columns);
    const ctx = this.db._ctx(this.session);
    const targets = this.matched("update");
    const updated = this.db._transact(this.table, () => {
      for (const t of targets) {
        Object.assign(t.data, deepClone(patch));
        this.db._notNullCheck(this.table, t.data);
        const conflict = this.db._conflict(this.table, t.data, t);
        if (conflict) throw this.db._uniqueViolation(this.table, conflict.cols, t.data);
        if (!rowPassesWithCheck(this.table, "update", t.data, this.session, ctx)) throw this.rlsViolation();
      }
      if (this.returning && this.singleMode === "single" && targets.length !== 1) throw this.singleRowError(targets.length);
      return targets;
    });
    const rows = updated.map((r) => projectRow(r.data, spec));
    return this.okResult(call, rows, this.countOpt ? updated.length : null, this.returning ? 200 : 204, this.returning);
  }

  private runDelete(call: CallRecord): FakeResult<unknown> {
    const spec = parseColumns(this.columns);
    const targets = this.matched("delete");
    const deleted = this.db._transact(this.table, () => {
      const rows = targets.map((r) => projectRow(r.data, spec));
      const ids = new Set(targets.map((t) => t.seq));
      const all = this.db._rows(this.table);
      for (let i = all.length - 1; i >= 0; i--) if (ids.has(all[i].seq)) all.splice(i, 1);
      if (this.returning && this.singleMode === "single" && rows.length !== 1) throw this.singleRowError(rows.length);
      return rows;
    });
    return this.okResult(call, deleted, this.countOpt ? deleted.length : null, this.returning ? 200 : 204, this.returning);
  }

  private runUpsert(call: CallRecord): FakeResult<unknown> {
    const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
    const spec = parseColumns(this.columns);
    const ctx = this.db._ctx(this.session);
    const onConflictCols = this.upsertOpts.onConflict
      ? this.upsertOpts.onConflict.split(",").map((c) => c.trim()).filter(Boolean)
      : ["id"];
    const constraint = this.db
      ._uniqueSets(this.table)
      .find((s) => s.length === onConflictCols.length && s.every((c) => onConflictCols.includes(c)));
    if (!constraint) {
      throw new PgThrow(
        pgError(
          "there is no unique or exclusion constraint matching the ON CONFLICT specification",
          "42P10",
          null,
          `fake-supabase: declara el UNIQUE con createFakeDb({ unique: { ${this.table}: [${JSON.stringify(onConflictCols)}] } }) o db.setUnique().`
        ),
        400
      );
    }
    const ignore = this.upsertOpts.ignoreDuplicates === true;
    const seenKeys = new Set<string>();

    const affected = this.db._transact(this.table, () => {
      const out: StoredRow[] = [];
      for (const input of list) {
        const keyed = constraint.every((c) => input[c] !== undefined && input[c] !== null);
        if (!ignore && keyed) {
          const key = constraint.map((c) => String(input[c])).join("\u0000");
          if (seenKeys.has(key)) {
            throw new PgThrow(
              pgError(
                "ON CONFLICT DO UPDATE command cannot affect row a second time",
                "21000",
                null,
                "Ensure that no rows proposed for insertion within the same command have duplicate constrained values."
              )
            );
          }
          seenKeys.add(key);
        }
        const candidate = this.db._buildRow(this.table, input);
        const existing = keyed
          ? this.db._rows(this.table).find((r) => constraint.every((c) => sqlCompare(r.data[c], candidate[c]) === 0))
          : undefined;
        if (existing) {
          if (ignore) continue; // DO NOTHING: no devuelve fila
          if (!this.visible(this.table, "update", existing)) continue;
          const patch = this.db._normalizePatch(this.table, input);
          Object.assign(existing.data, deepClone(patch));
          const conflict = this.db._conflict(this.table, existing.data, existing);
          if (conflict) throw this.db._uniqueViolation(this.table, conflict.cols, existing.data);
          if (!rowPassesWithCheck(this.table, "update", existing.data, this.session, ctx)) throw this.rlsViolation();
          out.push(existing);
        } else {
          const stored = this.db._insert(this.table, input);
          if (!rowPassesWithCheck(this.table, "insert", stored.data, this.session, ctx)) throw this.rlsViolation();
          out.push(stored);
        }
      }
      if (this.returning && this.singleMode === "single" && out.length !== 1) throw this.singleRowError(out.length);
      return out;
    });
    const rows = affected.map((r) => projectRow(r.data, spec));
    return this.okResult(call, rows, this.countOpt ? affected.length : null, 201, this.returning);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RpcBuilder
// ─────────────────────────────────────────────────────────────────────────────

export class RpcBuilder<Data = unknown> implements PromiseLike<FakeResult<Data>> {
  private singleMode: "single" | "maybeSingle" | null = null;
  private throwOnErr = false;

  constructor(
    private readonly db: FakeDb,
    private readonly name: string,
    private readonly args: Record<string, unknown>,
    private readonly session: RlsSession
  ) {}

  single(): RpcBuilder {
    this.singleMode = "single";
    return this as RpcBuilder;
  }
  maybeSingle(): RpcBuilder {
    this.singleMode = "maybeSingle";
    return this as RpcBuilder;
  }
  throwOnError(): this {
    this.throwOnErr = true;
    return this;
  }

  then<R1 = FakeResult<Data>, R2 = never>(
    onfulfilled?: ((value: FakeResult<Data>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<FakeResult<Data>> {
    const db = this.db;
    const call = db._beginCall({
      table: this.name,
      op: "rpc",
      filters: [],
      values: jsonClone(this.args),
      order: [],
      single: this.singleMode,
      role: this.session.role,
      userId: this.session.userId,
    });
    await db._gate(call, "before");
    const failure = db._matchFailure(call);
    let result: FakeResult<unknown>;

    const doRun = async (): Promise<FakeResult<unknown>> => {
      const handler = db._rpcHandler(this.name);
      if (!handler) {
        const error = pgError(
          `Could not find the function public.${this.name}(${Object.keys(this.args).join(", ")}) in the schema cache`,
          "PGRST202",
          null,
          "fake-supabase: registra la funcion con db.registerRpc(name, handler)."
        );
        call.result = { rows: 0, error };
        return { data: null, error, count: null, status: 404, statusText: "Not Found" };
      }
      try {
        const data = await handler(jsonClone(this.args), { db, session: this.session });
        const value = data === undefined ? null : deepClone(data);
        call.result = { rows: Array.isArray(value) ? value.length : value === null ? 0 : 1, error: null };
        return { data: value, error: null, count: null, status: value === null ? 204 : 200, statusText: value === null ? "No Content" : "OK" };
      } catch (e) {
        if (e instanceof PgThrow) {
          call.result = { rows: 0, error: e.pg };
          return { data: null, error: e.pg, count: null, status: e.httpStatus, statusText: "Error" };
        }
        throw e;
      }
    };

    if (failure && !failure.opts.applyBeforeFail) {
      if (failure.opts.reject) throw failure.original instanceof Error ? failure.original : new Error(failure.error.message);
      call.result = { rows: 0, error: failure.error };
      result = { data: null, error: failure.error, count: null, status: 500, statusText: "Error" };
    } else {
      result = await doRun();
      if (failure) {
        if (failure.opts.reject) throw failure.original instanceof Error ? failure.original : new Error(failure.error.message);
        call.result = { rows: 0, error: failure.error };
        result = { data: null, error: failure.error, count: null, status: 500, statusText: "Error" };
      }
    }
    await db._gate(call, "after");

    if (this.throwOnErr && result.error) {
      const e = new Error(result.error.message) as Error & PgError;
      e.name = "PostgrestError";
      Object.assign(e, result.error);
      throw e;
    }
    return result as FakeResult<Data>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// auth.admin (espias)
// ─────────────────────────────────────────────────────────────────────────────

export type AuthErr = { name: string; message: string; status: number; code: string };
export interface AuthRes<T> {
  data: T;
  error: AuthErr | null;
}

export interface FakeAdminAuth {
  updateUserById: MockedFunction<(id: string, attrs: Record<string, unknown>) => Promise<AuthRes<{ user: FakeUser | null }>>>;
  getUserById: MockedFunction<(id: string) => Promise<AuthRes<{ user: FakeUser | null }>>>;
  listUsers: MockedFunction<
    (params?: { page?: number; perPage?: number }) => Promise<
      AuthRes<{ users: FakeUser[]; aud: string; total: number; nextPage: number | null; lastPage: number }>
    >
  >;
  createUser: MockedFunction<(attrs: Record<string, unknown>) => Promise<AuthRes<{ user: FakeUser | null }>>>;
  deleteUser: MockedFunction<(id: string) => Promise<AuthRes<{ user: null }>>>;
}

const userNotFound = (): AuthErr => ({ name: "AuthApiError", message: "User not found", status: 404, code: "user_not_found" });

function createAdminAuth(db: FakeDb): FakeAdminAuth {
  const updateUserById = async (id: string, attrs: Record<string, unknown>): Promise<AuthRes<{ user: FakeUser | null }>> => {
    const u = db.users.get(id);
    if (!u) return { data: { user: null }, error: userNotFound() };
    const { app_metadata, user_metadata, ...rest } = attrs as {
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
    } & Record<string, unknown>;
    // GoTrue MERGEA app_metadata / user_metadata (clave con null la borra)
    const merge = (base: Record<string, unknown>, patch?: Record<string, unknown>) => {
      const out = { ...base };
      for (const [k, v] of Object.entries(patch ?? {})) {
        if (v === null) delete out[k];
        else out[k] = v;
      }
      return out;
    };
    const next: FakeUser = {
      ...u,
      ...(rest as Partial<FakeUser>),
      app_metadata: merge(u.app_metadata, app_metadata),
      user_metadata: merge(u.user_metadata, user_metadata),
      updated_at: db.now().toISOString(),
    };
    db.users.set(id, next);
    return { data: { user: deepClone(next) }, error: null };
  };

  const getUserById = async (id: string): Promise<AuthRes<{ user: FakeUser | null }>> => {
    const u = db.users.get(id);
    return u ? { data: { user: deepClone(u) }, error: null } : { data: { user: null }, error: userNotFound() };
  };

  const listUsers = async (params: { page?: number; perPage?: number } = {}) => {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 50;
    const all = [...db.users.values()];
    const users = all.slice((page - 1) * perPage, page * perPage).map((u) => deepClone(u));
    const lastPage = Math.max(1, Math.ceil(all.length / perPage));
    return {
      data: { users, aud: "authenticated", total: all.length, nextPage: page < lastPage ? page + 1 : null, lastPage },
      error: null as AuthErr | null,
    };
  };

  const createUser = async (attrs: Record<string, unknown>): Promise<AuthRes<{ user: FakeUser | null }>> => {
    const email = attrs.email as string | undefined;
    if (email && [...db.users.values()].some((u) => u.email === email)) {
      return {
        data: { user: null },
        error: { name: "AuthApiError", message: "A user with this email address has already been registered", status: 422, code: "email_exists" },
      };
    }
    const now = db.now();
    const user = makeUser(
      {
        id: (attrs.id as string | undefined) ?? db.nextId(),
        email,
        email_confirmed_at: attrs.email_confirm ? now.toISOString() : null,
        app_metadata: (attrs.app_metadata as Record<string, unknown>) ?? {},
        user_metadata: (attrs.user_metadata as Record<string, unknown>) ?? {},
      },
      now
    );
    db.users.set(user.id, user);
    return { data: { user: deepClone(user) }, error: null };
  };

  const deleteUser = async (id: string): Promise<AuthRes<{ user: null }>> => {
    if (!db.users.delete(id)) return { data: { user: null }, error: userNotFound() };
    return { data: { user: null }, error: null };
  };

  return {
    updateUserById: vi.fn(updateUserById),
    getUserById: vi.fn(getUserById),
    listUsers: vi.fn(listUsers),
    createUser: vi.fn(createUser),
    deleteUser: vi.fn(deleteUser),
  } as unknown as FakeAdminAuth;
}

