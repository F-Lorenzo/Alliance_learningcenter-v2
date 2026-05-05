"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookMarked, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/cursos", label: "Cursos", icon: BookMarked, exact: false },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, exact: false },
  { href: "/admin/cobros", label: "Cobros", icon: CreditCard, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {NAV.map(({ href, label, icon: Icon, exact }) => {
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
