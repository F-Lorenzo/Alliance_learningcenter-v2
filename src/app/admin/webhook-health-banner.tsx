import { AlertTriangle } from "lucide-react";
import type { WebhookHealth } from "@/lib/admin-queries";

/**
 * Banner de alerta en el panel admin — visible en TODAS las páginas de /admin (se renderiza en
 * el layout). Se queda invisible cuando todo funciona; solo aparece si el último ping del cron
 * de salud falló o si hubo eventos reales de Mercado Pago fallados en las últimas 24hs. Ver
 * src/lib/admin-queries.ts (getWebhookHealth) y src/app/api/cron/webhook-healthcheck/route.ts.
 */
export function WebhookHealthBanner({ health }: { health: WebhookHealth }) {
  if (!health.hasProblem) return null;

  const parts: string[] = [];
  if (health.lastCheck && !health.lastCheck.ok) {
    const when = new Date(health.lastCheck.checkedAt).toLocaleString("es-AR");
    parts.push(
      `El último chequeo automático del webhook de Mercado Pago falló (${when}${
        health.lastCheck.statusCode ? `, HTTP ${health.lastCheck.statusCode}` : ""
      }${health.lastCheck.error ? `: ${health.lastCheck.error}` : ""}).`
    );
  }
  if (health.recentFailedEvents > 0) {
    parts.push(
      `${health.recentFailedEvents} notificación${health.recentFailedEvents === 1 ? "" : "es"} real${
        health.recentFailedEvents === 1 ? "" : "es"
      } de Mercado Pago fall${health.recentFailedEvents === 1 ? "ó" : "aron"} en las últimas 24 horas.`
    );
  }

  return (
    <div className="bg-danger/10 border-b border-danger/30 px-6 py-3 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
      <div className="text-sm text-danger">
        <p className="font-medium">Revisar el webhook de Mercado Pago</p>
        <p className="text-danger/80 mt-0.5">
          {parts.join(" ")} Es probable que clientes que pagaron no se estén activando solos.
          Revisá el panel de Webhooks en Mercado Pago y la variable MP_WEBHOOK_SECRET en Vercel.
        </p>
      </div>
    </div>
  );
}
