import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/lessons/duration — auto-guarda duración real al cargar el video
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { lesson_id, duration_seconds } = await request.json();
    if (!lesson_id || !duration_seconds || duration_seconds <= 0) {
      return NextResponse.json({ ok: true }); // ignorar silenciosamente
    }

    // Usar admin client para poder escribir en lessons sin RLS
    const adminDb = createAdminClient();
    await adminDb
      .from("lessons")
      .update({ duration: Math.round(duration_seconds) })
      .eq("id", lesson_id)
      .eq("duration", 0); // solo actualiza si todavía está en 0 (evita sobreescribir datos correctos)

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // silencioso — no bloquear al usuario
  }
}
