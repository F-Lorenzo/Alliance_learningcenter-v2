import { getAdminUsers } from "@/lib/admin-queries";
import { toggleAdminRole, toggleSubscription } from "@/app/admin/actions";
import { ToggleSubscriptionButton } from "./toggle-subscription-button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Usuarios" };

const STATUS_STYLE: Record<string, string> = {
  active: "bg-success/15 text-success",
  trialing: "bg-info/15 text-info",
  past_due: "bg-warning/15 text-warning",
  canceled: "bg-danger/15 text-danger",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  trialing: "Prueba",
  past_due: "Pendiente",
  canceled: "Cancelada",
};

const PLAN_LABEL: Record<string, string> = {
  monthly: "Mensual",
  yearly: "Anual",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function UsuariosPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));

  const { users, total, perPage } = await getAdminUsers(currentPage);
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Usuarios</h1>
          <p className="text-sm text-text-secondary mt-1">
            {total} registrados · página {currentPage} de {Math.max(1, totalPages)}
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
                Suscripción
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                Plan
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden lg:table-cell">
                Registrado
              </th>
              <th className="px-4 py-3 text-left text-text-tertiary font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-tertiary">
                  Todavía no hay usuarios registrados
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border-default last:border-b-0 hover:bg-bg-tertiary/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/15 text-gold text-xs font-medium flex items-center justify-center shrink-0">
                        {u.full_name?.[0]?.toUpperCase() ?? u.email?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-text-primary font-medium leading-tight">
                          {u.full_name}
                          {u.is_admin && (
                            <span className="ml-2 text-[10px] bg-gold/15 text-gold px-1.5 py-0.5 rounded-sm font-medium">
                              ADMIN
                            </span>
                          )}
                        </p>
                        <p className="text-text-tertiary text-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.subscription ? (
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-sm font-medium",
                          STATUS_STYLE[u.subscription.status] ?? "bg-bg-tertiary text-text-tertiary"
                        )}
                      >
                        {STATUS_LABEL[u.subscription.status] ?? u.subscription.status}
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary">Sin suscripción</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-text-secondary">
                    {u.subscription ? PLAN_LABEL[u.subscription.plan] ?? u.subscription.plan : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-text-secondary font-mono text-xs">
                    {new Date(u.created_at).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-4 justify-end">
                      {/* Toggle suscripción */}
                      <ToggleSubscriptionButton
                        userId={u.id}
                        userName={u.full_name}
                        currentStatus={u.subscription?.status ?? null}
                        onToggle={toggleSubscription}
                      />

                      {/* Toggle admin */}
                      <form
                        action={async () => {
                          "use server";
                          await toggleAdminRole(u.id, u.is_admin);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                        >
                          {u.is_admin ? "Quitar admin" : "Hacer admin"}
                        </button>
                      </form>
                    </div>
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
              href={`/admin/usuarios?page=${currentPage - 1}`}
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
              href={`/admin/usuarios?page=${currentPage + 1}`}
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
