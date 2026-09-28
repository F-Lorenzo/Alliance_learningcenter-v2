/**
 * selftest.test.ts — prueba la propia infraestructura de test-utils y sirve de EJEMPLO CANONICO.
 *
 * Bloques:
 *  1. fake-supabase (maybeSingle, single, upsert, unique, count/head, failNext, hold, interleave, reloj...)
 *  2. RLS (fake-supabase-server + rls.ts)
 *  3. mp-mock
 *  4. smoke end-to-end contra las rutas REALES: webhook y checkout
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { installHarness, makeSubscriptionRow, TEST_USER_ID, OTHER_USER_ID } from "@/test-utils/harness";
import { createFakeDb, makeUser, randomInterleave, rpcFail, toPgTimestamp, type Row } from "@/test-utils/fake-supabase";
import { createFakeServerClient } from "@/test-utils/fake-supabase-server";
import {
  canReadLesson,
  canReadPaidLessons,
  evaluateAccessLayers,
  isTableExposedWithoutRls,
} from "@/test-utils/rls";
import { MpWorld, createMercadoPagoModule, mpError } from "@/test-utils/mp-mock";
import {
  buildCheckoutRequest,
  buildInvalidSignatureRequest,
  buildWebhookRequest,
  signWebhook,
} from "@/test-utils/mp-webhook";

// ── 1) Mocks: literales en el archivo (vi.mock se hoistea) ────────────────────────────────────────
vi.mock("@/lib/supabase/admin", async () => (await import("@/test-utils/harness")).adminMock());
vi.mock("@/lib/supabase/server", async () => (await import("@/test-utils/harness")).serverMock());
vi.mock("mercadopago", async () => (await import("@/test-utils/harness")).mercadopagoMock());

// ── 2) Rutas REALES (se importan despues de los mocks hoisteados) ─────────────────────────────────
import { POST as webhookPOST } from "@/app/api/webhooks/mp/route";
import { POST as checkoutPOST } from "@/app/api/checkout/mp/route";

// ── 3) Harness ────────────────────────────────────────────────────────────────────────────────────
const t = installHarness();

afterEach(() => {
  vi.useRealTimers();
});

const rows = (r: unknown) => r as Row[];

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 1. fake-supabase
// ═════════════════════════════════════════════════════════════════════════════════════════════════
describe("fake-supabase: semantica PostgREST", () => {
  it("maybeSingle(): 0 filas => data null SIN error", async () => {
    const db = createFakeDb();
    const r = await db.from("subscriptions").select("*").eq("user_id", "nadie").maybeSingle();
    expect(r.data).toBeNull();
    expect(r.error).toBeNull();
  });

  it("maybeSingle(): 2+ filas => data null Y error PGRST116 (status 406)", async () => {
    const db = createFakeDb();
    db.seed("subscriptions", [
      { user_id: "u1", status: "active" },
      { user_id: "u1", status: "canceled" },
    ]);
    const r = await db.from("subscriptions").select("*").eq("user_id", "u1").maybeSingle();
    expect(r.data).toBeNull();
    expect(r.error?.code).toBe("PGRST116");
    expect(r.error?.details).toContain("2 rows");
    expect(r.status).toBe(406);
  });

  it("maybeSingle() con order+limit(1) devuelve la fila mas nueva (patron de getSubscription)", async () => {
    const db = createFakeDb();
    db.seed("subscriptions", [
      { user_id: "u1", status: "canceled", created_at: "2025-01-01T00:00:00Z" },
      { user_id: "u1", status: "active", created_at: "2025-02-01T00:00:00Z" },
    ]);
    const r = await db
      .from("subscriptions")
      .select("status")
      .eq("user_id", "u1")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(r.error).toBeNull();
    expect(r.data).toEqual({ status: "active" });
  });

  it("single(): 0 filas => error PGRST116", async () => {
    const db = createFakeDb();
    const r = await db.from("coupons").select("*").eq("code", "X").single();
    expect(r.data).toBeNull();
    expect(r.error?.code).toBe("PGRST116");
  });

  it("insert(...).select().single() devuelve la fila insertada con defaults", async () => {
    const db = createFakeDb();
    const r = await db
      .from("subscriptions")
      .insert({ user_id: "u1" })
      .select("id, status, plan")
      .single();
    expect(r.error).toBeNull();
    expect(r.data).toMatchObject({ status: "inactive", plan: "monthly" });
    expect(String((r.data as Row).id)).toMatch(/^00000000-0000-4000-8000-/);
  });

  it("insert sin select devuelve data null (y status 201)", async () => {
    const db = createFakeDb();
    const r = await db.from("subscriptions").insert({ user_id: "u1" });
    expect(r.data).toBeNull();
    expect(r.error).toBeNull();
    expect(r.status).toBe(201);
  });

  it("update sin .select() => data null; update que no matchea nada => sin error", async () => {
    const db = createFakeDb();
    db.seed("subscriptions", { user_id: "u1", status: "active" });
    const ok = await db.from("subscriptions").update({ status: "canceled" }).eq("user_id", "u1");
    expect(ok.data).toBeNull();
    expect(db.dump("subscriptions")[0].status).toBe("canceled");
    const none = await db.from("subscriptions").update({ status: "x" }).eq("user_id", "otro");
    expect(none.error).toBeNull();
    const withSel = await db.from("subscriptions").update({ status: "active" }).eq("user_id", "u1").select("status");
    expect(withSel.data).toEqual([{ status: "active" }]);
  });

  it("upsert con ignoreDuplicates: 1ra vez devuelve fila; conflicto => sin fila y SIN error", async () => {
    const db = createFakeDb();
    const up = () =>
      db
        .from("webhook_events")
        .upsert({ event_id: "req-1", type: "payment", status: "pending", payload: { a: 1 } }, { onConflict: "event_id", ignoreDuplicates: true })
        .select("id")
        .maybeSingle();
    const first = await up();
    expect(first.error).toBeNull();
    expect(first.data).not.toBeNull();
    const second = await up();
    expect(second.error).toBeNull();
    expect(second.data).toBeNull();
    expect(db.count("webhook_events")).toBe(1);
  });

  it("upsert SIN ignoreDuplicates actualiza la fila existente (merge de columnas enviadas)", async () => {
    const db = createFakeDb();
    db.seed("progress", { user_id: "u1", lesson_id: "l1", watched_seconds: 10, completed: false });
    const r = await db
      .from("progress")
      .upsert({ user_id: "u1", lesson_id: "l1", watched_seconds: 99 }, { onConflict: "user_id,lesson_id" })
      .select("watched_seconds, completed");
    expect(r.error).toBeNull();
    expect(r.data).toEqual([{ watched_seconds: 99, completed: false }]);
    expect(db.count("progress")).toBe(1);
  });

  it("upsert con onConflict sin constraint => error 42P10 (como Postgres)", async () => {
    const db = createFakeDb();
    const r = await db.from("subscriptions").upsert({ user_id: "u1" }, { onConflict: "user_id" });
    expect(r.error?.code).toBe("42P10");
  });

  it("UNIQUE: webhook_events.event_id unique por defecto; subscriptions SIN unique", async () => {
    const db = createFakeDb();
    await db.from("webhook_events").insert({ event_id: "e1", type: "payment" });
    const dup = await db.from("webhook_events").insert({ event_id: "e1", type: "payment" });
    expect(dup.error?.code).toBe("23505");
    expect(db.count("webhook_events")).toBe(1);

    await db.from("subscriptions").insert({ user_id: "u1", mp_subscription_id: "P1" });
    const again = await db.from("subscriptions").insert({ user_id: "u1", mp_subscription_id: "P1" });
    expect(again.error).toBeNull();
    expect(db.count("subscriptions")).toBe(2);
  });

  it("UNIQUE configurable: createFakeDb({unique}) y NOT NULL", async () => {
    const db = createFakeDb({ unique: { subscriptions: ["user_id"] } });
    await db.from("subscriptions").insert({ user_id: "u1" });
    const dup = await db.from("subscriptions").insert({ user_id: "u1" });
    expect(dup.error?.code).toBe("23505");
    const nn = await db.from("subscriptions").insert({ status: "active" });
    expect(nn.error?.code).toBe("23502");
  });

  it("insert multiple es atomico: si una viola UNIQUE no se inserta ninguna", async () => {
    const db = createFakeDb();
    const r = await db.from("webhook_events").insert([
      { event_id: "a", type: "t" },
      { event_id: "a", type: "t" },
    ]);
    expect(r.error?.code).toBe("23505");
    expect(db.count("webhook_events")).toBe(0);
  });

  it("select(cols,{count:'exact',head:true}) devuelve count y data null", async () => {
    const db = createFakeDb();
    db.seed("rate_limits", [{ user_id: "u1" }, { user_id: "u1" }, { user_id: "u2" }]);
    const r = await db.from("rate_limits").select("*", { count: "exact", head: true }).eq("user_id", "u1");
    expect(r.data).toBeNull();
    expect(r.count).toBe(2);
    const withRows = await db.from("rate_limits").select("id", { count: "exact" }).eq("user_id", "u1").limit(1);
    expect(withRows.count).toBe(2);
    expect(rows(withRows.data)).toHaveLength(1);
  });

  it("filtros: eq neq in is gte lte gt lt ilike range order", async () => {
    const db = createFakeDb();
    db.seed("subscriptions", [
      { user_id: "u1", status: "active", current_period_end: "2025-02-01T00:00:00Z" },
      { user_id: "u2", status: "trialing", current_period_end: null },
      { user_id: "u3", status: "canceled", current_period_end: "2025-03-01T00:00:00Z" },
    ]);
    const q = (f: (b: ReturnType<typeof db.from>) => unknown) => f(db.from("subscriptions").select("user_id")) as PromiseLike<{ data: Row[] | null }>;
    expect((await q((b) => b.in("status", ["active", "trialing"]))).data).toHaveLength(2);
    expect((await q((b) => b.neq("status", "active"))).data).toHaveLength(2);
    expect((await q((b) => b.is("current_period_end", null))).data).toEqual([{ user_id: "u2" }]);
    // NULL no cumple gte (semantica SQL)
    expect((await q((b) => b.gte("current_period_end", "2025-01-01T00:00:00Z"))).data).toHaveLength(2);
    expect((await q((b) => b.lt("current_period_end", "2025-02-15T00:00:00Z"))).data).toEqual([{ user_id: "u1" }]);
    const ordered = await db.from("subscriptions").select("user_id").order("current_period_end", { ascending: false });
    // DESC => NULLS FIRST (default de Postgres)
    expect(rows(ordered.data).map((r) => r.user_id)).toEqual(["u2", "u3", "u1"]);
    const page = await db.from("subscriptions").select("user_id").order("user_id").range(1, 2);
    expect(rows(page.data).map((r) => r.user_id)).toEqual(["u2", "u3"]);
  });

  it("ilike: % y _ son comodines (un cupon '%' matchea cualquiera); case-insensitive", async () => {
    const db = createFakeDb();
    db.seed("coupons", [{ code: "ALLIANCE20", discount_type: "percentage", discount_value: 20 }]);
    const find = (pattern: string) => db.from("coupons").select("code").ilike("code", pattern);
    expect((await find("alliance20")).data).toHaveLength(1);
    expect((await find("%")).data).toHaveLength(1);
    expect((await find("ALLIANCE_0")).data).toHaveLength(1); // _ = exactamente 1 caracter ("2")
    expect((await find("ALLIANCE_")).data).toHaveLength(0); // le falta 1 caracter
    expect((await find("ALLIANCE\_20")).data).toHaveLength(0); // \_ = guion bajo literal
  });

  it("timestamps se devuelven como PostgREST (+00:00) y los defaults usan el reloj (vi.setSystemTime)", async () => {
    t.setNow("2025-03-10T15:00:00.000Z");
    const db = createFakeDb();
    const [row] = db.seed("subscriptions", { user_id: "u1", current_period_end: "2025-04-10T15:00:00.000Z" });
    expect(row.created_at).toBe("2025-03-10T15:00:00+00:00");
    expect(row.updated_at).toBe("2025-03-10T15:00:00+00:00");
    expect(row.current_period_end).toBe("2025-04-10T15:00:00+00:00");
    t.advance({ days: 1, minutes: 30 });
    const ins = await db.from("subscriptions").insert({ user_id: "u2" }).select("created_at").single();
    expect(rows([ins.data])[0].created_at).toBe("2025-03-11T15:30:00+00:00");
    expect(toPgTimestamp(new Date("2025-01-01T00:00:00.120Z"))).toBe("2025-01-01T00:00:00.12+00:00");
    const bad = await db.from("subscriptions").insert({ user_id: "u3", current_period_end: "no-es-fecha" });
    expect(bad.error?.code).toBe("22007");
  });

  it("reloj inyectable independiente de vi.setSystemTime", () => {
    const db = createFakeDb({ now: () => new Date("2030-01-01T00:00:00Z") });
    const [row] = db.seed("subscriptions", { user_id: "u1" });
    expect(row.created_at).toBe("2030-01-01T00:00:00+00:00");
  });

  it("orden: empates de created_at se rompen por insercion en la direccion del orden", async () => {
    t.setNow("2025-01-01T00:00:00Z");
    const db = createFakeDb();
    db.seed("subscriptions", [
      { user_id: "u1", status: "first" },
      { user_id: "u1", status: "second" },
    ]);
    const desc = await db.from("subscriptions").select("status").order("created_at", { ascending: false }).limit(1).maybeSingle();
    expect(desc.data).toEqual({ status: "second" });
  });

  it("failNext: no aplica la operacion y devuelve {error}; se consume tras `times`", async () => {
    const db = createFakeDb();
    const h = db.failNext("subscriptions", "insert", { message: "boom", code: "XX000" });
    const r1 = await db.from("subscriptions").insert({ user_id: "u1" });
    expect(r1.error?.message).toBe("boom");
    expect(db.count("subscriptions")).toBe(0);
    const r2 = await db.from("subscriptions").insert({ user_id: "u1" });
    expect(r2.error).toBeNull();
    expect(h.hits).toBe(1);
  });

  it("failNext con applyBeforeFail: se aplica pero el cliente recibe error (respuesta perdida)", async () => {
    const db = createFakeDb();
    db.failNext("subscriptions", "insert", "timeout", { applyBeforeFail: true });
    const r = await db.from("subscriptions").insert({ user_id: "u1" });
    expect(r.error?.message).toBe("timeout");
    expect(db.count("subscriptions")).toBe(1);
  });

  it("failNext con reject: la promesa rechaza; con `when` filtra por llamada; '*' comodin", async () => {
    const db = createFakeDb();
    db.failNext("*", "select", new Error("red caida"), { reject: true, when: (c) => c.table === "coupons" });
    await expect(db.from("coupons").select("*")).rejects.toThrow("red caida");
    const ok = await db.from("subscriptions").select("*");
    expect(ok.error).toBeNull();
  });

  it("db.calls registra todas las llamadas con filtros y valores", async () => {
    const db = createFakeDb();
    await db.from("subscriptions").insert({ user_id: "u1" });
    await db.from("subscriptions").update({ status: "active" }).eq("user_id", "u1").in("status", ["inactive"]);
    const calls = db.callsFor("subscriptions");
    expect(calls.map((c) => c.op)).toEqual(["insert", "update"]);
    expect(calls[1].filters).toEqual([
      { op: "eq", column: "user_id", value: "u1" },
      { op: "in", column: "status", value: ["inactive"] },
    ]);
    expect(calls[1].values).toEqual({ status: "active" });
    expect(calls[1].result).toEqual({ rows: 1, error: null });
  });

  it("rpc: increment_coupon_uses simulado; funciones desconocidas => PGRST202; handlers registrables", async () => {
    const db = createFakeDb();
    const [c] = db.seed("coupons", { code: "X", discount_type: "fixed", discount_value: 1 });
    const r = await db.rpc("increment_coupon_uses", { coupon_id: c.id });
    expect(r.error).toBeNull();
    expect(db.dump("coupons")[0].current_uses).toBe(1);
    const unknown = await db.rpc("no_existe", {});
    expect(unknown.error?.code).toBe("PGRST202");
    db.registerRpc("falla", () => rpcFail("nope", "P0001"));
    expect((await db.rpc("falla")).error?.message).toBe("nope");
    db.failNext("increment_coupon_uses", "rpc", "rpc caido");
    expect((await db.rpc("increment_coupon_uses", { coupon_id: c.id })).error?.message).toBe("rpc caido");
    expect(db.dump("coupons")[0].current_uses).toBe(1);
  });

  it("auth.admin.updateUserById es un espia y MERGEA app_metadata", async () => {
    const db = createFakeDb();
    db.seedUsers(makeUser({ id: "u1", app_metadata: { role: "user", provider: "email" } }));
    const r = await db.auth.admin.updateUserById("u1", { app_metadata: { role: "admin" } });
    expect(r.error).toBeNull();
    expect(db.auth.admin.updateUserById).toHaveBeenCalledWith("u1", { app_metadata: { role: "admin" } });
    expect(db.users.get("u1")?.app_metadata).toMatchObject({ role: "admin", provider: "email" });
    const missing = await db.auth.admin.updateUserById("nadie", {});
    expect(missing.error?.status).toBe(404);
  });

  it("hold(phase:'after'): la lectura ya ocurrio pero el llamador no la recibio => lectura VIEJA (carrera determinista)", async () => {
    const db = createFakeDb();
    db.seed("subscriptions", { user_id: "u1", status: "canceled" });
    const hold = db.hold("subscriptions", "select", { phase: "after" });

    const flowA = (async () => {
      const { data } = await db.from("subscriptions").select("id, status").eq("user_id", "u1").maybeSingle();
      // decide en base a la lectura (vieja)
      await db.from("subscriptions").update({ plan: `visto:${data?.status}` }).eq("id", data!.id);
    })();

    await hold.reached;
    await db.from("subscriptions").update({ status: "active" }).eq("user_id", "u1"); // otro escritor
    hold.release();
    await flowA;
    expect(db.dump("subscriptions")[0]).toMatchObject({ status: "active", plan: "visto:canceled" });
  });

  it("hold(phase:'before'): la operacion pausada NO se aplico todavia", async () => {
    const db = createFakeDb();
    const hold = db.hold("subscriptions", "insert");
    const p = db.from("subscriptions").insert({ user_id: "u1" });
    const pending = Promise.resolve(p);
    await hold.reached;
    expect(db.count("subscriptions")).toBe(0);
    hold.release();
    await pending;
    expect(db.count("subscriptions")).toBe(1);
  });

  it("interleave: cede el control entre operaciones; randomInterleave es reproducible por semilla", async () => {
    const run = async (seed: number) => {
      const db = createFakeDb({ interleave: randomInterleave(seed, 4) });
      const flow = async (tag: string) => {
        await db.from("subscriptions").select("*").eq("user_id", tag);
        await db.from("subscriptions").insert({ user_id: tag });
      };
      await Promise.all([flow("A"), flow("B")]);
      return db.calls.map((c) => `${c.op}:${(c.filters[0]?.value ?? (c.values as Row)?.user_id) as string}`);
    };
    const a1 = await run(7);
    const a2 = await run(7);
    expect(a1).toEqual(a2);
    expect(a1).toHaveLength(4);

    // El hook recibe cada fase (antes/despues) de cada operacion
    const events: string[] = [];
    const db = createFakeDb({ interleave: (i) => void events.push(`${i.phase}:${i.op}:${i.table}`) });
    await db.from("subscriptions").select("*");
    expect(events).toEqual(["before:select:subscriptions", "after:select:subscriptions"]);
    db.setInterleave(false); // se puede apagar en caliente
    await db.from("subscriptions").select("*");
    expect(events).toHaveLength(2);
  });

  it("seed/dump/find/snapshot/restore/reset", () => {
    const db = createFakeDb();
    db.seed("subscriptions", [{ user_id: "u1" }, { user_id: "u2" }]);
    expect(db.dump("subscriptions")).toHaveLength(2);
    expect(db.find("subscriptions", (r) => r.user_id === "u2")).toBeDefined();
    const snap = db.snapshot();
    db.clear("subscriptions");
    expect(db.count("subscriptions")).toBe(0);
    db.restore(snap);
    expect(db.count("subscriptions")).toBe(2);
    db.reset();
    expect(db.count("subscriptions")).toBe(0);
  });

  it("nested selects no soportados fallan fuerte (no devuelven datos falsos)", async () => {
    const db = createFakeDb();
    await expect(db.from("courses").select("id, lessons(count)")).rejects.toThrow(/relaciones anidadas/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 2. RLS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
describe("RLS: fake-supabase-server + rls.ts", () => {
  it("un usuario autenticado solo VE sus propias suscripciones; anon no ve nada; rls:false ve todo", async () => {
    const db = createFakeDb();
    db.seed("subscriptions", [
      { user_id: TEST_USER_ID, status: "active" },
      { user_id: OTHER_USER_ID, status: "active" },
    ]);
    const me = createFakeServerClient(db, { user: makeUser({ id: TEST_USER_ID }) });
    const mine = await me.from("subscriptions").select("user_id");
    expect(rows(mine.data).map((r) => r.user_id)).toEqual([TEST_USER_ID]);

    const anon = createFakeServerClient(db, { user: null });
    expect(rows((await anon.from("subscriptions").select("*")).data)).toHaveLength(0);

    const noRls = createFakeServerClient(db, { user: makeUser({ id: TEST_USER_ID }), rls: false });
    expect(rows((await noRls.from("subscriptions").select("*")).data)).toHaveLength(2);
  });

  it("con RLS: un usuario NO puede insertar/actualizar subscriptions (solo service_role)", async () => {
    const db = createFakeDb();
    db.seed("subscriptions", { user_id: TEST_USER_ID, status: "canceled" });
    const me = createFakeServerClient(db, { user: makeUser({ id: TEST_USER_ID }) });
    const ins = await me.from("subscriptions").insert({ user_id: TEST_USER_ID, status: "active" });
    expect(ins.error?.code).toBe("42501");
    const upd = await me.from("subscriptions").update({ status: "active" }).eq("user_id", TEST_USER_ID).select("status");
    expect(upd.error).toBeNull();
    expect(upd.data).toEqual([]); // 0 filas: silencioso
    expect(db.dump("subscriptions")[0].status).toBe("canceled");
  });

  it("webhook_events/rate_limits: SIN RLS en el SQL => expuestas a cualquier rol", async () => {
    expect(isTableExposedWithoutRls("webhook_events")).toBe(true);
    expect(isTableExposedWithoutRls("rate_limits")).toBe(true);
    expect(isTableExposedWithoutRls("subscriptions")).toBe(false);
    const db = createFakeDb();
    const anon = createFakeServerClient(db, { user: null });
    const r = await anon.from("webhook_events").insert({ event_id: "envenenado", type: "x" });
    expect(r.error).toBeNull();
    expect(db.count("webhook_events")).toBe(1);
  });

  it("lessons pagas: status active|trialing|past_due con gracia de 3 dias, o canceled con acceso hasta current_period_end", async () => {
    const db = createFakeDb();
    db.seed("lessons", [
      { course_id: "c1", slug: "gratis", title: "G", is_free: true },
      { course_id: "c1", slug: "paga", title: "P", is_free: false },
    ]);
    const now = new Date("2025-03-10T00:00:00Z");
    t.setNow(now);
    const u = makeUser({ id: TEST_USER_ID });
    const client = createFakeServerClient(db, { user: u });
    const slugs = async () => rows((await client.from("lessons").select("slug")).data).map((r) => r.slug);

    expect(await slugs()).toEqual(["gratis"]); // sin suscripcion
    db.seed("subscriptions", makeSubscriptionRow({ current_period_end: null }, now));
    expect((await slugs()).sort()).toEqual(["gratis", "paga"]); // active + periodo NULL => acceso pleno
    db.clear("subscriptions");
    db.seed("subscriptions", makeSubscriptionRow({ status: "past_due", current_period_end: now.toISOString() }, now));
    expect((await slugs()).sort()).toEqual(["gratis", "paga"]); // past_due, vencido HOY => dentro de la gracia de 3 dias
    db.clear("subscriptions");
    const longAgo = new Date(now); longAgo.setUTCDate(longAgo.getUTCDate() - 10);
    db.seed("subscriptions", makeSubscriptionRow({ status: "past_due", current_period_end: longAgo.toISOString() }, now));
    expect(await slugs()).toEqual(["gratis"]); // past_due vencido hace 10 dias => fuera de gracia
    db.clear("subscriptions");
    db.seed("subscriptions", makeSubscriptionRow({}, now));
    expect((await slugs()).sort()).toEqual(["gratis", "paga"]);
    db.clear("subscriptions");
    // canceled con current_period_end futuro: cancelar no corta el acceso ya pagado.
    const future = new Date(now); future.setUTCDate(future.getUTCDate() + 5);
    db.seed("subscriptions", makeSubscriptionRow({ status: "canceled", current_period_end: future.toISOString() }, now));
    expect((await slugs()).sort()).toEqual(["gratis", "paga"]);
    db.clear("subscriptions");
    // canceled ya vencido: sin acceso (y sin gracia extra).
    db.seed("subscriptions", makeSubscriptionRow({ status: "canceled", current_period_end: longAgo.toISOString() }, now));
    expect(await slugs()).toEqual(["gratis"]);
  });

  it("canReadPaidLessons / canReadLesson / evaluateAccessLayers (funciones puras)", () => {
    const now = new Date("2025-03-10T12:00:00Z");
    const sub = (o: Row): Row => ({ user_id: "u1", status: "active", current_period_end: "2025-03-20T00:00:00Z", ...o });
    expect(canReadPaidLessons([sub({})], "u1", now)).toBe(true);
    expect(canReadPaidLessons([sub({})], "otro", now)).toBe(false);
    // canceled con periodo futuro: SI da acceso (cancelar no corta lo ya pagado).
    expect(canReadPaidLessons([sub({ status: "canceled" })], "u1", now)).toBe(true);
    expect(canReadPaidLessons([sub({ status: "canceled", current_period_end: "2025-03-01T00:00:00Z" })], "u1", now)).toBe(false);
    expect(canReadPaidLessons([sub({ current_period_end: null })], "u1", now)).toBe(true); // active + null => acceso pleno
    expect(canReadPaidLessons([sub({ current_period_end: now.toISOString() })], "u1", now)).toBe(true); // dentro de la gracia
    expect(canReadLesson({ is_free: true }, [], null, now)).toBe(true);
    expect(canReadLesson({ is_free: false }, [sub({})], "u1", now)).toBe(true);

    // Las 3 capas ahora coinciden SIEMPRE (antes podian discrepar — H5, ver el comentario de
    // evaluateAccessLayers): periodo vencido hace 1 dia, dentro de la gracia de 3 dias.
    const expired = sub({ current_period_end: "2025-03-09T12:00:00Z", created_at: "2025-01-01T00:00:00Z" });
    const layers = evaluateAccessLayers([expired], "u1", now);
    expect(layers.rlsPaidLessons).toBe(true);
    expect(layers.appBestRow).toBe(true);
    expect(layers.apiRoutes).toBe(true);

    // 2 filas para el mismo usuario (ej. una vieja cancelada + la vigente): elige la que da
    // acceso en vez de fallar o tomar la mas nueva por created_at a ciegas.
    const old = sub({ status: "canceled", current_period_end: "2025-01-01T00:00:00Z", mp_subscription_id: "OLD", created_at: "2024-01-01T00:00:00Z" });
    const current = sub({ mp_subscription_id: "NEW", created_at: "2025-02-01T00:00:00Z" });
    const two = evaluateAccessLayers([old, current], "u1", now);
    expect(two.rlsPaidLessons).toBe(true);
    expect(two.appBestRow).toBe(true);
    expect(two.apiRoutes).toBe(true);
  });

  it("adminSchema:true modela la recursion 42P17 de admin-schema.sql (opt-in, hipotesis no verificada)", async () => {
    const db = createFakeDb();
    const me = createFakeServerClient(db, { user: makeUser({ id: TEST_USER_ID }), rls: { adminSchema: true } });
    const r = await me.from("profiles").select("*");
    expect(r.error?.code).toBe("42P17");
    const s = await me.from("subscriptions").select("*");
    expect(s.error?.code).toBe("42P17");
  });

  it("auth del cliente server: getUser, sesion faltante, signInWithPassword, signUp + trigger de profile", async () => {
    const db = createFakeDb();
    const client = createFakeServerClient(db, { user: null });
    const anon = await client.auth.getUser();
    expect(anon.data.user).toBeNull();
    expect(anon.error?.name).toBe("AuthSessionMissingError");

    const su = await client.auth.signUp({ email: "nuevo@example.com", password: "secreta1", options: { data: { full_name: "Nuevo" } } });
    expect(su.error).toBeNull();
    expect(su.data.session).toBeNull(); // requiere confirmar email
    expect(db.find("profiles", (p) => p.full_name === "Nuevo")).toBeDefined();
    const noConfirm = await client.auth.signInWithPassword({ email: "nuevo@example.com", password: "secreta1" });
    expect(noConfirm.error?.code).toBe("email_not_confirmed");

    db.seedUsers(makeUser({ id: TEST_USER_ID, email: "ok@example.com" }));
    client.setCredentials("ok@example.com", "clave123");
    const bad = await client.auth.signInWithPassword({ email: "ok@example.com", password: "mal" });
    expect(bad.error?.code).toBe("invalid_credentials");
    const good = await client.auth.signInWithPassword({ email: "ok@example.com", password: "clave123" });
    expect(good.error).toBeNull();
    expect((await client.auth.getUser()).data.user?.id).toBe(TEST_USER_ID);
    await client.auth.signOut();
    expect((await client.auth.getUser()).data.user).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 3. mp-mock + builders de webhook
// ═════════════════════════════════════════════════════════════════════════════════════════════════
describe("mp-mock", () => {
  it("createPreapproval/get/update/cancel + last_modified sigue al reloj", async () => {
    t.setNow("2025-03-10T15:00:00Z");
    const w = new MpWorld();
    const mod = createMercadoPagoModule(() => w);
    const cfg = new mod.MercadoPagoConfig({ accessToken: "TEST-x" });
    const api = new mod.PreApproval(cfg);

    const created = await api.create({
      body: {
        reason: "Plan",
        external_reference: "u1",
        payer_email: "a@b.c",
        back_url: "http://localhost/planes/exito",
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 20000, currency_id: "ARS" },
        status: "pending",
      },
    });
    expect(created.status).toBe("pending");
    expect(created.init_point).toContain(created.id);
    expect(created.id).toMatch(/^[0-9a-f]{32}$/);
    expect(w.count("preapproval.create")).toBe(1);

    t.advance({ days: 2 });
    w.authorize(created.id);
    const got = await api.get({ id: created.id });
    expect(got.status).toBe("authorized");
    expect(new Date(got.last_modified as string).toISOString()).toBe("2025-03-12T15:00:00.000Z");
    expect(got.external_reference).toBe("u1");

    const upd = await api.update({ id: created.id, body: { status: "cancelled" } });
    expect(upd.status).toBe("cancelled");
    expect(w.count("preapproval.get")).toBe(1);
    expect(w.counts["preapproval.update"]).toBe(1);
  });

  it("errores: 404 y failNext lanzan OBJETOS PLANOS (como el SDK real), no Error", async () => {
    const w = new MpWorld();
    const mod = createMercadoPagoModule(() => w);
    const api = new mod.PreApproval(new mod.MercadoPagoConfig({ accessToken: "TEST-x" }));

    const notFound = await api.get({ id: "no-existe" }).catch((e: unknown) => e);
    expect(notFound).toMatchObject({ status: 404, error: "not_found" });
    expect(notFound instanceof Error).toBe(false);

    const pre = w.createPreapproval({ external_reference: "u1" });
    w.failNext("preapproval.get", 500);
    const boom = await api.get({ id: pre.id }).catch((e: unknown) => e);
    expect(boom).toEqual(mpError(500));
    expect((await api.get({ id: pre.id })).id).toBe(pre.id); // consumido

    w.failNext("preapproval.get", new Error("socket hang up"));
    await expect(api.get({ id: pre.id })).rejects.toThrow("socket hang up");
  });

  it("respondNext: lectura vieja/desordenada sin tocar el estado real", async () => {
    const w = new MpWorld();
    const mod = createMercadoPagoModule(() => w);
    const api = new mod.PreApproval(new mod.MercadoPagoConfig({ accessToken: "TEST-x" }));
    const pre = w.createPreapproval({ status: "authorized", external_reference: "u1" });
    w.respondNext("preapproval.get", (current) => ({ ...(current as object), status: "pending" }));
    expect((await api.get({ id: pre.id })).status).toBe("pending");
    expect((await api.get({ id: pre.id })).status).toBe("authorized");
  });

  it("payments: chargeRecurring puede omitir preapproval_id / external_reference (pago 'huerfano')", async () => {
    const w = new MpWorld();
    const mod = createMercadoPagoModule(() => w);
    const pay = new mod.Payment(new mod.MercadoPagoConfig({ accessToken: "TEST-x" }));
    const pre = w.createPreapproval({ external_reference: "u1", payer_email: "a@b.c" });
    const full = w.chargeRecurring(pre.id);
    const orphan = w.chargeRecurring(pre.id, { includePreapprovalId: false, includeExternalReference: false });
    const gotFull = (await pay.get({ id: full.id })) as unknown as Row;
    const gotOrphan = (await pay.get({ id: orphan.id })) as unknown as Row;
    expect(gotFull.preapproval_id).toBe(pre.id);
    expect(gotFull.external_reference).toBe("u1");
    expect(gotOrphan.preapproval_id).toBeUndefined();
    expect(gotOrphan.external_reference).toBeUndefined();
    expect(w.getPreapproval(pre.id)?.summarized?.charged_quantity).toBe(2);
  });

  it("access token vacio => 401 (como MP)", async () => {
    const w = new MpWorld();
    const mod = createMercadoPagoModule(() => w);
    const api = new mod.PreApproval(new mod.MercadoPagoConfig({ accessToken: undefined as unknown as string }));
    await expect(api.get({ id: "x" })).rejects.toMatchObject({ status: 401 });
  });

  it("signWebhook replica el manifest del route", () => {
    const s = signWebhook({ secret: "s", dataId: "ABC", requestId: "r1", ts: 1700000000000 });
    expect(s.manifest).toBe("id:ABC;request-id:r1;ts:1700000000000;");
    expect(s.header).toBe(`ts=1700000000000,v1=${s.v1}`);
    expect(s.v1).toMatch(/^[0-9a-f]{64}$/);
    // sin dataId => usa requestId
    expect(signWebhook({ secret: "s", requestId: "r1", ts: 1 }).manifest).toBe("id:r1;request-id:r1;ts:1;");
  });

  it("buildWebhookRequest: URL, headers y body", async () => {
    const req = buildWebhookRequest({ type: "payment", dataId: 123, requestId: "req-X", query: true });
    expect(req.method).toBe("POST");
    expect(req.url).toBe("http://localhost/api/webhooks/mp?data.id=123&type=payment");
    expect(req.headers.get("x-request-id")).toBe("req-X");
    expect(req.headers.get("x-signature")).toMatch(/^ts=\d+,v1=[0-9a-f]{64}$/);
    expect(await req.json()).toMatchObject({ type: "payment", data: { id: "123" }, action: "payment.created" });
    expect(buildWebhookRequest({ type: "t", signature: "missing" }).headers.get("x-signature")).toBeNull();
    const co = buildCheckoutRequest({ plan: "monthly", coupon_code: "X", origin: "https://o.test" });
    expect(co.url).toBe("http://localhost/api/checkout/mp");
    expect(co.headers.get("origin")).toBe("https://o.test");
    expect(await co.json()).toEqual({ plan: "monthly", coupon_code: "X" });
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 4. Smoke end-to-end contra las rutas REALES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
describe("smoke: POST real de /api/webhooks/mp", () => {
  it("preapproval authorized NUEVA => fila subscriptions active con mp_subscription_id y periodo +1 mes", async () => {
    t.setNow("2025-03-10T15:00:00.000Z");
    const pre = t.mp.createPreapproval({
      external_reference: TEST_USER_ID,
      payer_email: "cliente@example.com",
      status: "authorized",
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 20000, currency_id: "ARS" },
    });

    const res = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const subs = t.db.dump("subscriptions");
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({
      user_id: TEST_USER_ID,
      status: "active",
      plan: "monthly",
      mp_subscription_id: pre.id,
    });
    expect(new Date(subs[0].current_period_start as string).toISOString()).toBe("2025-03-10T15:00:00.000Z");
    expect(new Date(subs[0].current_period_end as string).toISOString()).toBe("2025-04-10T15:00:00.000Z");

    const events = t.db.dump("webhook_events");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "subscription_preapproval", status: "processed" });
    expect(t.mp.count("preapproval.get")).toBe(1);
  });

  it("firma invalida / ausente / secret sin configurar => 401 y NO toca la DB ni MP", async () => {
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    for (const sig of ["invalid", "missing", "wrong_secret", "malformed", "no_v1", "no_ts", "no_request_id"] as const) {
      const res = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id, signature: sig }));
      expect(res.status, sig).toBe(401);
    }
    expect((await webhookPOST(buildInvalidSignatureRequest({ type: "payment", dataId: "1" }))).status).toBe(401);

    t.setEnv("MP_WEBHOOK_SECRET", undefined); // fail-closed
    const noSecret = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id }));
    expect(noSecret.status).toBe(401);

    expect(t.db.count("subscriptions")).toBe(0);
    expect(t.db.count("webhook_events")).toBe(0);
    expect(t.mp.calls).toHaveLength(0);
  });

  it("payment approved extiende el periodo de la suscripcion existente", async () => {
    t.setNow("2025-03-10T15:00:00.000Z");
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ mp_subscription_id: pre.id }, new Date()));
    const pay = t.mp.chargeRecurring(pre.id);
    const res = await webhookPOST(buildWebhookRequest({ type: "payment", dataId: pay.id }));
    expect(res.status).toBe(200);
    const [sub] = t.db.dump("subscriptions");
    // periodo vigente hasta 2025-04-10 => se extiende desde ahi
    expect(new Date(sub.current_period_end as string).toISOString()).toBe("2025-05-10T15:00:00.000Z");
  });

  it("[WHP-04 fix] tras un fallo, el reintento de MP con el MISMO x-request-id SE REPROCESA (ya no se pierde el evento)", async () => {
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.mp.failNext("preapproval.get", 500);

    const first = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id, requestId: "req-retry" }));
    expect(first.status).toBe(500);
    expect(t.db.dump("webhook_events")[0]).toMatchObject({ status: "failed" });
    expect(t.db.count("subscriptions")).toBe(0);

    // MP reintenta con el MISMO x-request-id (el mock de MP ya no falla esta vez, como en la
    // vida real: el fallo anterior fue transitorio).
    const retry = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id, requestId: "req-retry" }));
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ ok: true });
    expect(t.db.count("subscriptions")).toBe(1); // esta vez SI se proceso
    expect(t.db.dump("subscriptions")[0]).toMatchObject({ status: "active", mp_subscription_id: pre.id });
    expect(t.db.dump("webhook_events")[0]).toMatchObject({ status: "processed" });
    expect(t.mp.count("preapproval.get")).toBe(2); // 1 intento fallido + 1 reintento exitoso

    // Un reintento POSTERIOR del mismo evento, ya procesado, SI se ignora como duplicado.
    const secondRetry = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id, requestId: "req-retry" }));
    expect(secondRetry.status).toBe(200);
    expect(await secondRetry.json()).toEqual({ ok: true, duplicate: true });
    expect(t.db.count("subscriptions")).toBe(1); // no se creo una segunda fila
    expect(t.mp.count("preapproval.get")).toBe(2); // no volvio a llamar a MP
  });

  it("[WHP-06 fix] un evento tardio de una preapproval VIEJA no pisa la fila de la preapproval NUEVA vigente", async () => {
    // El usuario tuvo una preapproval vieja, cancelada, y se volvio a suscribir (preapproval nueva).
    const oldPre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "cancelled" });
    t.db.seed("subscriptions", makeSubscriptionRow(
      { mp_subscription_id: oldPre.id, status: "canceled", current_period_end: "2025-01-01T00:00:00Z" },
      new Date("2024-12-01T00:00:00Z")
    ));

    const newPre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    const alta = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: newPre.id }));
    expect(alta.status).toBe(200);
    expect(t.db.count("subscriptions")).toBe(2); // la nueva NO reutilizo la fila de la vieja
    const newRow = t.db.find("subscriptions", (r) => r.mp_subscription_id === newPre.id)!;
    expect(newRow.status).toBe("active");

    // Llega tarde (reintento de MP, o el usuario cancelo la vieja recien ahora) un evento de la
    // preapproval VIEJA. Antes del fix, el fallback por user_id la tomaba y pisaba la fila
    // vigente de la nueva (aunque esta ya tuviera su propia identidad).
    const tardio = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: oldPre.id, requestId: "req-tardio" }));
    expect(tardio.status).toBe(200);

    const newRowAfter = t.db.find("subscriptions", (r) => r.id === newRow.id)!;
    expect(newRowAfter.status).toBe("active"); // SIGUE activa: no la piso el evento viejo
    expect(newRowAfter.mp_subscription_id).toBe(newPre.id);
    const oldRowAfter = t.db.find("subscriptions", (r) => r.mp_subscription_id === oldPre.id)!;
    expect(oldRowAfter.status).toBe("canceled"); // el evento se aplico a SU PROPIA fila
  });

  it("[WHP-07 fix] pending (preapproval creada, sin autorizar) NO otorga acceso ni fecha de vencimiento", async () => {
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "pending" });
    const res = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id }));
    expect(res.status).toBe(200);
    const [sub] = t.db.dump("subscriptions");
    expect(sub.status).toBe("pending");
    expect(sub.current_period_end).toBeNull();
  });

  it("[WHP-08 fix] cancelar en MP NO extiende current_period_end (el acceso se mantiene hasta lo ya pagado, no mas)", async () => {
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({
      mp_subscription_id: pre.id,
      status: "active",
      current_period_end: "2025-06-01T00:00:00Z",
    }, new Date("2025-05-01T00:00:00Z")));

    t.mp.cancel(pre.id, { lastModified: "2025-05-15T00:00:00Z" });
    const res = await webhookPOST(buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id }));
    expect(res.status).toBe(200);
    const [sub] = t.db.dump("subscriptions");
    expect(sub.status).toBe("canceled");
    // Antes del fix, calculateNewPeriodEnd se aplicaba a CUALQUIER estado y esto quedaba en
    // 2025-06-15 (o mas), regalando o robando dias segun el caso. Ahora queda intacto.
    expect(new Date(sub.current_period_end as string).toISOString()).toBe("2025-06-01T00:00:00.000Z");
  });

  it("[WHP-09 fix] el mismo pago notificado dos veces (creado + actualizado) extiende el periodo UNA sola vez", async () => {
    t.setNow("2025-03-10T00:00:00.000Z");
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ mp_subscription_id: pre.id }, new Date()));
    const pay = t.mp.chargeRecurring(pre.id);

    const r1 = await webhookPOST(buildWebhookRequest({ type: "payment", dataId: pay.id, requestId: "req-created" }));
    expect(r1.status).toBe(200);
    const afterFirst = t.db.dump("subscriptions")[0].current_period_end;

    // MP notifica el MISMO pago de nuevo (payment.updated) con otro x-request-id.
    const r2 = await webhookPOST(buildWebhookRequest({ type: "payment", dataId: pay.id, requestId: "req-updated" }));
    expect(r2.status).toBe(200);
    expect(await r2.json()).toEqual({ ok: true, duplicate: true });
    const afterSecond = t.db.dump("subscriptions")[0].current_period_end;
    expect(afterSecond).toBe(afterFirst); // NO se extendio una segunda vez
  });

  it("[WHP-10 fix] la renovacion de un plan ANUAL extiende 12 meses, no 1 (antes hardcodeaba 1 mes)", async () => {
    t.setNow("2025-01-10T00:00:00.000Z");
    const pre = t.mp.createPreapproval({
      external_reference: TEST_USER_ID,
      status: "authorized",
      auto_recurring: { frequency: 12, frequency_type: "months", transaction_amount: 199000, currency_id: "ARS" },
    });
    t.db.seed("subscriptions", makeSubscriptionRow({
      mp_subscription_id: pre.id,
      plan: "yearly",
      current_period_end: "2025-01-10T00:00:00.000Z",
    }, new Date()));

    const pay = t.mp.chargeRecurring(pre.id, { amount: 199000 });
    const res = await webhookPOST(buildWebhookRequest({ type: "payment", dataId: pay.id }));
    expect(res.status).toBe(200);
    const [sub] = t.db.dump("subscriptions");
    expect(new Date(sub.current_period_end as string).toISOString()).toBe("2026-01-10T00:00:00.000Z");
  });

  it("[WHP-14 fix] un pago aprobado sobre una suscripcion YA cancelada no la reactiva", async () => {
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "cancelled" });
    t.db.seed("subscriptions", makeSubscriptionRow({
      mp_subscription_id: pre.id,
      status: "canceled",
      current_period_end: "2025-01-01T00:00:00Z",
    }, new Date("2024-12-01T00:00:00Z")));

    const pay = t.mp.chargeRecurring(pre.id);
    const res = await webhookPOST(buildWebhookRequest({ type: "payment", dataId: pay.id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, skipped: "canceled" });
    const [sub] = t.db.dump("subscriptions");
    expect(sub.status).toBe("canceled"); // sigue cancelada, el pago no la reactivo
  });

  it("[WHP-17 fix] firma HMAC valida en formato pero con hash incorrecto no rompe (timing-safe compare)", async () => {
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    // v1 hex valido, largo distinto al real (menor cantidad de bytes) — antes de timingSafeEqual
    // esto no rompia porque comparaba strings, pero se deja como regresion explicita.
    const res = await webhookPOST(
      buildWebhookRequest({ type: "subscription_preapproval", dataId: pre.id, signature: "invalid" })
    );
    expect(res.status).toBe(401);
  });

  // subscription_authorized_payment: confirmado contra produccion (2026-09-28) que Mercado Pago
  // manda este topic ademas de (o en vez de) `payment` para un cobro recurrente real.
  it("subscription_authorized_payment con pago aprobado extiende el periodo (mismo criterio que payment)", async () => {
    t.setNow("2025-03-10T15:00:00.000Z");
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ mp_subscription_id: pre.id }, new Date()));

    const { authorizedPayment } = t.mp.chargeRecurringWithAuthorizedPayment(pre.id);
    const res = await webhookPOST(
      buildWebhookRequest({ type: "subscription_authorized_payment", dataId: authorizedPayment.id })
    );
    expect(res.status).toBe(200);
    const [sub] = t.db.dump("subscriptions");
    expect(sub.status).toBe("active");
    expect(new Date(sub.current_period_end as string).toISOString()).toBe("2025-05-10T15:00:00.000Z");
  });

  it("subscription_authorized_payment con pago NO aprobado no extiende ni otorga acceso", async () => {
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ mp_subscription_id: pre.id, current_period_end: "2025-01-01T00:00:00Z" }, new Date("2024-12-01T00:00:00Z")));

    const rejected = t.mp.createAuthorizedPayment({
      preapproval_id: pre.id,
      payment: { id: "999", status: "rejected" },
    });
    const res = await webhookPOST(buildWebhookRequest({ type: "subscription_authorized_payment", dataId: rejected.id }));
    expect(res.status).toBe(200);
    const [sub] = t.db.dump("subscriptions");
    expect(sub.current_period_end).toBe("2025-01-01T00:00:00+00:00");
  });

  it("[patron real de produccion] `payment` y `subscription_authorized_payment` para el MISMO cobro extienden el periodo UNA sola vez", async () => {
    t.setNow("2025-03-10T00:00:00.000Z");
    const pre = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ mp_subscription_id: pre.id }, new Date()));

    const { payment, authorizedPayment } = t.mp.chargeRecurringWithAuthorizedPayment(pre.id);

    const r1 = await webhookPOST(buildWebhookRequest({ type: "payment", dataId: payment.id, requestId: "req-payment" }));
    expect(r1.status).toBe(200);
    const afterPayment = t.db.dump("subscriptions")[0].current_period_end;

    const r2 = await webhookPOST(
      buildWebhookRequest({ type: "subscription_authorized_payment", dataId: authorizedPayment.id, requestId: "req-authorized-payment" })
    );
    expect(r2.status).toBe(200);
    expect(await r2.json()).toEqual({ ok: true, duplicate: true });
    expect(t.db.dump("subscriptions")[0].current_period_end).toBe(afterPayment); // NO se extendio de nuevo

    // Y en el orden inverso (el topic alternativo llega primero) el resultado es el mismo.
    t.db.reset();
    t.mp.reset();
    const pre2 = t.mp.createPreapproval({ external_reference: TEST_USER_ID, status: "authorized" });
    t.db.seed("subscriptions", makeSubscriptionRow({ mp_subscription_id: pre2.id }, new Date()));
    const charge2 = t.mp.chargeRecurringWithAuthorizedPayment(pre2.id);

    const r3 = await webhookPOST(
      buildWebhookRequest({ type: "subscription_authorized_payment", dataId: charge2.authorizedPayment.id, requestId: "req-ap-first" })
    );
    expect(r3.status).toBe(200);
    const afterFirst = t.db.dump("subscriptions")[0].current_period_end;

    const r4 = await webhookPOST(buildWebhookRequest({ type: "payment", dataId: charge2.payment.id, requestId: "req-payment-second" }));
    expect(r4.status).toBe(200);
    expect(await r4.json()).toEqual({ ok: true, duplicate: true });
    expect(t.db.dump("subscriptions")[0].current_period_end).toBe(afterFirst);
  });
});

describe("smoke: POST real de /api/checkout/mp", () => {
  it("usuario confirmado + plan monthly => init_point y payload a MP con external_reference", async () => {
    const user = t.loginAs({ id: TEST_USER_ID, email: "cliente@example.com" });
    const res = await checkoutPOST(buildCheckoutRequest({ plan: "monthly", origin: "https://alliance.example.test" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { init_point: string };
    expect(body.init_point).toContain("https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=");

    const [call] = t.mp.callsTo("preapproval.create");
    const sent = (call.args as { body: Record<string, unknown> }).body;
    expect(sent).toMatchObject({
      external_reference: user.id,
      payer_email: "cliente@example.com",
      back_url: "https://alliance.example.test/planes/exito",
      status: "pending",
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 20000, currency_id: "ARS" },
    });
    expect(call.accessToken).toBe(t.mpAccessToken);
    // La preapproval quedo registrada en el "mundo" MP y NO hay fila en subscriptions (la crea el webhook)
    expect(t.mp.preapprovalsFor(user.id)).toHaveLength(1);
    expect(t.db.count("subscriptions")).toBe(0);
    // rate limit real corrio sobre la tabla rate_limits del fake
    expect(t.db.count("rate_limits")).toBe(1);
  });

  it("sin sesion => 401; email sin confirmar => 403; plan invalido => 400; sin MP_ACCESS_TOKEN => 500", async () => {
    expect((await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }))).status).toBe(401);

    t.loginAs({ email_confirmed_at: null });
    expect((await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }))).status).toBe(403);

    t.loginAs({});
    expect((await checkoutPOST(buildCheckoutRequest({ plan: "lifetime" }))).status).toBe(400);

    t.setEnv("MP_ACCESS_TOKEN", undefined);
    expect((await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }))).status).toBe(500);
    expect(t.mp.calls).toHaveLength(0);
  });

  it("cupon: aplica descuento, incrementa usos via rpc; falla de MP => no se consume el cupon", async () => {
    t.loginAs({});
    t.db.seed("coupons", { code: "ALLIANCE20", discount_type: "percentage", discount_value: 20, applicable_plan: "all" });
    const ok = await checkoutPOST(buildCheckoutRequest({ plan: "monthly", coupon_code: "alliance20" }));
    expect(ok.status).toBe(200);
    const sent = (t.mp.callsTo("preapproval.create")[0].args as { body: { auto_recurring: { transaction_amount: number } } }).body;
    expect(sent.auto_recurring.transaction_amount).toBe(16000);
    expect(t.db.dump("coupons")[0].current_uses).toBe(1);

    t.mp.failNext("preapproval.create", 500);
    const fail = await checkoutPOST(buildCheckoutRequest({ plan: "monthly", coupon_code: "ALLIANCE20" }));
    expect(fail.status).toBe(500);
    expect(t.db.dump("coupons")[0].current_uses).toBe(1); // no se quemo el cupon
  });

  it("rate limit real (5/min) sobre el fake DB => 429 a la 6ta; con reloj avanzado se libera", async () => {
    t.setNow("2025-03-10T15:00:00Z");
    t.loginAs({});
    for (let i = 0; i < 5; i++) {
      expect((await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }))).status).toBe(200);
    }
    expect((await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }))).status).toBe(429);
    t.advance(61_000);
    expect((await checkoutPOST(buildCheckoutRequest({ plan: "monthly" }))).status).toBe(200);
  });

  it("breakAdminClient: createAdminClient lanza => el cupón y la verificación de suscripción existente se ignoran en silencio (fail-open) y se cobra precio completo", async () => {
    t.loginAs({});
    t.db.seed("coupons", { code: "ALLIANCE20", discount_type: "percentage", discount_value: 20 });
    t.rateLimit.limited = false;
    // El rate limit real usa el admin client y tolera fallas (deja pasar); applyCoupon captura el error.
    t.breakAdminClient();
    const res = await checkoutPOST(buildCheckoutRequest({ plan: "monthly", coupon_code: "ALLIANCE20" }));
    expect(res.status).toBe(200);
    const sent = (t.mp.callsTo("preapproval.create")[0].args as { body: { auto_recurring: { transaction_amount: number } } }).body;
    expect(sent.auto_recurring.transaction_amount).toBe(20000);
  });
});
