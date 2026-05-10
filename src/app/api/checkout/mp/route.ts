import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLANS = {
  monthly: {
    reason: "Alliance Learning Center — Plan Mensual",
    frequency: 1,
    frequency_type: "months" as const,
    transaction_amount: 20000,
  },
  yearly: {
    reason: "Alliance Learning Center — Plan Anual",
    frequency: 12,
    frequency_type: "months" as const,
    transaction_amount: 199000,
  },
};

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

/** Valida el cupón server-side y devuelve el monto final. Si es inválido, devuelve null. */
async function applyCoupon(
  code: string,
  planKey: string,
  originalAmount: number
): Promise<{ finalAmount: number; couponId: string } | null> {
  try {
    const db = createAdminClient();
    const { data: coupon } = await db
      .from("coupons")
      .select("*")
      .eq("is_active", true)
      .ilike("code", code.trim())
      .maybeSingle();

    if (!coupon) return null;
    if (coupon.applicable_plan !== "all" && coupon.applicable_plan !== planKey) return null;
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) return null;

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) return null;
    if (coupon.valid_until && new Date(coupon.valid_until) < now) return null;

    let discount: number;
    if (coupon.discount_type === "percentage") {
      discount = Math.round(originalAmount * (coupon.discount_value / 100));
    } else {
      discount = Math.min(coupon.discount_value, originalAmount);
    }

    return { finalAmount: Math.max(1, originalAmount - discount), couponId: coupon.id };
  } catch {
    return null; // Si falla la validación del cupón, no bloquear el pago
  }
}

export async function POST(request: Request) {
  if (!process.env.MP_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Configuración de pagos incompleta" }, { status: 500 });
  }

  try {
    // 1. Verificar sesión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Necesitás confirmar tu email antes de suscribirte. Revisá tu bandeja de entrada." },
        { status: 403 }
      );
    }

    // 2. Validar plan
    const body = await request.json();
    const planKey = body.plan as "monthly" | "yearly";
    const couponCode: string | undefined = body.coupon_code?.trim?.() || undefined;
    const plan = PLANS[planKey];
    if (!plan) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

    // 3. Aplicar cupón (server-side — nunca confiar en el precio del cliente)
    let transactionAmount = plan.transaction_amount;
    let appliedCouponId: string | null = null;

    if (couponCode) {
      const couponResult = await applyCoupon(couponCode, planKey, transactionAmount);
      if (couponResult) {
        transactionAmount = couponResult.finalAmount;
        appliedCouponId = couponResult.couponId;
      }
    }

    // 4. Crear preapproval en MP
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preApproval = new PreApproval(client);

    const origin =
      request.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    const result = await preApproval.create({
      body: {
        reason: plan.reason,
        external_reference: user.id,
        payer_email: user.email!,
        back_url: `${origin}/planes/exito`,
        auto_recurring: {
          frequency: plan.frequency,
          frequency_type: plan.frequency_type,
          transaction_amount: transactionAmount,
          currency_id: "ARS",
        },
        status: "pending",
      },
    });

    if (!result.init_point) {
      throw new Error(`MP no devolvió init_point. Respuesta: ${JSON.stringify(result)}`);
    }

    // 5. Incrementar uso del cupón SOLO si el pago se creó correctamente
    if (appliedCouponId) {
      const db = createAdminClient();
      const { error: rpcErr } = await db.rpc("increment_coupon_uses", { coupon_id: appliedCouponId });
      if (rpcErr) console.error("[checkout/mp] Error incrementando coupon uses:", rpcErr.message);
    }

    return NextResponse.json({ init_point: result.init_point });
  } catch (err: unknown) {
    console.error("[checkout/mp]", serializeError(err));
    return NextResponse.json(
      { error: "Error al procesar el pago. Por favor intentá nuevamente en unos minutos." },
      { status: 500 }
    );
  }
}
