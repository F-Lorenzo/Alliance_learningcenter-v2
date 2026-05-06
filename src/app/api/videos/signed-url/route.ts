import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedVideoUrl } from "@/lib/r2";

// ── Rate limiter en memoria (best-effort en serverless) ───────────────────
// Para protección robusta en producción usar Upstash Redis.
const RATE_LIMIT = 30;           // requests máximos por ventana
const RATE_WINDOW_MS = 60_000;   // ventana de 60 segundos

interface RateEntry { count: number; resetAt: number }
const rateStore = new Map<string, RateEntry>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateStore.get(userId);

  if (!entry || now > entry.resetAt) {
    rateStore.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

// Limpiar entradas expiradas periódicamente para evitar memory leaks
function cleanupRateStore() {
  const now = Date.now();
  for (const [key, entry] of rateStore.entries()) {
    if (now > entry.resetAt) rateStore.delete(key);
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

    // 2. Rate limiting por usuario
    if (isRateLimited(user.id)) {
      console.warn(`[videos/signed-url] Rate limit alcanzado para usuario ${user.id}`);
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Esperá un momento." },
        { status: 429 }
      );
    }
    // Cleanup ocasional (1 de cada 50 requests)
    if (Math.random() < 0.02) cleanupRateStore();

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
