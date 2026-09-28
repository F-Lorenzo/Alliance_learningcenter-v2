import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedVideoUrl } from "@/lib/r2";
import { isRateLimited } from "@/lib/rate-limit";
import { userHasActiveAccess } from "@/lib/queries";

const RATE_LIMIT = 30;         // requests máximos por ventana
const RATE_WINDOW_SEC = 60;    // ventana de 60 segundos

export async function GET(request: Request) {
  try {
    // 1. Verificar sesión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Rate limiting por usuario (Supabase como store compartido). Clave con scope por
    //    endpoint: antes compartía el cupo con /api/checkout/mp y /api/coupons/validate.
    if (await isRateLimited(`signed-url:${user.id}`, RATE_LIMIT, RATE_WINDOW_SEC)) {
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

    // 5. Si la lección es paga, verificar suscripción activa (misma regla que el resto de la
    //    app — antes esto solo chequeaba status IN (active, trialing) sin mirar la fecha de
    //    vencimiento ni contemplar la gracia de 3 días, lo que dejaba con acceso a una
    //    suscripción activa pero vencida hace tiempo, o sin acceso a una en gracia).
    if (!lesson.is_free) {
      const hasAccess = await userHasActiveAccess(user.id);
      if (!hasAccess) {
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
