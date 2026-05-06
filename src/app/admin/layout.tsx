import Link from "next/link";
import { BookOpen, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/queries";
import { getAdminCurrentRole } from "@/lib/admin-queries";
import { logout } from "@/app/actions";
import { AdminNav } from "./admin-nav";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  admin_profesor: "Admin + Profesor",
  profesor: "Profesor",
  user: "Usuario",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, role] = await Promise.all([getCurrentUser(), getAdminCurrentRole()]);

  return (
    <div className="min-h-screen flex bg-bg-primary">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-border-default bg-bg-secondary fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border-default">
          <BookOpen className="w-5 h-5 text-gold" />
          <div className="leading-tight">
            <p className="text-sm font-medium text-text-primary">ALLIANCE</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest">Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          <AdminNav role={role} />
        </nav>

        {/* User + logout */}
        <div className="border-t border-border-default p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
            <div className="w-7 h-7 rounded-full bg-gold/20 text-gold text-xs font-medium flex items-center justify-center shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-text-primary truncate">{user?.name ?? "Admin"}</p>
              <p className="text-[10px] text-gold/80 truncate">{ROLE_LABEL[role] ?? role}</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-text-tertiary hover:text-danger hover:bg-danger/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-60 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
