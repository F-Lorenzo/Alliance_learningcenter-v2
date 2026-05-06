"use client";

import { useTransition } from "react";

type AssignableRole = "admin" | "admin_profesor" | "profesor" | "user";

interface Props {
  userId: string;
  userName: string;
  currentRole: string;
  onSetRole: (userId: string, role: AssignableRole) => Promise<void>;
}

const ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: "user", label: "Usuario" },
  { value: "profesor", label: "Profesor" },
  { value: "admin", label: "Admin" },
  { value: "admin_profesor", label: "Admin + Profesor" },
];

const ROLE_STYLE: Record<string, string> = {
  super_admin: "bg-gold/20 text-gold",
  admin: "bg-info/15 text-info",
  admin_profesor: "bg-info/15 text-info",
  profesor: "bg-success/15 text-success",
  user: "bg-bg-tertiary text-text-tertiary",
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  admin_profesor: "Admin + Profesor",
  profesor: "Profesor",
  user: "Usuario",
};

export function RoleSelector({ userId, userName, currentRole, onSetRole }: Props) {
  const [pending, startTransition] = useTransition();

  if (currentRole === "super_admin") {
    return (
      <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${ROLE_STYLE.super_admin}`}>
        Super Admin
      </span>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as AssignableRole;
    if (newRole === currentRole) return;
    if (!confirm(`¿Cambiar el rol de ${userName} a "${ROLE_LABEL[newRole]}"?`)) {
      e.target.value = currentRole; // revert visualmente
      return;
    }
    startTransition(() => onSetRole(userId, newRole));
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={handleChange}
      disabled={pending}
      className="text-xs bg-bg-primary border border-border-default rounded-md px-2 py-0.5 text-text-secondary focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-40 cursor-pointer"
    >
      {ROLE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
