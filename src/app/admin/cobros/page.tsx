import { getAdminSubscriptions } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Cobros" };

const STATUS_STYLE: Record<string, string> = {
  active: "bg-success/15 text-success",
  trialing: "bg-info/15 text-info",
  past_due: "bg-warning/15 text-warning",
  canceled: "bg-danger/15 text-danger",
  inactive: "bg-bg-tertiary text-text-tertiary",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  trialing: "Período de prueba",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  inactive: "Inactiva",
};

const PLAN_LABEL: Record<string, string> = {
  monthly: "Mensual",
  yearly: "Anual",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function CobrosPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));

  const { subscriptions: subs, total, perPage } = await getAdminSubscriptions(currentPage);
  const totalPages = Math.ceil(total / perPage);
  const active = subs.filter((s) => s.status === "active").length;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Cobros</h1>
          <p className="text-sm text-text-secondary mt-1">
            {total} suscripciones · {active} activas en esta página
          </p>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider">
                Usuario
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                Plan
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                Vence
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden lg:table-cell">
                MP ID
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden lg:table-cell">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-tertiary">
                  Todavía no hay suscripciones registradas
                </td>
              </tr>
            ) : (
              subs.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border-default last:border-b-0 hover:bg-bg-tertiary/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-text-primary font-medium leading-tight">{s.user_name}</p>
                    <p className="text-text-tertiary text-xs">{s.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-sm font-medium",
                        STATUS_STYLE[s.status] ?? "bg-bg-tertiary text-text-tertiary"
                      )}
                    >
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-text-secondary">
                    {PLAN_LABEL[s.plan] ?? s.plan}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-text-secondary font-mono text-xs">
                    {s.current_period_end
                      ? new Date(s.current_period_end).toLocaleDateString("es-AR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {s.mp_subscription_id ? (
                      <span className="font-mono text-xs text-text-tertiary">
                        {s.mp_subscription_id.slice(0, 16)}…
                      </span>
                    ) : (
                      <span className="text-text-tertiary text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-text-secondary font-mono text-xs">
                    {new Date(s.created_at).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {currentPage > 1 && (
            <Link
              href={`/admin/cobros?page=${currentPage - 1}`}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors border border-border-default rounded-lg hover:bg-bg-secondary"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Link>
          )}
          <span className="text-sm text-text-tertiary px-3">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/admin/cobros?page=${currentPage + 1}`}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors border border-border-default rounded-lg hover:bg-bg-secondary"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
