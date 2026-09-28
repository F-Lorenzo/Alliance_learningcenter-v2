"use client";

import { useTransition, useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface ToggleResult {
  ok: boolean;
  warning?: string;
}

interface Props {
  userId: string;
  userName: string;
  currentStatus: string | null;
  onToggle: (
    userId: string,
    currentStatus: string | null,
    plan: "monthly" | "yearly"
  ) => Promise<ToggleResult | void>;
}

export function ToggleSubscriptionButton({ userId, userName, currentStatus, onToggle }: Props) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = currentStatus === "active" || currentStatus === "trialing";

  function runToggle(plan: "monthly" | "yearly") {
    setWarning(null);
    startTransition(async () => {
      const result = await onToggle(userId, currentStatus, plan);
      if (result && !result.ok) setWarning(result.warning ?? "No se pudo completar la acción.");
      else if (result?.warning) setWarning(result.warning);
    });
  }

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
    runToggle(plan);
  }

  function handleDeactivate() {
    if (!confirm(`¿Desactivar la suscripción de ${userName}? Perderá acceso al contenido de pago y se cancelará en Mercado Pago.`)) return;
    runToggle("yearly");
  }

  if (pending) {
    return <span className="text-xs text-text-tertiary">Guardando…</span>;
  }

  if (isActive) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleDeactivate}
          className="text-xs text-danger hover:text-danger/80 transition-colors"
        >
          Desactivar
        </button>
        {warning && <span className="text-[10px] text-warning max-w-[200px] text-right">{warning}</span>}
      </div>
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
      {warning && <span className="block text-[10px] text-warning max-w-[200px] text-right mt-1">{warning}</span>}
    </div>
  );
}
