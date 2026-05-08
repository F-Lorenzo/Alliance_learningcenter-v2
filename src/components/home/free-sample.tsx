"use client";

import { useRef } from "react";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { getPublicImageUrl } from "@/lib/utils";
import type { FreeLesson } from "@/lib/queries";

interface FreeSampleProps {
  lessons: FreeLesson[];
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function FreeSample({ lessons }: FreeSampleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (lessons.length === 0) return null;

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector("a");
    const cardW = card ? card.getBoundingClientRect().width + 16 : 300;
    scrollRef.current.scrollBy({ left: dir === "right" ? cardW * 2 : -cardW * 2, behavior: "smooth" });
  }

  return (
    <section className="py-20 max-w-[1280px] mx-auto px-6">
      <div className="flex items-end justify-between mb-10">
        <SectionHeader
          label="PROBÁ GRATIS"
          title="Mirá estas técnicas sin registrarte"
        />
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            onClick={() => scroll("left")}
            className="w-9 h-9 rounded-full border border-border-default flex items-center justify-center text-text-secondary hover:border-gold/50 hover:text-gold transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-9 h-9 rounded-full border border-border-default flex items-center justify-center text-text-secondary hover:border-gold/50 hover:text-gold transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {lessons.map((lesson) => {
          const thumb = getPublicImageUrl(lesson.thumbnailUrl);
          return (
            <Link
              key={lesson.id}
              href={`/modulos/${lesson.courseSlug}/${lesson.slug}`}
              className="group shrink-0 w-[260px] sm:w-[280px] snap-start flex flex-col"
            >
              {/* Thumbnail */}
              <div className="aspect-video relative rounded-lg overflow-hidden bg-bg-tertiary">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={lesson.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-bg-tertiary" />
                )}

                {/* Overlay play */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-black fill-black translate-x-0.5" />
                  </div>
                </div>

                {/* Badge GRATIS */}
                <span className="absolute top-2 left-2 text-[10px] font-medium bg-success/20 text-success px-2 py-0.5 rounded-sm">
                  GRATIS
                </span>

                {/* Duración */}
                <span className="absolute bottom-2 right-2 text-[11px] font-mono bg-black/60 text-white px-2 py-0.5 rounded-sm">
                  {fmt(lesson.duration)}
                </span>
              </div>

              {/* Info */}
              <div className="pt-3">
                <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-1 truncate">
                  {lesson.courseTitle}
                </p>
                <h3 className="text-[15px] font-medium text-text-primary leading-snug group-hover:text-gold transition-colors line-clamp-2">
                  {lesson.title}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
