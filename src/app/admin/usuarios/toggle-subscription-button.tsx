"use client";

import { useTransition } from "react";

interface Props {
  userId: string;
  userName: string;
  currentStatus: string | null;
  onToggle: (userId: string, currentStatus: string | null) => Promise<void>;
}

export function ToggleSubscriptionButton({ userId, userName, currentStatus, onToggle }: Props) {
  const [pending, startTransition] = useTransition();
  const isActive = currentStatus === "active" || currentStatus === "trialing";

  function handleClick() {
    const msg = isActive
      ? `¿Desactivar la suscripción de ${userName}? Perderá acceso al contenido de pago.`
      : `¿Activar suscripción manual para ${userName}? Tendrá acceso por 1 año.`;

    if (!confirm(msg)) return;
    startTransition(() => onToggle(userId, currentStatus));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`text-xs transition-colors disabled:opacity-40 ${
        isActive
          ? "text-danger hover:text-danger/80"
          : "text-success hover:text-success/80"
      }`}
    >
      {pending
        ? "Guardando…"
        : isActive
        ? "Desactivar"
        : "Activar"}
    </button>
  );
}
