import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notes?lesson_id=xxx — notas del usuario para una lección
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lesson_id");
    if (!lessonId) return NextResponse.json({ error: "lesson_id requerido" }, { status: 400 });

    const { data, error } = await supabase
      .from("lesson_notes")
      .select("id, text, timestamp_sec, created_at")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[notes/GET]", error.message);
      return NextResponse.json({ error: "Error al leer notas" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[notes/GET] unexpected:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/notes — guardar una nota
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { lesson_id, text, timestamp_sec } = body;

    if (!lesson_id || !text?.trim()) {
      return NextResponse.json({ error: "lesson_id y text son requeridos" }, { status: 400 });
    }

    // Verificar que el usuario puede acceder a la lección (es free o tiene suscripción)
    const { data: lesson } = await supabase
      .from("lessons")
      .select("is_free")
      .eq("id", lesson_id)
      .maybeSingle();

    if (!lesson) return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });

    if (!lesson.is_free) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      if (!sub) return NextResponse.json({ error: "Suscripción requerida" }, { status: 403 });

      // Si tiene fecha de vencimiento y ya expiró, rechazar
      // NULL = suscripción manual sin fecha límite (admin grants) → permitir
      if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
        return NextResponse.json({ error: "Suscripción vencida" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("lesson_notes")
      .insert({
        user_id: user.id,
        lesson_id,
        text: text.trim(),
        timestamp_sec: Math.floor(timestamp_sec ?? 0),
      })
      .select("id, text, timestamp_sec, created_at")
      .single();

    if (error) {
      console.error("[notes/POST]", error.message);
      return NextResponse.json({ error: "Error al guardar nota" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[notes/POST] unexpected:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/notes?id=xxx — borrar una nota
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("id");
    if (!noteId) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { error } = await supabase
      .from("lesson_notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", user.id); // garantiza que solo borra sus propias notas

    if (error) {
      console.error("[notes/DELETE]", error.message);
      return NextResponse.json({ error: "Error al borrar nota" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notes/DELETE] unexpected:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
