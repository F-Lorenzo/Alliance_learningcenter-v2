import Link from "next/link";
import { Play, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SectionHeader } from "@/components/section-header";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { MOCK_ALL_COURSES, MOCK_CATEGORIES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mi dashboard" };

// Mock: usuario logueado
const MOCK_USER = {
  name: "Martín Rodriguez",
  subscription: { status: "active" as const, plan: "monthly" as const, current_period_end: "2026-05-27" },
};

// Mock: últimas 3 técnicas en progreso
const MOCK_IN_PROGRESS = MOCK_ALL_COURSES.slice(0, 3).map((c, i) => ({
  course: c,
  progress: [40, 70, 15][i],
  watchedSeconds: [720, 1260, 270][i],
  totalSeconds: [1800, 1800, 1800][i],
}));

// Mock: progreso por categoría
const MOCK_CATEGORY_PROGRESS = [
  { name: "Guardia", progress: 45 },
  { name: "Pasajes", progress: 20 },
  { name: "Escapes", progress: 60 },
  { name: "Espalda", progress: 10 },
  { name: "Controles", progress: 30 },
  { name: "Derribos", progress: 0 },
];

// Mock: ruta del principiante (12 segmentos)
const BEGINNER_COMPLETED = 5;
const BEGINNER_TOTAL = 12;
const NEXT_LESSON = "Escape UPA desde montada";

// Novedades
const NEWEST = MOCK_ALL_COURSES.slice(3, 7);

const SUBSCRIPTION_LABELS = {
  active: { label: "Plan activo", color: "bg-success/20 text-success" },
  past_due: { label: "Pago pendiente", color: "bg-warning/20 text-warning" },
  trialing: { label: "Período de prueba", color: "bg-info/20 text-info" },
  canceled: { label: "Cancelado", color: "bg-danger/20 text-danger" },
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const firstName = MOCK_USER.name.split(" ")[0];
  const sub = MOCK_USER.subscription;
  const subStyle = SUBSCRIPTION_LABELS[sub.status];
  const periodEnd = new Date(sub.current_period_end).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <Navbar user={{ name: MOCK_USER.name, email: "martin@example.com" }} />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-[1280px] mx-auto">

          {/* Saludo */}
          <div className="px-6 pt-8 pb-4 flex justify-between items-baseline gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-medium text-text-primary">Hola, {firstName}</h1>
              <p className="text-sm text-text-secondary mt-1">
                Llevás {MOCK_IN_PROGRESS.length} módulos en curso · Suscripción activa hasta el {periodEnd}
              </p>
            </div>
            <span className={cn("text-xs px-3 py-1 rounded-full font-medium", subStyle.color)}>
              {subStyle.label}
            </span>
          </div>

          {/* Continuar viendo */}
          <section className="px-6 py-6 border-b border-border-default">
            <SectionHeader
              label="CONTINUAR VIENDO"
              action="Ver historial →"
              actionHref="/dashboard/historial"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5 overflow-x-auto">
              {MOCK_IN_PROGRESS.map(({ course, progress, watchedSeconds, totalSeconds }) => (
                <Link
                  key={course.id}
                  href={`/modulos/${course.slug}/introduccion`}
                  className="group flex flex-col gap-3"
                >
                  <div className="aspect-video relative rounded-lg overflow-hidden bg-bg-tertiary">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-white fill-white translate-x-0.5" />
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
                      <div className="h-full bg-gold" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-0.5">
                      {course.categories.join(" · ")}
                    </p>
                    <p className="text-sm font-medium text-text-primary group-hover:text-gold transition-colors leading-snug">
                      {course.title}
                    </p>
                    <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                      {fmt(watchedSeconds)} / {fmt(totalSeconds)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Ruta del principiante */}
          <section className="mx-6 my-6 bg-bg-secondary rounded-xl p-6 border border-border-default bg-gradient-to-r from-gold/5 to-transparent">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[3px] text-gold mb-2">TU RUTA</p>
                <h2 className="text-lg font-medium text-text-primary">Ruta del principiante</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Los {BEGINNER_TOTAL} fundamentos que todo alumno Alliance debería dominar
                </p>
              </div>
              <span className="text-sm text-text-secondary shrink-0">
                {BEGINNER_COMPLETED} de {BEGINNER_TOTAL} completados
              </span>
            </div>

            {/* Segmentos */}
            <div className="flex gap-1.5 mt-5">
              {Array.from({ length: BEGINNER_TOTAL }).map((_, i) => (
                <div
                  key={i}
                  className={cn("flex-1 h-[6px] rounded-full", i < BEGINNER_COMPLETED ? "bg-gold" : "bg-bg-tertiary")}
                />
              ))}
            </div>

            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-text-secondary">
                Siguiente: <span className="text-text-primary font-medium">{NEXT_LESSON}</span>
              </p>
              <Button variant="primary" size="sm">Continuar ruta</Button>
            </div>
          </section>

          {/* Progreso por posición */}
          <section className="px-6 py-6 border-b border-border-default">
            <SectionHeader label="MI PROGRESO POR POSICIÓN" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-5">
              {MOCK_CATEGORY_PROGRESS.map(({ name, progress }) => (
                <div key={name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-text-primary">{name}</span>
                    <span className="text-xs text-text-secondary font-mono">{progress}%</span>
                  </div>
                  <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        progress === 100 ? "bg-success" : "bg-gold"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Novedades */}
          <section className="px-6 py-6">
            <SectionHeader
              label="NOVEDADES"
              action="Ver todas →"
              actionHref="/modulos?sort=newest"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              {NEWEST.map((course) => (
                <CourseCard key={course.id} course={course} showProgress />
              ))}
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
