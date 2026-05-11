"use client";

import { useTransition, useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  currentStatus: string | null;
  onToggle: (userId: string, currentStatus: string | null, plan: "monthly" | "yearly") => Promise<void>;
}

export function ToggleSubscriptionButton({ userId, userName, currentStatus, onToggle }: Props) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = currentStatus === "active" || currentStatus === "trialing";

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleActivate(plan: "monthly" | "yearly") {
    setOpen(false);
    const label = plan === "monthly" ? "1 mes" : "1 año";
    if (!confirm(`¿Activar suscripción de ${label} para ${userName}?`)) return;
    startTransition(() => onToggle(userId, currentStatus, plan));
  }

  function handleDeactivate() {
    if (!confirm(`¿Desactivar la suscripción de ${userName}? Perderá acceso al contenido de pago.`)) return;
    startTransition(() => onToggle(userId, currentStatus, "yearly"));
  }

  if (pending) {
    return <span className="text-xs text-text-tertiary">Guardando…</span>;
  }

  if (isActive) {
    return (
      <button
        type="button"
        onClick={handleDeactivate}
        className="text-xs text-danger hover:text-danger/80 transition-colors"
      >
        Desactivar
      </button>
    );
  }

  // Botón con dropdown para elegir plan
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-success hover:text-success/80 transition-colors"
      >
        Activar <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden min-w-[130px]">
          <button
            type="button"
            onClick={() => handleActivate("monthly")}
            className="w-full text-left px-4 py-2.5 text-xs text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <span className="font-medium">1 mes</span>
            <span className="block text-text-tertiary text-[10px]">Plan mensual</span>
          </button>
          <div className="border-t border-border-default" />
          <button
            type="button"
            onClick={() => handleActivate("yearly")}
            className="w-full text-left px-4 py-2.5 text-xs text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <span className="font-medium">1 año</span>
            <span className="block text-text-tertiary text-[10px]">Plan anual</span>
          </button>
        </div>
      )}
    </div>
  );
}
