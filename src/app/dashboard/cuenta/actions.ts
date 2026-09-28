"use server";

import { revalidatePath } from "next/cache";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSubscriptionActive } from "@/lib/subscription-logic";

export interface CancelResult {
  ok: boolean;
  error?: string;
}

interface CancelableRow {
  id: string;
  status: string;
  current_period_end: string | null;
  mp_subscription_id: string | null;
}

/**
 * Cancela la suscripción del usuario logueado: cancela la preapproval REAL en Mercado Pago
 * (para que Mercado Pago deje de cobrar) y marca la fila como `canceled` de inmediato en la
 * base (no esperamos al webhook para reflejarlo en la UI). El acceso al contenido se mantiene
 * hasta `current_period_end` — cancelar no corta lo ya pagado (ver isSubscriptionActive).
 *
 * Antes este botón no tenía ninguna función conectada: no cancelaba nada, ni en la app ni en
 * Mercado Pago.
 */
export async function cancelSubscription(): Promise<CancelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autorizado." };

  if (!process.env.MP_ACCESS_TOKEN) {
    return { ok: false, error: "Configuración de pagos incompleta. Contactanos por WhatsApp." };
  }

  const { data, error: selectError } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, mp_subscription_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (selectError) {
    console.error("[cancelSubscription] Error leyendo suscripciones:", selectError.message);
    return { ok: false, error: "Error interno. Intentá de nuevo en unos minutos." };
  }

  const rows = (data ?? []) as CancelableRow[];

  // Igual criterio que getSubscription(): si hay más de una fila (ej. una vieja cancelada y la
  // vigente), cancelamos la que hoy da acceso, priorizando el vencimiento más lejano.
  const active = rows
    .filter((r) => isSubscriptionActive(r.status, r.current_period_end ? new Date(r.current_period_end) : null))
    .sort((a, b) => {
      const endA = a.current_period_end ? new Date(a.current_period_end).getTime() : Infinity;
      const endB = b.current_period_end ? new Date(b.current_period_end).getTime() : Infinity;
      return endB - endA;
    });

  const row = active[0];
  if (!row) {
    return { ok: false, error: "No encontramos una suscripción activa para cancelar." };
  }
  if (row.status === "canceled") {
    return { ok: true }; // ya estaba cancelada (idempotente)
  }

  if (row.mp_subscription_id) {
    try {
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const preApproval = new PreApproval(client);
      await preApproval.update({ id: row.mp_subscription_id, body: { status: "cancelled" } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[cancelSubscription] Error cancelando en Mercado Pago:", msg);
      return {
        ok: false,
        error: "No pudimos cancelar la suscripción en Mercado Pago. Intentá de nuevo en unos minutos o escribinos por WhatsApp.",
      };
    }
  }

  // El cambio de estado en MP recién se ve reflejado acá (no esperamos al webhook, que de
  // todas formas hará este mismo update más tarde de forma idempotente).
  const db = createAdminClient();
  const { error: updateError } = await db
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (updateError) {
    console.error("[cancelSubscription] Error actualizando estado local:", updateError.message);
    return {
      ok: false,
      error: "Se canceló en Mercado Pago, pero tu cuenta puede tardar unos minutos en reflejarlo.",
    };
  }

  revalidatePath("/dashboard/cuenta");
  return { ok: true };
}
