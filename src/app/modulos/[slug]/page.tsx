import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, PlayCircle, User, Lock, CheckCircle, Play } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { formatMinutes, formatDuration } from "@/lib/utils";
import { MOCK_ALL_COURSES, MOCK_INSTRUCTORS } from "@/lib/mock-data";
import type { Lesson } from "@/types";
import type { Metadata } from "next";

// Datos mock de técnicas para el módulo
const MOCK_LESSONS: Lesson[] = [
  { id: "l1", slug: "introduccion", title: "Introducción y conceptos base", duration: 480, is_free: true, order: 1 },
  { id: "l2", slug: "posicion-inicial", title: "Posición inicial y grips", duration: 620, is_free: true, order: 2 },
  { id: "l3", slug: "tecnica-1", title: "Primera variante de ataque", duration: 540, is_free: false, order: 3 },
  { id: "l4", slug: "tecnica-2", title: "Segunda variante — contra defensa pasiva", duration: 710, is_free: false, order: 4 },
  { id: "l5", slug: "transicion-espalda", title: "Transición a la espalda", duration: 590, is_free: false, order: 5 },
  { id: "l6", slug: "drill-de-practica", title: "Drill de práctica en vivo", duration: 480, is_free: false, order: 6 },
];

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = MOCK_ALL_COURSES.find((c) => c.slug === slug);
  if (!course) return { title: "Módulo no encontrado" };
  return { title: course.title, description: course.description };
}

export default async function ModuloPage({ params }: Props) {
  const { slug } = await params;
  const course = MOCK_ALL_COURSES.find((c) => c.slug === slug);
  if (!course) notFound();

  const isLoggedIn = false;
  const isSubscribed = false;
  const hasProgress = false;
  const instructor = MOCK_INSTRUCTORS[0];
  const lessons = course.lessons?.length ? MOCK_LESSONS : [];

  return (
    <>
      <Navbar user={null} />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-6">

          {/* Hero del módulo */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start pt-8">

            {/* Columna izquierda */}
            <div>
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-xs text-text-tertiary mb-4">
                <Link href="/modulos" className="hover:text-text-secondary transition-colors">Módulos</Link>
                <span>/</span>
                {course.categories[0] && (
                  <>
                    <Link
                      href={`/modulos?category=${course.categories[0].toLowerCase()}`}
                      className="hover:text-text-secondary transition-colors"
                    >
                      {course.categories[0]}
                    </Link>
                    <span>/</span>
                  </>
                )}
                <span className="text-text-secondary truncate">{course.title}</span>
              </nav>

              {/* Categorías */}
              <div className="flex gap-2 flex-wrap mb-4">
                {course.categories.map((cat) => (
                  <span key={cat} className="text-xs text-text-secondary bg-bg-secondary px-2.5 py-1 rounded-sm">
                    {cat}
                  </span>
                ))}
              </div>

              <h1 className="font-display text-3xl font-medium text-text-primary leading-tight">
                {course.title}
              </h1>

              {course.description && (
                <p className="text-base text-text-secondary mt-4 leading-relaxed max-w-lg">
                  {course.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap gap-6 mt-6 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatMinutes(course.total_duration)}
                </span>
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="w-4 h-4" />
                  {lessons.length} técnicas
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {instructor.name}
                </span>
              </div>

              {/* CTA */}
              <div className="mt-8">
                {isSubscribed ? (
                  <Link href={`/modulos/${slug}/${lessons[0]?.slug ?? ""}`}>
                    <Button variant="primary" size="lg">
                      {hasProgress ? "Continuar viendo" : "Comenzar módulo"}
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/planes">
                      <Button variant="primary" size="lg">
                        Suscribirme para ver
                      </Button>
                    </Link>
                    <p className="text-xs text-text-tertiary mt-2">
                      Desde $10.000 ARS/mes · Acceso a todos los módulos
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Columna derecha: thumbnail / trailer */}
            <div className="aspect-video rounded-xl overflow-hidden relative bg-bg-tertiary lg:sticky lg:top-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                  <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
                </div>
              </div>
              <span className="absolute top-3 left-3 bg-gold text-black text-[10px] font-medium px-2 py-1 rounded-sm">
                PREVIEW GRATIS
              </span>
            </div>
          </div>

          {/* Lista de técnicas */}
          {lessons.length > 0 && (
            <div className="mt-16">
              <h2 className="text-lg font-medium text-text-primary mb-6">
                Contenido del módulo
              </h2>
              <div className="flex flex-col border border-border-default rounded-xl overflow-hidden">
                {lessons.map((lesson, i) => {
                  const canWatch = isSubscribed || lesson.is_free;
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-bg-secondary transition-colors group cursor-pointer border-b border-border-default last:border-b-0"
                    >
                      <span className="text-sm font-mono text-text-tertiary w-8 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary group-hover:text-gold transition-colors truncate">
                          {lesson.title}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {formatDuration(lesson.duration)}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {lesson.is_free && (
                          <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-sm font-medium">
                            GRATIS
                          </span>
                        )}
                        {!lesson.is_free && !isSubscribed && (
                          <Lock className="w-4 h-4 text-text-tertiary" />
                        )}
                        {!lesson.is_free && isSubscribed && (
                          <CheckCircle className="w-4 h-4 text-text-tertiary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sección instructor */}
          <div className="mt-12 bg-bg-secondary/50 rounded-xl p-8 border border-border-default">
            <div className="flex gap-6 items-start">
              <div className="w-20 h-20 rounded-full bg-bg-tertiary shrink-0 flex items-center justify-center text-2xl font-medium text-text-tertiary">
                {instructor.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium text-text-primary">{instructor.name}</p>
                <p className="text-sm text-gold mt-0.5">{instructor.belt}</p>
                <p className="text-sm text-text-secondary mt-3 leading-relaxed max-w-lg">
                  Uno de los mejores competidores y profesores de jiu jitsu del mundo. Múltiple campeón mundial y referente del sistema Alliance.
                </p>
                {instructor.achievements && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {instructor.achievements.map((a) => (
                      <span key={a} className="text-xs bg-bg-tertiary text-text-secondary px-2 py-1 rounded-sm">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
