import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/progress?lesson_id=xxx — leer progreso de una lección
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lesson_id");
    if (!lessonId) return NextResponse.json({ error: "lesson_id requerido" }, { status: 400 });

    const { data, error } = await supabase
      .from("progress")
      .select("watched_seconds, completed, last_watched_at")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (error) {
      console.error("[progress/GET]", error.message);
      return NextResponse.json({ error: "Error al leer progreso" }, { status: 500 });
    }

    return NextResponse.json(data ?? { watched_seconds: 0, completed: false });
  } catch (err) {
    console.error("[progress/GET] unexpected:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/progress — guardar progreso
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { lesson_id, watched_seconds, completed } = body;
    if (!lesson_id) return NextResponse.json({ error: "lesson_id requerido" }, { status: 400 });

    // ── Verificar que la lección existe y obtener si es gratuita ──────────
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, is_free")
      .eq("id", lesson_id)
      .maybeSingle();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
    }

    // ── Si la lección es paga, verificar suscripción activa ───────────────
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

    // ── Persistir progreso ────────────────────────────────────────────────
    const { error: upsertError } = await supabase.from("progress").upsert(
      {
        user_id: user.id,
        lesson_id,
        watched_seconds: Math.max(0, Math.floor(watched_seconds ?? 0)),
        completed: completed ?? false,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );

    if (upsertError) {
      console.error("[progress/POST]", upsertError.message);
      return NextResponse.json({ error: "Error al guardar progreso" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[progress/POST] unexpected:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
