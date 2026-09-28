/**
 * fake-supabase-server.ts — fabrica del cliente "server" (lo que devuelve `createClient()` de
 * "@/lib/supabase/server", el de `@supabase/ssr`) sobre el MISMO fake DB.
 *
 *  - auth.getUser() configurable (usuario con id, email, email_confirmed_at, app_metadata.role...).
 *  - .from()/.rpc() operan sobre el fake DB con la sesion del usuario actual. Por defecto se emula
 *    RLS (`rls: true`): un usuario autenticado solo VE sus propias filas de `subscriptions`, etc.
 *    (politicas replicadas en rls.ts). `rls: false` => se comporta como service_role.
 *  - Metodos de auth de la app como espias vi.fn con comportamiento realista y sobreescribible:
 *    signInWithPassword, signUp, signOut, resetPasswordForEmail, exchangeCodeForSession,
 *    updateUser, signInWithOAuth, getSession.
 *
 * El mismo cliente se puede usar para mockear "@/lib/supabase/client" (navegador) y
 * "@supabase/ssr" (proxy.ts) — ver harness.ts.
 */

import { vi, type MockedFunction } from "vitest";
import {
  type AuthErr,
  type AuthRes,
  type FakeDb,
  type FakeUser,
  type QueryBuilder,
  type RpcBuilder,
  makeUser,
} from "./fake-supabase";
import type { RlsSession } from "./rls";

export interface FakeSession {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
  user: FakeUser;
}

export interface FakeServerClientOptions {
  /** Usuario logueado. null/undefined = anonimo (getUser => AuthSessionMissingError). */
  user?: FakeUser | null;
  /**
   * Emular RLS (default true, como el cliente real: anon key + JWT del usuario).
   * `{ adminSchema: true }` agrega las politicas de admin-schema.sql (ver rls.ts: recursion 42P17).
   * `false` => sin RLS (equivale a service_role).
   */
  rls?: boolean | { adminSchema?: boolean };
  /**
   * Credenciales para signInWithPassword: email -> password. Ademas se registran las de signUp().
   * El usuario debe existir en db.users (usar db.seedUsers).
   */
  credentials?: Record<string, string>;
  /** Supabase con "Confirm email" activado (default true): login/registro exigen email confirmado. */
  requireEmailConfirmation?: boolean;
}

export interface CookieAdapter {
  getAll(): Array<{ name: string; value: string }>;
  setAll(cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>): void;
}

export type AuthUserRes = AuthRes<{ user: FakeUser | null }>;
export type AuthSessionRes = AuthRes<{ user: FakeUser | null; session: FakeSession | null }>;

export interface FakeAuth {
  getUser: MockedFunction<() => Promise<AuthUserRes>>;
  getSession: MockedFunction<() => Promise<AuthRes<{ session: FakeSession | null }>>>;
  signInWithPassword: MockedFunction<(creds: { email: string; password: string }) => Promise<AuthSessionRes>>;
  signUp: MockedFunction<
    (args: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }) => Promise<AuthSessionRes>
  >;
  signOut: MockedFunction<() => Promise<{ error: AuthErr | null }>>;
  resetPasswordForEmail: MockedFunction<(email: string, opts?: { redirectTo?: string }) => Promise<AuthRes<Record<string, never> | null>>>;
  exchangeCodeForSession: MockedFunction<(code: string) => Promise<AuthSessionRes>>;
  updateUser: MockedFunction<(attrs: Record<string, unknown>) => Promise<AuthUserRes>>;
  signInWithOAuth: MockedFunction<(args: { provider: string; options?: Record<string, unknown> }) => Promise<AuthRes<{ provider: string; url: string | null }>>>;
}

export interface FakeServerClient {
  from(table: string): QueryBuilder;
  rpc(name: string, args?: Record<string, unknown>): RpcBuilder;
  auth: FakeAuth;
  /** Usuario actual (null = anonimo). */
  readonly user: FakeUser | null;
  /** Cambia el usuario actual (login/logout simulado). */
  setUser(user: FakeUser | null): void;
  /** Sesion RLS actual (rol + auth.uid()). */
  session(): RlsSession;
  /** Registra un `code` de PKCE/OAuth/recuperacion que exchangeCodeForSession() aceptara. */
  registerAuthCode(code: string, user: FakeUser): void;
  setCredentials(email: string, password: string): void;
  /** Ultimo adaptador de cookies recibido por createServerClient (via mock de @supabase/ssr). */
  cookieAdapter: CookieAdapter | null;
  /** Simula el refresh de token: llama cookies.setAll(...) del adaptador capturado. */
  simulateSetCookies(cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>): void;
  readonly db: FakeDb;
  /** Vuelve al estado inicial: usuario de `opts`, espias de auth nuevos (sin mockResolvedValueOnce previos), cookies. */
  reset(): void;
}

const authErr = (name: string, message: string, status: number, code: string): AuthErr => ({ name, message, status, code });

const fakeSessionFor = (user: FakeUser, now: Date): FakeSession => ({
  access_token: `test-access-token-${user.id}`,
  refresh_token: `test-refresh-token-${user.id}`,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(now.getTime() / 1000) + 3600,
  user,
});

export function createFakeServerClient(db: FakeDb, opts: FakeServerClientOptions = {}): FakeServerClient {
  let currentUser: FakeUser | null = opts.user ? structuredClone(opts.user) : null;
  const credentials = new Map<string, string>(Object.entries(opts.credentials ?? {}));
  const codes = new Map<string, FakeUser>();
  const needConfirm = opts.requireEmailConfirmation !== false;
  const rlsOpt = opts.rls === undefined ? true : opts.rls;
  const adminSchema = typeof rlsOpt === "object" ? rlsOpt.adminSchema === true : false;

  const session = (): RlsSession => {
    if (rlsOpt === false) return { role: "service_role", userId: currentUser?.id ?? null };
    return currentUser
      ? { role: "authenticated", userId: currentUser.id, adminSchema }
      : { role: "anon", userId: null, adminSchema };
  };

  const missing = (): AuthErr => authErr("AuthSessionMissingError", "Auth session missing!", 400, "session_missing");

  const makeAuth = (): FakeAuth => {
  const getUser = vi.fn(async (): Promise<AuthUserRes> => {
    if (!currentUser) return { data: { user: null }, error: missing() };
    return { data: { user: structuredClone(currentUser) }, error: null };
  });

  const getSession = vi.fn(async (): Promise<AuthRes<{ session: FakeSession | null }>> => ({
    data: { session: currentUser ? fakeSessionFor(structuredClone(currentUser), db.now()) : null },
    error: null,
  }));

  const signInWithPassword = vi.fn(async (creds: { email: string; password: string }): Promise<AuthSessionRes> => {
    const user = [...db.users.values()].find((u) => u.email === creds.email);
    if (!user || credentials.get(creds.email) !== creds.password) {
      return {
        data: { user: null, session: null },
        error: authErr("AuthApiError", "Invalid login credentials", 400, "invalid_credentials"),
      };
    }
    if (needConfirm && !user.email_confirmed_at) {
      return {
        data: { user: null, session: null },
        error: authErr("AuthApiError", "Email not confirmed", 400, "email_not_confirmed"),
      };
    }
    currentUser = structuredClone(user);
    return { data: { user: structuredClone(user), session: fakeSessionFor(structuredClone(user), db.now()) }, error: null };
  });

  const signUp = vi.fn(
    async (args: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }): Promise<AuthSessionRes> => {
      const existing = [...db.users.values()].find((u) => u.email === args.email);
      if (existing) {
        // Supabase con email confirmation: NO revela que el email existe; devuelve un usuario "ofuscado".
        const obfuscated = makeUser(
          { id: db.nextId(), email: args.email, email_confirmed_at: null, user_metadata: args.options?.data ?? {}, identities: [] },
          db.now()
        );
        return { data: { user: obfuscated, session: null }, error: null };
      }
      const now = db.now();
      const user = makeUser(
        {
          id: db.nextId(),
          email: args.email,
          email_confirmed_at: needConfirm ? null : now.toISOString(),
          user_metadata: args.options?.data ?? {},
        },
        now
      );
      db.users.set(user.id, user);
      credentials.set(args.email, args.password);
      // Trigger on_auth_user_created -> handle_new_user(): crea el profile
      if (!db.find("profiles", (p) => p.id === user.id)) {
        db.seed("profiles", {
          id: user.id,
          full_name: (args.options?.data?.full_name as string | undefined) ?? null,
          avatar_url: (args.options?.data?.avatar_url as string | undefined) ?? null,
        });
      }
      if (!needConfirm) currentUser = structuredClone(user);
      return {
        data: { user: structuredClone(user), session: needConfirm ? null : fakeSessionFor(structuredClone(user), now) },
        error: null,
      };
    }
  );

  const signOut = vi.fn(async () => {
    currentUser = null;
    return { error: null as AuthErr | null };
  });

  const resetPasswordForEmail = vi.fn(async (_email: string, _opts?: { redirectTo?: string }) => ({
    // Supabase no revela si el email existe: siempre ok.
    data: {} as Record<string, never> | null,
    error: null as AuthErr | null,
  }));

  const exchangeCodeForSession = vi.fn(async (code: string): Promise<AuthSessionRes> => {
    const user = codes.get(code);
    if (!user) {
      return {
        data: { user: null, session: null },
        error: authErr("AuthApiError", "invalid request: both auth code and code verifier should be non-empty", 400, "validation_failed"),
      };
    }
    codes.delete(code); // los codigos son de un solo uso
    currentUser = structuredClone(user);
    return { data: { user: structuredClone(user), session: fakeSessionFor(structuredClone(user), db.now()) }, error: null };
  });

  const updateUser = vi.fn(async (attrs: Record<string, unknown>): Promise<AuthUserRes> => {
    if (!currentUser) return { data: { user: null }, error: missing() };
    const { data, password: _password, ...rest } = attrs as { data?: Record<string, unknown>; password?: string } & Record<string, unknown>;
    currentUser = {
      ...currentUser,
      ...(rest as Partial<FakeUser>),
      user_metadata: { ...currentUser.user_metadata, ...(data ?? {}) },
    };
    if (typeof attrs.password === "string" && currentUser.email) credentials.set(currentUser.email, attrs.password);
    db.users.set(currentUser.id, structuredClone(currentUser));
    return { data: { user: structuredClone(currentUser) }, error: null };
  });

  const signInWithOAuth = vi.fn(async (args: { provider: string; options?: Record<string, unknown> }) => ({
    data: { provider: args.provider, url: `https://oauth.invalid.test/${args.provider}` as string | null },
    error: null as AuthErr | null,
  }));

  return {
    getUser,
    getSession,
    signInWithPassword,
    signUp,
    signOut,
    resetPasswordForEmail,
    exchangeCodeForSession,
    updateUser,
    signInWithOAuth,
  } as unknown as FakeAuth;
  };

  const client: FakeServerClient = {
    from: (table: string) => db.from(table, session()),
    rpc: (name: string, args?: Record<string, unknown>) => db.rpc(name, args, session()),
    auth: makeAuth(),
    get user() {
      return currentUser ? structuredClone(currentUser) : null;
    },
    setUser(u) {
      currentUser = u ? structuredClone(u) : null;
    },
    session,
    registerAuthCode(code, user) {
      codes.set(code, structuredClone(user));
    },
    setCredentials(email, password) {
      credentials.set(email, password);
    },
    cookieAdapter: null,
    simulateSetCookies(cookies) {
      if (!client.cookieAdapter) throw new Error("fake-supabase-server: no hay adaptador de cookies (createServerClient no fue invocado)");
      client.cookieAdapter.setAll(cookies);
    },
    db,
    reset() {
      currentUser = opts.user ? structuredClone(opts.user) : null;
      credentials.clear();
      for (const [k, v] of Object.entries(opts.credentials ?? {})) credentials.set(k, v);
      codes.clear();
      client.cookieAdapter = null;
      client.auth = makeAuth();
    },
  };
  return client;
}
