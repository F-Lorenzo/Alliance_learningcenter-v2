"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookMarked, CreditCard, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/admin-queries";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, roles: ["super_admin", "admin", "profesor"] },
  { href: "/admin/cursos", label: "Cursos", icon: BookMarked, exact: false, roles: ["super_admin", "admin", "profesor"] },
  { href: "/admin/profesores", label: "Profesores", icon: GraduationCap, exact: false, roles: ["super_admin", "admin", "profesor"] },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, exact: false, roles: ["super_admin", "admin"] },
  { href: "/admin/cobros", label: "Cobros", icon: CreditCard, exact: false, roles: ["super_admin", "admin"] },
];

interface Props {
  role: AdminRole;
}

export function AdminNav({ role }: Props) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      {visibleItems.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              active
                ? "bg-gold/10 text-gold font-medium"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
