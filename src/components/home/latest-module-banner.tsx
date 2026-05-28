"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { getPublicImageUrl } from "@/lib/utils";
import type { Course } from "@/types";

interface LatestModuleBannerProps {
  course: Course;
}

export function LatestModuleBanner({ course }: LatestModuleBannerProps) {
  const thumbUrl = getPublicImageUrl(course.thumbnail_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="max-w-2xl mx-auto px-6 py-4"
    >
      <Link
        href={`/modulos/${course.slug}`}
        className="group flex items-center gap-4 rounded-xl border border-gold/20 bg-gold/5 hover:bg-gold/10 hover:border-gold/40 transition-all duration-300 p-3 pr-4"
      >
        {/* Thumbnail */}
        <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-bg-secondary">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PlayCircle className="w-7 h-7 text-gold/50" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-gold/70 font-medium mb-0.5">
            Último módulo
          </p>
          <p className="text-sm font-semibold text-text-primary truncate group-hover:text-gold transition-colors duration-200">
            {course.title}
          </p>
          {course.lessons && (
            <p className="text-xs text-text-secondary mt-0.5">
              {course.lessons.length} {course.lessons.length === 1 ? "técnica" : "técnicas"}
            </p>
          )}
        </div>

        {/* Arrow */}
        <ArrowRight className="w-4 h-4 text-gold/50 group-hover:text-gold group-hover:translate-x-1 transition-all duration-200 shrink-0" />
      </Link>
    </motion.div>
  );
}
