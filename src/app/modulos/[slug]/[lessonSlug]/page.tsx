import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VideoPlayer } from "@/components/video-player";
import { BookOpen } from "lucide-react";
import type { Metadata } from "next";

// Datos mock de técnicas compartidos con el módulo
const MOCK_LESSONS = [
  { id: "l1", slug: "introduccion", title: "Introducción y conceptos base", duration: 480, is_free: true, order: 1 },
  { id: "l2", slug: "posicion-inicial", title: "Posición inicial y grips", duration: 620, is_free: true, order: 2 },
  { id: "l3", slug: "tecnica-1", title: "Primera variante de ataque", duration: 540, is_free: false, order: 3 },
  { id: "l4", slug: "tecnica-2", title: "Segunda variante — contra defensa pasiva", duration: 710, is_free: false, order: 4 },
  { id: "l5", slug: "transicion-espalda", title: "Transición a la espalda", duration: 590, is_free: false, order: 5 },
  { id: "l6", slug: "drill-de-practica", title: "Drill de práctica en vivo", duration: 480, is_free: false, order: 6 },
];

interface Props {
  params: Promise<{ slug: string; lessonSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonSlug } = await params;
  const lesson = MOCK_LESSONS.find((l) => l.slug === lessonSlug);
  return { title: lesson?.title ?? "Técnica" };
}

export default async function PlayerPage({ params }: Props) {
  const { slug, lessonSlug } = await params;
  const lessonIndex = MOCK_LESSONS.findIndex((l) => l.slug === lessonSlug);
  const lesson = MOCK_LESSONS[lessonIndex] ?? MOCK_LESSONS[0];
  const prevLesson = lessonIndex > 0 ? MOCK_LESSONS[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < MOCK_LESSONS.length - 1 ? MOCK_LESSONS[lessonIndex + 1] : null;

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
          <BookOpen className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-text-primary tracking-wide hidden sm:block">ALLIANCE</span>
        </div>
        <div className="w-24" /> {/* spacer para centrar logo */}
      </header>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden">
        <VideoPlayer
          lesson={lesson}
          lessons={MOCK_LESSONS}
          slug={slug}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          userEmail="martin@example.com"
        />
      </div>
    </div>
  );
}
