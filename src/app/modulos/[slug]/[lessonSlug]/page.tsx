import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { VideoPlayer } from "@/components/video-player";
import { getLessonWithCourse, getCurrentUser, getSubscription, getLessonProgress } from "@/lib/queries";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string; lessonSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const data = await getLessonWithCourse(slug, lessonSlug);
  return { title: data?.lesson?.title ?? "Técnica" };
}

export default async function PlayerPage({ params }: Props) {
  const { slug, lessonSlug } = await params;

  // Verificar sesión
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/modulos/${slug}/${lessonSlug}`);

  // Obtener lección y curso
  const data = await getLessonWithCourse(slug, lessonSlug);
  if (!data) notFound();

  const { lesson, lessons, course } = data;

  // Verificar acceso: lección paga requiere suscripción activa
  const sub = await getSubscription(user.id);
  const hasActivePlan = !!(sub && ["active", "trialing"].includes(sub.status));

  if (!lesson.is_free && !hasActivePlan) redirect("/planes");

  const lessonIndex = lessons.findIndex((l) => l.slug === lessonSlug);
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  // Progreso guardado para retomar
  const progress = await getLessonProgress(user.id, lesson.id);

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      {/* Navbar compacta */}
      <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-border-default bg-bg-primary z-10">
        <Link
          href={`/modulos/${slug}`}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al módulo
        </Link>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-text-primary tracking-wide hidden sm:block">ALLIANCE</span>
        </div>
        <div className="w-24" />
      </header>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden">
        <VideoPlayer
          lesson={lesson}
          lessons={lessons}
          slug={slug}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          userEmail={user.email}
          initialProgress={progress.watched_seconds}
          hasActivePlan={hasActivePlan}
        />
      </div>
    </div>
  );
}
