import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isSubscriptionActive } from "@/lib/subscription-logic";

const RATE_LIMIT = 5;         // creaciones de pago máximas por ventana
const RATE_WINDOW_SEC = 60;   // ventana de 60 segundos

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

    // Clave con scope por endpoint: antes usaba solo `user.id`, y compartía el cupo con
    // /api/coupons/validate y /api/videos/signed-url.
    if (await isRateLimited(`checkout:${user.id}`, RATE_LIMIT, RATE_WINDOW_SEC)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Esperá un momento." },
        { status: 429 }
      );
    }

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

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preApproval = new PreApproval(client);

    // 2.b Mismo plan ya vigente (activo, en gracia, o cancelado pero con acceso pagado hasta
    // current_period_end): no crear una segunda preapproval — evita un doble cobro accidental.
    // Si esta verificación falla (DB caída), no bloqueamos el checkout por eso — mismo criterio
    // que el resto de esta ruta (rate limit y cupón fallan "abierto", nunca "cerrado").
    //
    // 2.c Cambio de plan (mensual <-> anual) con una suscripción de OTRO plan vigente: en vez de
    // dejar las dos cobrando en paralelo (lo que obligaba al cliente a acordarse de cancelar la
    // vieja a mano), se cancela la preapproval anterior en Mercado Pago ANTES de crear la nueva.
    // Si esa cancelación falla, no seguimos: crear la nueva sin haber cancelado la vieja
    // significa doble cobro real, así que acá sí se bloquea el checkout (a diferencia de 2.b,
    // que solo depende de una lectura).
    try {
      const db = createAdminClient();
      const { data: rows } = await db
        .from("subscriptions")
        .select("status, plan, current_period_end, mp_subscription_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const activeRows = (rows ?? []).filter((r) =>
        isSubscriptionActive(r.status as string, r.current_period_end ? new Date(r.current_period_end) : null)
      );

      const samePlanActive = activeRows.find((r) => r.plan === planKey);
      if (samePlanActive) {
        return NextResponse.json(
          { error: "Ya tenés una suscripción activa. Revisá el estado en \"Mi cuenta\"." },
          { status: 409 }
        );
      }

      const otherPlanActive = activeRows.find((r) => r.plan !== planKey);
      if (otherPlanActive?.mp_subscription_id) {
        try {
          await preApproval.update({
            id: otherPlanActive.mp_subscription_id as string,
            body: { status: "cancelled" },
          });
          console.log("[checkout/mp] Preapproval anterior cancelada por cambio de plan:", otherPlanActive.mp_subscription_id);
        } catch (cancelErr) {
          console.error("[checkout/mp] No se pudo cancelar el plan anterior al cambiar de plan:", serializeError(cancelErr));
          return NextResponse.json(
            {
              error:
                "No pudimos cancelar tu plan actual para cambiarlo. Cancelalo primero desde \"Mi cuenta\" o escribinos por WhatsApp.",
            },
            { status: 409 }
          );
        }
      }
    } catch (err) {
      console.error("[checkout/mp] No se pudo verificar suscripciones existentes:", serializeError(err));
    }

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
