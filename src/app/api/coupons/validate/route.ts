import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_PRICES: Record<string, number> = {
  monthly: 20000,
  yearly: 199000,
};

export async function GET(request: Request) {
  try {
    // Requiere sesión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toUpperCase();
    const plan = searchParams.get("plan") as "monthly" | "yearly" | null;

    if (!code) return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    if (!plan || !PLAN_PRICES[plan]) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

    const db = createAdminClient();
    const { data: coupon, error } = await db
      .from("coupons")
      .select("*")
      .eq("is_active", true)
      .ilike("code", code)
      .maybeSingle();

    if (error) {
      console.error("[coupons/validate]", error.message);
      return NextResponse.json({ error: "Error validando cupón" }, { status: 500 });
    }

    if (!coupon) return NextResponse.json({ valid: false, error: "Cupón no encontrado o inactivo" });

    // Verificar plan aplicable
    if (coupon.applicable_plan !== "all" && coupon.applicable_plan !== plan) {
      return NextResponse.json({ valid: false, error: `Este cupón solo aplica al plan ${coupon.applicable_plan === "monthly" ? "mensual" : "anual"}` });
    }

    // Verificar max_uses
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: "Este cupón ya alcanzó su límite de usos" });
    }

    // Verificar vigencia
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ valid: false, error: "Este cupón aún no está vigente" });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ valid: false, error: "Este cupón venció" });
    }

    // Calcular precio con descuento
    const originalPrice = PLAN_PRICES[plan];
    let discountAmount: number;
    if (coupon.discount_type === "percentage") {
      discountAmount = Math.round(originalPrice * (coupon.discount_value / 100));
    } else {
      discountAmount = Math.min(coupon.discount_value, originalPrice);
    }
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return NextResponse.json({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discountAmount,
      original_price: originalPrice,
      final_price: finalPrice,
    });
  } catch (err) {
    console.error("[coupons/validate] unexpected:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
