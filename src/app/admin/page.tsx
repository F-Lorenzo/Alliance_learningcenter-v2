import Link from "next/link";
import { Users, BookMarked, CreditCard, Play, ArrowRight } from "lucide-react";
import { getAdminStats } from "@/lib/admin-queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Overview" };

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="bg-bg-secondary border border-border-default rounded-xl p-6 flex items-start justify-between gap-4 hover:border-gold/30 transition-colors group"
    >
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-3xl font-medium text-text-primary mt-1 tabular-nums">{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </Link>
  );
}

export default async function AdminPage() {
  const stats = await getAdminStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-text-primary">Overview</h1>
        <p className="text-sm text-text-secondary mt-1">Estado general de la plataforma</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Usuarios registrados"
          value={stats.totalUsers}
          icon={Users}
          href="/admin/usuarios"
          color="bg-info/10 text-info"
        />
        <StatCard
          label="Suscripciones activas"
          value={stats.activeSubs}
          icon={CreditCard}
          href="/admin/cobros"
          color="bg-success/10 text-success"
        />
        <StatCard
          label="Cursos publicados"
          value={stats.totalCourses}
          icon={BookMarked}
          href="/admin/cursos"
          color="bg-gold/10 text-gold"
        />
        <StatCard
          label="Lecciones totales"
          value={stats.totalLessons}
          icon={Play}
          href="/admin/cursos"
          color="bg-warning/10 text-warning"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-widest mb-4">
          Acciones rápidas
        </h2>
        <div className="flex flex-col gap-2 max-w-sm">
          <Link
            href="/admin/cursos/nuevo"
            className="flex items-center justify-between px-4 py-3 bg-bg-secondary border border-border-default rounded-lg hover:border-gold/40 transition-colors group"
          >
            <span className="text-sm text-text-primary">Crear nuevo curso</span>
            <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-gold transition-colors" />
          </Link>
          <Link
            href="/admin/usuarios"
            className="flex items-center justify-between px-4 py-3 bg-bg-secondary border border-border-default rounded-lg hover:border-gold/40 transition-colors group"
          >
            <span className="text-sm text-text-primary">Ver usuarios</span>
            <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-gold transition-colors" />
          </Link>
          <Link
            href="/admin/cobros"
            className="flex items-center justify-between px-4 py-3 bg-bg-secondary border border-border-default rounded-lg hover:border-gold/40 transition-colors group"
          >
            <span className="text-sm text-text-primary">Revisar cobros</span>
            <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-gold transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
