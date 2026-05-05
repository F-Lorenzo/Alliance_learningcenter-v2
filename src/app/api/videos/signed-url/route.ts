import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedVideoUrl } from "@/lib/r2";

export async function GET(request: Request) {
  try {
    // 1. Verificar sesión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Verificar suscripción activa
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json({ error: "Suscripción requerida" }, { status: 403 });
    }

    // 3. Obtener la key del video
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "key requerida" }, { status: 400 });
    }

    // 4. Generar URL firmada (válida por 2 horas)
    const url = await getSignedVideoUrl(key, 7200);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[videos/signed-url]", err);
    return NextResponse.json({ error: "Error generando URL" }, { status: 500 });
  }
}
