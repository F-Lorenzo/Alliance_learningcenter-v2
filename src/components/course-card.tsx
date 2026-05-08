import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { cn, formatMinutes, getPublicImageUrl } from "@/lib/utils";
import type { Course } from "@/types";

interface CourseCardProps {
  course: Course;
  showProgress?: boolean;
  progress?: number;
  className?: string;
}

export function CourseCard({
  course,
  showProgress = false,
  progress = 0,
  className,
}: CourseCardProps) {
  const techniqueCount = course.lessons?.length ?? 0;

  return (
    <Link
      href={`/modulos/${course.slug}`}
      className={cn("group flex flex-col", className)}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative rounded-lg overflow-hidden bg-bg-tertiary">
        {getPublicImageUrl(course.thumbnail_url) ? (
          <Image
            src={getPublicImageUrl(course.thumbnail_url)!}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-bg-tertiary" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-black fill-black translate-x-0.5" />
          </div>
        </div>

        {/* Badge top-left */}
        {course.is_new && (
          <span className="absolute top-2 left-2 text-[10px] font-medium bg-info/20 text-info px-2 py-0.5 rounded-sm">
            NUEVO
          </span>
        )}
        {!course.is_new && course.is_featured && (
          <span className="absolute top-2 left-2 text-[10px] font-medium bg-gold/20 text-gold px-2 py-0.5 rounded-sm">
            ESENCIAL
          </span>
        )}

        {/* Duración */}
        <span className="absolute bottom-2 right-2 text-[11px] font-mono bg-black/60 text-white px-2 py-0.5 rounded-sm">
          {formatMinutes(course.total_duration)}
        </span>

        {/* Progress bar */}
        {showProgress && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-3 flex flex-col">
        {course.categories.length > 0 && (
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
            {course.categories.join(" · ")}
          </p>
        )}

        <h3 className="text-[15px] font-medium text-text-primary leading-snug mb-1 group-hover:text-gold transition-colors">
          {course.title}
        </h3>

        <p className="text-[12px] text-text-secondary">
          {showProgress ? (
            progress === 0 ? (
              <>Sin empezar · {techniqueCount} técnicas</>
            ) : progress === 100 ? (
              <>Completado · {techniqueCount} técnicas</>
            ) : (
              <>{progress}% completado · {techniqueCount} técnicas</>
            )
          ) : (
            <>{techniqueCount} técnicas</>
          )}
        </p>
      </div>
    </Link>
  );
}

/* Skeleton */
export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video rounded-lg bg-bg-tertiary animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-16 bg-bg-tertiary rounded animate-pulse" />
        <div className="h-4 w-full bg-bg-tertiary rounded animate-pulse" />
        <div className="h-3 w-24 bg-bg-tertiary rounded animate-pulse" />
      </div>
    </div>
  );
}
