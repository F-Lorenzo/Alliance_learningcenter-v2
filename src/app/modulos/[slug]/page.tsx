import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, PlayCircle, User, Lock, CheckCircle, Play } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { formatMinutes, formatDuration, getPublicImageUrl } from "@/lib/utils";
import { getCourseBySlug, getCurrentUser, getSubscription } from "@/lib/queries";
import { logout } from "@/app/actions";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Módulo no encontrado" };
  return { title: course.title, description: course.description };
}

export default async function ModuloPage({ params }: Props) {
  const { slug } = await params;

  const [course, user] = await Promise.all([
    getCourseBySlug(slug),
    getCurrentUser(),
  ]);

  if (!course) notFound();

  let isSubscribed = false;
  if (user) {
    const sub = await getSubscription(user.id);
    isSubscribed =
      !!sub &&
      (sub.status === "active" || sub.status === "trialing") &&
      !!sub.current_period_end &&
      new Date(sub.current_period_end) > new Date();
  }

  const navUser = user ? { name: user.name, email: user.email } : null;
  const lessons = course.lessons ?? [];
  const instructor = course.instructor;
  const hasProgress = false; // TODO: query progress table

  return (
    <>
      <Navbar user={navUser} onLogout={logout} />
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
                {instructor && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {instructor.name}
                  </span>
                )}
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
            <Link
              href={`/modulos/${slug}/${lessons[0]?.slug ?? ""}`}
              className="aspect-video rounded-xl overflow-hidden relative bg-bg-tertiary lg:sticky lg:top-24 block group"
            >
              {course.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getPublicImageUrl(course.thumbnail_url)} alt={course.title} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:bg-white/20 group-hover:scale-110 transition-all duration-200">
                  <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
                </div>
              </div>
              <span className="absolute top-3 left-3 bg-gold text-black text-[10px] font-medium px-2 py-1 rounded-sm">
                PREVIEW GRATIS
              </span>
            </Link>
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
                  const href = canWatch
                    ? `/modulos/${slug}/${lesson.slug}`
                    : "/planes";

                  return (
                    <Link
                      key={lesson.id}
                      href={href}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-bg-secondary transition-colors group border-b border-border-default last:border-b-0"
                    >
                      <span className="text-sm font-mono text-text-tertiary w-8 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium transition-colors truncate ${canWatch ? "text-text-primary group-hover:text-gold" : "text-text-tertiary"}`}>
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
                        {!lesson.is_free && !canWatch && (
                          <Lock className="w-4 h-4 text-text-tertiary" />
                        )}
                        {!lesson.is_free && canWatch && (
                          <CheckCircle className="w-4 h-4 text-text-tertiary" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sección instructor */}
          {instructor && (
            <div className="mt-12 bg-bg-secondary/50 rounded-xl p-8 border border-border-default">
              <div className="flex gap-6 items-start">
                <div className="w-20 h-20 rounded-full bg-bg-tertiary shrink-0 overflow-hidden flex items-center justify-center text-2xl font-medium text-text-tertiary">
                  {instructor.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={instructor.photo_url} alt={instructor.name} className="w-full h-full object-cover" />
                  ) : (
                    instructor.name[0]
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium text-text-primary">{instructor.name}</p>
                  <p className="text-sm text-gold mt-0.5">{instructor.belt}</p>
                  {instructor.bio && (
                    <p className="text-sm text-text-secondary mt-3 leading-relaxed max-w-lg">
                      {instructor.bio}
                    </p>
                  )}
                  {instructor.achievements && instructor.achievements.length > 0 && (
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
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
