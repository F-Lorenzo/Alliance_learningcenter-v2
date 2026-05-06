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

    const { data } = await supabase
      .from("progress")
      .select("watched_seconds, completed, last_watched_at")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    return NextResponse.json(data ?? { watched_seconds: 0, completed: false });
  } catch {
    return NextResponse.json({ watched_seconds: 0, completed: false });
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

    await supabase.from("progress").upsert(
      {
        user_id: user.id,
        lesson_id,
        watched_seconds: Math.floor(watched_seconds ?? 0),
        completed: completed ?? false,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
