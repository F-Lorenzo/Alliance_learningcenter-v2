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
