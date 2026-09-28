/**
 * rls.ts — replica PURA de las politicas RLS del proyecto (supabase-schema.sql, admin-schema.sql,
 * create-notes-table.sql, create-coupons-table.sql, create-webhook-events-table.sql,
 * create-rate-limits-table.sql).
 *
 * Sirve para dos cosas:
 *  1. Funciones puras de alto nivel para asertar acceso (`canReadPaidLessons`, ...).
 *  2. Motor de politicas que usa fake-supabase.ts cuando se pide un cliente "server" con RLS
 *     (createFakeServerClient(db, { rls: true })).
 *
 * Todo lo que esta aca fue transcripto del SQL. Cada politica indica su fuente. Si el SQL cambia,
 * hay que actualizar este archivo (no se lee el SQL en runtime).
 */

import { isSubscriptionActive } from "../lib/subscription-logic";

export type Row = Record<string, unknown>;

export type RlsCommand = "select" | "insert" | "update" | "delete";

/** Contexto que ve una politica: equivalente a auth.uid(), now() y subconsultas a otras tablas. */
export interface RlsContext {
  /** auth.uid(). null = rol anon (sin sesion). */
  userId: string | null;
  now: Date;
  /** Filas crudas (sin RLS) de otra tabla, para reproducir `exists (select ... )`. */
  rows(table: string): Row[];
}

export interface RlsPolicy {
  table: string;
  name: string;
  source: "supabase-schema.sql" | "admin-schema.sql" | "create-notes-table.sql";
  command: RlsCommand | "all";
  /** USING (...) — filtra filas visibles/afectables. */
  using?: (row: Row, ctx: RlsContext) => boolean;
  /** WITH CHECK (...) — valida filas nuevas. Si falta en INSERT/UPDATE/ALL se usa `using`. */
  withCheck?: (row: Row, ctx: RlsContext) => boolean;
  /**
   * true si la politica consulta la MISMA tabla sobre la que esta definida (subconsulta que
   * vuelve a disparar RLS). En Postgres eso produce
   * `ERROR 42P17: infinite recursion detected in policy for relation "<tabla>"`.
   * NOTA: comportamiento conocido de Postgres, NO verificado contra una base real en este repo.
   */
  selfReferencing?: boolean;
  /** Tablas a las que hace subconsulta (para detectar recursion indirecta). */
  referencesTables?: string[];
}

/** Sesion con la que se ejecuta una consulta. */
export interface RlsSession {
  /** "service_role" bypasea RLS (createAdminClient). */
  role: "anon" | "authenticated" | "service_role";
  userId: string | null;
  /** Incluir las politicas de admin-schema.sql (default: false; no sabemos si estan aplicadas en prod). */
  adminSchema?: boolean;
}

/**
 * Tablas con `enable row level security` segun el SQL del repo.
 *  - true  : RLS habilitada.
 *  - false : el SQL NO la habilita (create-webhook-events-table.sql y create-rate-limits-table.sql
 *            dicen literalmente "Sin RLS"). En Supabase una tabla `public` sin RLS es accesible
 *            (select/insert/update/delete) con la anon key publica via PostgREST.
 *  - null  : la tabla se usa en el codigo pero ningun .sql del repo la crea (ej: `admins`);
 *            no se puede saber. El motor la trata como SIN RLS.
 */
export const RLS_ENABLED: Record<string, boolean | null> = {
  profiles: true,
  subscriptions: true,
  categories: true,
  instructors: true,
  courses: true,
  course_categories: true,
  lessons: true,
  progress: true,
  favorites: true,
  notes: true,
  lesson_notes: true,
  coupons: true, // habilitada SIN politicas => solo service_role
  webhook_events: false,
  rate_limits: false,
  admins: null,
};

const eqUid = (col: string) => (row: Row, ctx: RlsContext) =>
  ctx.userId !== null && row[col] === ctx.userId;

/** exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) */
const callerIsAdminProfile = (_row: Row, ctx: RlsContext) =>
  ctx.userId !== null &&
  ctx.rows("profiles").some((p) => p.id === ctx.userId && p.is_admin === true);

/** Politicas literales del SQL, en el mismo orden del archivo. */
export const POLICIES: RlsPolicy[] = [
  // ── supabase-schema.sql ────────────────────────────────────────────────
  {
    table: "profiles",
    name: "Users see own profile",
    source: "supabase-schema.sql",
    command: "select",
    using: eqUid("id"),
  },
  {
    table: "profiles",
    name: "Users update own profile",
    source: "supabase-schema.sql",
    command: "update",
    using: eqUid("id"),
  },
  {
    // NO hay politica de INSERT/DELETE en subscriptions: solo service_role escribe.
    table: "subscriptions",
    name: "Users see own subscription",
    source: "supabase-schema.sql",
    command: "select",
    using: eqUid("user_id"),
  },
  {
    table: "categories",
    name: "Categories are public",
    source: "supabase-schema.sql",
    command: "select",
    using: () => true,
  },
  {
    table: "instructors",
    name: "Instructors are public",
    source: "supabase-schema.sql",
    command: "select",
    using: () => true,
  },
  {
    table: "courses",
    name: "Published courses are public",
    source: "supabase-schema.sql",
    command: "select",
    using: (row) => row.is_published === true,
  },
  {
    table: "course_categories",
    name: "Course categories are public",
    source: "supabase-schema.sql",
    command: "select",
    using: () => true,
  },
  {
    table: "lessons",
    name: "Free lessons are public",
    source: "supabase-schema.sql",
    command: "select",
    using: (row) => row.is_free === true,
  },
  {
    // is_free = false and exists (subscription: user_id = auth.uid() and status in
    // ('active','trialing') and current_period_end > now())
    table: "lessons",
    name: "Paid lessons for subscribers",
    source: "supabase-schema.sql",
    command: "select",
    using: (row, ctx) =>
      row.is_free === false && canReadPaidLessons(ctx.rows("subscriptions"), ctx.userId, ctx.now),
    referencesTables: ["subscriptions"],
  },
  {
    table: "progress",
    name: "Users manage own progress",
    source: "supabase-schema.sql",
    command: "all",
    using: eqUid("user_id"),
  },
  {
    table: "favorites",
    name: "Users manage own favorites",
    source: "supabase-schema.sql",
    command: "all",
    using: eqUid("user_id"),
  },
  {
    table: "notes",
    name: "Users manage own notes",
    source: "supabase-schema.sql",
    command: "all",
    using: eqUid("user_id"),
  },
  // ── create-notes-table.sql ─────────────────────────────────────────────
  {
    table: "lesson_notes",
    name: "Usuarios ven sus propias notas",
    source: "create-notes-table.sql",
    command: "select",
    using: eqUid("user_id"),
  },
  {
    table: "lesson_notes",
    name: "Usuarios insertan sus propias notas",
    source: "create-notes-table.sql",
    command: "insert",
    withCheck: eqUid("user_id"),
  },
  {
    table: "lesson_notes",
    name: "Usuarios borran sus propias notas",
    source: "create-notes-table.sql",
    command: "delete",
    using: eqUid("user_id"),
  },
];

/**
 * Politicas de admin-schema.sql. Solo se aplican con `adminSchema: true`.
 * OJO: las de `profiles` consultan `profiles` (auto-referencia => 42P17 en Postgres) y las de las
 * demas tablas consultan `profiles`, cuyas politicas tambien se expanden dentro de la subconsulta.
 * Si admin-schema.sql estuviera aplicado en produccion, en teoria cualquier SELECT de un usuario
 * autenticado sobre profiles/subscriptions/courses/lessons/... fallaria con 42P17.
 * (Hipotesis NO verificada contra Postgres real: solo el motor de politicas la modela.)
 */
export const ADMIN_POLICIES: RlsPolicy[] = [
  {
    table: "profiles",
    name: "Admins read all profiles",
    source: "admin-schema.sql",
    command: "select",
    using: callerIsAdminProfile,
    selfReferencing: true,
    referencesTables: ["profiles"],
  },
  {
    table: "subscriptions",
    name: "Admins read all subscriptions",
    source: "admin-schema.sql",
    command: "select",
    using: callerIsAdminProfile,
    referencesTables: ["profiles"],
  },
  ...(["courses", "lessons", "categories", "instructors", "course_categories"] as const).map(
    (table): RlsPolicy => ({
      table,
      name: `Admins manage ${table}`,
      source: "admin-schema.sql",
      command: "all",
      using: callerIsAdminProfile,
      referencesTables: ["profiles"],
    })
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// Motor de politicas
// ─────────────────────────────────────────────────────────────────────────────

export function rlsEnabledFor(table: string): boolean {
  return RLS_ENABLED[table] === true;
}

export function policiesFor(
  table: string,
  command: RlsCommand,
  opts: { adminSchema?: boolean } = {}
): RlsPolicy[] {
  const all = opts.adminSchema ? [...POLICIES, ...ADMIN_POLICIES] : POLICIES;
  return all.filter((p) => p.table === table && (p.command === command || p.command === "all"));
}

/** Detecta la recursion infinita de politicas (42P17) para (table, command). */
export function detectPolicyRecursion(
  table: string,
  command: RlsCommand,
  opts: { adminSchema?: boolean } = {}
): string | null {
  const seen = new Set<string>();
  const visit = (t: string, cmd: RlsCommand): string | null => {
    const key = `${t}:${cmd}`;
    if (seen.has(key)) return t;
    seen.add(key);
    for (const p of policiesFor(t, cmd, opts)) {
      if (p.selfReferencing) return t;
      for (const ref of p.referencesTables ?? []) {
        // La subconsulta es un SELECT sobre `ref`, que expande sus politicas de SELECT.
        if (rlsEnabledFor(ref)) {
          const r = visit(ref, "select");
          if (r) return r;
        }
      }
    }
    seen.delete(key);
    return null;
  };
  return visit(table, command);
}

/** Resultado de evaluar RLS para una fila. */
export function rowPassesUsing(
  table: string,
  command: RlsCommand,
  row: Row,
  session: RlsSession,
  ctx: RlsContext
): boolean {
  if (session.role === "service_role" || !rlsEnabledFor(table)) return true;
  const policies = policiesFor(table, command, { adminSchema: session.adminSchema });
  // Politicas PERMISSIVE: la fila pasa si CUALQUIERA la permite. Sin politicas => denegado.
  return policies.some((p) => (p.using ? p.using(row, ctx) : false));
}

export function rowPassesWithCheck(
  table: string,
  command: "insert" | "update",
  row: Row,
  session: RlsSession,
  ctx: RlsContext
): boolean {
  if (session.role === "service_role" || !rlsEnabledFor(table)) return true;
  const policies = policiesFor(table, command, { adminSchema: session.adminSchema });
  return policies.some((p) => {
    const fn = p.withCheck ?? p.using;
    return fn ? fn(row, ctx) : false;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones puras de alto nivel (para asertar directamente sin DB fake)
// ─────────────────────────────────────────────────────────────────────────────

const toMs = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const t = new Date(v as string).getTime();
  return Number.isNaN(t) ? null : t;
};

/**
 * Replica EXACTA de la politica "Paid lessons for subscribers" (sin el `is_free = false`)
 * tras fix-subscription-webhook-and-access.sql:
 *
 *   exists (select 1 from subscriptions where user_id = auth.uid()
 *           and public.user_has_active_access(auth.uid()))
 *
 * `user_has_active_access()` reproduce isSubscriptionActive() de subscription-logic.ts, asi que
 * delegamos directamente en esa funcion en vez de reimplementar la regla una tercera vez (app +
 * SQL + este helper): active/trialing y past_due con gracia de GRACE_PERIOD_DAYS, canceled con
 * acceso mientras current_period_end siga en el futuro (cancelar no corta lo ya pagado),
 * pending/inactive/otro sin acceso.
 */
export function canReadPaidLessons(
  subscriptionRows: Row[],
  userId: string | null,
  now: Date
): boolean {
  if (userId === null) return false;
  return subscriptionRows.some((s) => {
    if (s.user_id !== userId) return false;
    const end = toMs(s.current_period_end);
    return isSubscriptionActive(String(s.status), end === null ? null : new Date(end), now);
  });
}

/** Politicas "Free lessons are public" OR "Paid lessons for subscribers". */
export function canReadLesson(
  lesson: Row,
  subscriptionRows: Row[],
  userId: string | null,
  now: Date
): boolean {
  if (lesson.is_free === true) return true;
  if (lesson.is_free === false) return canReadPaidLessons(subscriptionRows, userId, now);
  return false; // is_free NULL => ninguna politica la deja pasar
}

/** "Users see own subscription" (+ "Admins read all subscriptions" con adminSchema). */
export function canSelectSubscriptionRow(
  row: Row,
  userId: string | null,
  opts: { callerIsAdminProfile?: boolean } = {}
): boolean {
  if (userId !== null && row.user_id === userId) return true;
  return opts.callerIsAdminProfile === true;
}

/** Solo service_role escribe subscriptions: no hay politicas INSERT/UPDATE/DELETE. */
export const SUBSCRIPTIONS_WRITABLE_BY_USERS = false as const;

/** "Users see own profile". */
export function canSelectProfile(row: Row, userId: string | null): boolean {
  return userId !== null && row.id === userId;
}

/** "Users update own profile". */
export function canUpdateProfile(row: Row, userId: string | null): boolean {
  return userId !== null && row.id === userId;
}

/**
 * webhook_events / rate_limits: el SQL NO habilita RLS => con la anon key publica cualquier
 * cliente puede leer/insertar/modificar/borrar esas tablas via PostgREST. (Riesgo real: se puede
 * "envenenar" la deduplicacion insertando un event_id, o borrar eventos para forzar reprocesos.)
 */
export function isTableExposedWithoutRls(table: string): boolean {
  return RLS_ENABLED[table] === false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparador de capas de acceso (H5): RLS vs app vs rutas API
//
// Antes del fix de "eventos de otra preapproval pisan la fila vigente" (WHP-06) y de unificar
// las rutas /api/videos/signed-url, /api/progress y /api/notes para que usen
// userHasActiveAccess() en vez de cada una re-implementar el chequeo a su manera, estas 3 capas
// podian dar resultados DISTINTOS para el MISMO usuario (H5): la RLS de "lessons" exigia
// status IN (active,trialing) y current_period_end > now() SIN gracia; getSubscription() tomaba
// la fila mas nueva por created_at (no necesariamente la que daba acceso); y las rutas API
// usaban `.maybeSingle()` sobre status IN (active,trialing), que fallaba con PGRST116 (y por lo
// tanto DENEGABA) apenas el usuario tenia 2+ filas en subscriptions.
//
// Ahora las 4 capas (RLS via user_has_active_access(), getSubscription(), userHasActiveAccess()
// y las rutas API que lo usan) delegan en la MISMA regla (isSubscriptionActive) y en el MISMO
// criterio de "mejor fila" cuando hay varias — por eso este comparador ahora debe dar los
// mismos cuatro valores siempre. Se conserva como test de regresion de esa consistencia.
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessLayers {
  /** Politica RLS de lessons pagas (`canReadPaidLessons` / `user_has_active_access`). */
  rlsPaidLessons: boolean;
  /**
   * getSubscription(): entre TODAS las filas del usuario, prefiere la que hoy da acceso
   * (isSubscriptionActive), priorizando el vencimiento mas lejano; si ninguna da acceso, cae a
   * la mas reciente por created_at (solo para mostrar su estado). appBestRow es el resultado de
   * aplicar isSubscriptionActive sobre esa eleccion — equivalente a userHasActiveAccess().
   */
  appBestRow: boolean;
  /**
   * Rutas /api/videos/signed-url, /api/progress y /api/notes: ahora llaman a
   * userHasActiveAccess() directamente (antes cada una reimplementaba el chequeo distinto,
   * sin gracia y sin contemplar 2+ filas). Debe coincidir siempre con appBestRow.
   */
  apiRoutes: boolean;
}

export function evaluateAccessLayers(
  subscriptionRows: Row[],
  userId: string,
  now: Date
): AccessLayers {
  const own = subscriptionRows.filter((s) => s.user_id === userId);

  // getSubscription(): entre las filas que isSubscriptionActive() aprueba, la de vencimiento
  // mas lejano; si ninguna, la mas reciente por created_at (empates: la insertada ultima).
  const withAccess = (r: Row) =>
    isSubscriptionActive(
      String(r.status),
      r.current_period_end ? new Date(r.current_period_end as string) : null,
      now
    );

  const active = own.filter(withAccess);
  let best: Row | undefined;
  if (active.length > 0) {
    const endMs = (r: Row) => (r.current_period_end ? toMs(r.current_period_end) ?? Infinity : Infinity);
    best = [...active].sort((a, b) => endMs(b) - endMs(a))[0];
  } else if (own.length > 0) {
    const indexed = own.map((r, i) => ({ r, i }));
    indexed.sort((a, b) => {
      const ta = toMs(a.r.created_at) ?? -Infinity;
      const tb = toMs(b.r.created_at) ?? -Infinity;
      return tb - ta || b.i - a.i;
    });
    best = indexed[0]?.r;
  }

  const appBestRow = best ? withAccess(best) : false;

  return {
    rlsPaidLessons: canReadPaidLessons(own, userId, now),
    appBestRow,
    // Antes tenia su propia logica ad-hoc (y su propio bug de "2+ filas => deny"); ahora las
    // rutas reales llaman a userHasActiveAccess(), que es exactamente appBestRow.
    apiRoutes: appBestRow,
  };
}
