import Link from "next/link";
import { redirect } from "next/navigation";
import { Play, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SectionHeader } from "@/components/section-header";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getSubscription, getRecentProgress, getCourses } from "@/lib/queries";
import { logout } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mi dashboard" };

const SUBSCRIPTION_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Plan activo", color: "bg-success/20 text-success" },
  past_due: { label: "Pago pendiente", color: "bg-warning/20 text-warning" },
  trialing: { label: "Período de prueba", color: "bg-info/20 text-info" },
  canceled: { label: "Cancelado", color: "bg-danger/20 text-danger" },
  inactive: { label: "Sin suscripción", color: "bg-bg-tertiary text-text-tertiary" },
};

// Mock: progreso por categoría (placeholder hasta tener datos reales)
const MOCK_CATEGORY_PROGRESS = [
  { name: "Guardia", progress: 0 },
  { name: "Pasajes", progress: 0 },
  { name: "Escapes", progress: 0 },
  { name: "Espalda", progress: 0 },
  { name: "Controles", progress: 0 },
  { name: "Derribos", progress: 0 },
];

const BEGINNER_COMPLETED = 0;
const BEGINNER_TOTAL = 12;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard");

  const [subscription, recentProgress, allCourses] = await Promise.all([
    getSubscription(user.id),
    getRecentProgress(user.id),
    getCourses(),
  ]);

  const firstName = user.name.split(" ")[0];
  const subStatus = subscription?.status ?? "inactive";
  const subStyle = SUBSCRIPTION_LABELS[subStatus] ?? SUBSCRIPTION_LABELS.inactive;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const newest = allCourses.slice(0, 4);

  return (
    <>
      <Navbar user={{ name: user.name, email: user.email }} onLogout={logout} />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-[1280px] mx-auto">

          {/* Saludo */}
          <div className="px-6 pt-8 pb-4 flex justify-between items-baseline gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-medium text-text-primary">Hola, {firstName}</h1>
              <p className="text-sm text-text-secondary mt-1">
                {recentProgress.length > 0
                  ? `Llevás ${recentProgress.length} módulos en curso`
                  : "Comenzá tu primer módulo"}
                {periodEnd && ` · Suscripción activa hasta el ${periodEnd}`}
              </p>
            </div>
            <span className={cn("text-xs px-3 py-1 rounded-full font-medium", subStyle.color)}>
              {subStyle.label}
            </span>
          </div>

          {/* Continuar viendo */}
          {recentProgress.length > 0 ? (
            <section className="px-6 py-6 border-b border-border-default">
              <SectionHeader
                label="CONTINUAR VIENDO"
                action="Ver historial →"
                actionHref="/dashboard/historial"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
                {recentProgress.map((item: Record<string, unknown>) => {
                  const lesson = item.lesson as Record<string, unknown> | null;
                  const course = lesson?.course as Record<string, unknown> | null;
                  if (!course || !lesson) return null;
                  const watched = item.watched_seconds as number;
                  const total = course.total_duration as number;
                  const progress = total > 0 ? Math.round((watched / total) * 100) : 0;
                  const ccRows = (course.course_categories as Array<{ category: { name: string } | null }>) ?? [];
                  const categories = ccRows.map((cc) => cc.category?.name).filter(Boolean) as string[];
                  return (
                    <Link
                      key={lesson.id as string}
                      href={`/modulos/${course.slug as string}/${lesson.slug as string}`}
                      className="group flex flex-col gap-3"
                    >
                      <div className="aspect-video relative rounded-lg overflow-hidden bg-bg-tertiary">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-4 h-4 text-white fill-white translate-x-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
                          <div className="h-full bg-gold" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-0.5">
                          {categories.join(" · ")}
                        </p>
                        <p className="text-sm font-medium text-text-primary group-hover:text-gold transition-colors leading-snug">
                          {course.title as string}
                        </p>
                        <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                          {fmt(watched)} / {fmt(total)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="px-6 py-6 border-b border-border-default">
              <SectionHeader label="CONTINUAR VIENDO" />
              <div className="mt-5 bg-bg-secondary rounded-xl p-8 border border-border-default text-center">
                <p className="text-text-secondary text-sm">Todavía no empezaste ningún módulo.</p>
                <Link href="/modulos" className="inline-block mt-4">
                  <Button variant="primary" size="sm">Explorar módulos</Button>
                </Link>
              </div>
            </section>
          )}

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
                Comenzá con los <span className="text-text-primary font-medium">fundamentos</span>
              </p>
              <Link href="/modulos">
                <Button variant="primary" size="sm">Empezar ruta</Button>
              </Link>
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
            {newest.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                {newest.map((course) => (
                  <CourseCard key={course.id} course={course} showProgress />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary mt-5">
                Pronto habrá nuevos módulos disponibles.
              </p>
            )}
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
