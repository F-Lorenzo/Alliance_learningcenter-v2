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

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
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
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que el email esté confirmado antes de procesar el pago
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Necesitás confirmar tu email antes de suscribirte. Revisá tu bandeja de entrada." },
        { status: 403 }
      );
    }

    // 2. Validar plan
    const body = await request.json();
    const planKey = body.plan as "monthly" | "yearly";
    const plan = PLANS[planKey];
    if (!plan) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    // 3. Crear preapproval en MP
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preApproval = new PreApproval(client);

    const origin =
      request.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    // Nota: en sandbox NO incluir payer_email con email real.
    // MP pide al usuario que ingrese su cuenta durante el checkout.
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
        status: "pending",
      },
    });

    if (!result.init_point) {
      throw new Error(`MP no devolvió init_point. Respuesta: ${JSON.stringify(result)}`);
    }

    return NextResponse.json({ init_point: result.init_point });
  } catch (err: unknown) {
    // Loguear detalle completo solo en servidor, nunca al cliente
    console.error("[checkout/mp]", serializeError(err));
    return NextResponse.json(
      { error: "Error al procesar el pago. Por favor intentá nuevamente en unos minutos." },
      { status: 500 }
    );
  }
}
