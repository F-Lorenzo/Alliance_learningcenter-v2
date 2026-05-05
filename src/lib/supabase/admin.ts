import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service_role key — bypasea RLS.
 * SOLO usar en Server Components / Server Actions. Nunca exponer al cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. " +
        "Copiala desde Supabase → Settings → API → service_role."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
