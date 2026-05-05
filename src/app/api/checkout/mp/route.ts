import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createClient } from "@/lib/supabase/server";

const PLANS = {
  monthly: {
    reason: "Alliance Learning Center — Plan Mensual",
    frequency: 1,
    frequency_type: "months" as const,
    transaction_amount: 10000,
  },
  yearly: {
    reason: "Alliance Learning Center — Plan Anual",
    frequency: 12,
    frequency_type: "months" as const,
    transaction_amount: 96000,
  },
};

export async function POST(request: Request) {
  try {
    // 1. Verificar sesión
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Leer plan del body
    const body = await request.json();
    const planKey = body.plan as "monthly" | "yearly";
    const plan = PLANS[planKey];
    if (!plan) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    // 3. Crear suscripción en MP
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });

    const preApproval = new PreApproval(client);

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const result = await preApproval.create({
      body: {
        reason: plan.reason,
        external_reference: user.id,
        payer_email: user.email!,
        back_url: `${origin}/planes/exito`,
        auto_recurring: {
          frequency: plan.frequency,
          frequency_type: plan.frequency_type,
          transaction_amount: plan.transaction_amount,
          currency_id: "ARS",
        },
      },
    });

    return NextResponse.json({ init_point: result.init_point });
  } catch (err) {
    console.error("[checkout/mp]", err);
    return NextResponse.json({ error: "Error al crear la suscripción" }, { status: 500 });
  }
}
