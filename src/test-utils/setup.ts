/**
 * Setup global de Vitest (ver vitest.config.ts -> setupFiles). Corre ANTES de cada archivo de test.
 *
 * Objetivos (seguridad):
 *  1. Ningun test puede salir a internet: se reemplaza `globalThis.fetch` por una funcion que
 *     lanza un error claro. (Los fakes de Supabase y MercadoPago son 100% en memoria.)
 *  2. Ninguna credencial real (heredada del shell) llega a los tests: se pisan las variables
 *     sensibles con valores falsos. Vite tampoco lee `.env*` (ver `envDir` en vitest.config.ts).
 *
 * Si un test necesita otro comportamiento de fetch, puede reasignar `globalThis.fetch` o usar
 * `vi.stubGlobal("fetch", ...)` dentro del propio test.
 */

export const TEST_SUPABASE_URL = "http://supabase.invalid.test";

const FAKE_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: TEST_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-not-real",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  R2_ACCOUNT_ID: "test-r2-account",
  R2_ACCESS_KEY_ID: "test-r2-key",
  R2_SECRET_ACCESS_KEY: "test-r2-secret",
  R2_BUCKET_NAME: "test-bucket",
};

for (const [k, v] of Object.entries(FAKE_ENV)) process.env[k] = v;

// Las credenciales de MercadoPago NO tienen valor por defecto: cada test las pide explicitamente
// (installHarness() las setea con valores de prueba y las restaura).
delete process.env.MP_ACCESS_TOKEN;
delete process.env.MP_WEBHOOK_SECRET;

const blockedFetch: typeof fetch = async (input) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
  throw new Error(
    `[test-utils] Salida de red BLOQUEADA en tests: fetch(${url}). ` +
      "Los tests deben usar los fakes (fake-supabase / mp-mock), nunca la red real."
  );
};

globalThis.fetch = blockedFetch;
