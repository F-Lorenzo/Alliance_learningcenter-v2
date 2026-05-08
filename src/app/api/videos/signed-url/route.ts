import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedVideoUrl } from "@/lib/r2";

const RATE_LIMIT = 30;         // requests máximos por ventana
const RATE_WINDOW_SEC = 60;    // ventana de 60 segundos

// Rate limiter usando Supabase como store compartido entre instancias serverless.
// La tabla rate_limits debe existir (ver create-rate-limits-table.sql).
async function isRateLimited(userId: string): Promise<boolean> {
  try {
    const db = createAdminClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_WINDOW_SEC * 1000).toISOString();

    // Contar requests en la ventana actual
    const { count } = await db
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= RATE_LIMIT) return true;

    // Registrar este request
    await db.from("rate_limits").insert({ user_id: userId });

    // Limpiar registros viejos (1 de cada 20 requests para no sobrecargar)
    if (Math.random() < 0.05) {
      const cutoff = new Date(now.getTime() - RATE_WINDOW_SEC * 2 * 1000).toISOString();
      await db.from("rate_limits").delete().lt("created_at", cutoff);
    }

    return false;
  } catch {
    // Si falla el rate limiter, dejar pasar (no bloquear al usuario por error interno)
    return false;
  }
}

export async function GET(request: Request) {
  try {
    // 1. Verificar sesión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Rate limiting por usuario (Supabase como store compartido)
    if (await isRateLimited(user.id)) {
      console.warn(`[videos/signed-url] Rate limit alcanzado para usuario ${user.id}`);
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Esperá un momento." },
        { status: 429 }
      );
    }

    // 3. Obtener el lesson_id del query param
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lesson_id");
    if (!lessonId) {
      return NextResponse.json({ error: "lesson_id requerido" }, { status: 400 });
    }

    // 4. Buscar la lección en DB y obtener video_url + is_free
    //    Esto valida que el lesson_id es real y pertenece al sistema.
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, is_free, video_url")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
    }

    if (!lesson.video_url) {
      return NextResponse.json({ error: "Esta lección no tiene video disponible" }, { status: 404 });
    }

    // 5. Si la lección es paga, verificar suscripción activa
    if (!lesson.is_free) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      if (!subscription) {
        return NextResponse.json({ error: "Suscripción requerida" }, { status: 403 });
      }
    }

    // 6. Generar URL firmada con la key que está en la DB (no la que pide el cliente)
    const url = await getSignedVideoUrl(lesson.video_url as string, 7200);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[videos/signed-url]", err);
    return NextResponse.json({ error: "Error generando URL" }, { status: 500 });
  }
}
