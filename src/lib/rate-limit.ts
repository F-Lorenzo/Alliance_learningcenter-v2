import { createAdminClient } from "@/lib/supabase/admin";

// Rate limiter usando Supabase como store compartido entre instancias serverless.
// La tabla rate_limits debe existir (ver create-rate-limits-table.sql).
export async function isRateLimited(
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  try {
    const db = createAdminClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSec * 1000).toISOString();

    // Contar requests en la ventana actual
    const { count } = await db
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", key)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= limit) return true;

    // Registrar este request
    await db.from("rate_limits").insert({ user_id: key });

    // Limpiar registros viejos (1 de cada 4 requests — suficiente para mantener la tabla chica)
    if (Math.random() < 0.25) {
      const cutoff = new Date(now.getTime() - windowSec * 2 * 1000).toISOString();
      await db.from("rate_limits").delete().lt("created_at", cutoff);
    }

    return false;
  } catch {
    // Si falla el rate limiter, dejar pasar (no bloquear al usuario por error interno)
    return false;
  }
}
