"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, ArrowLeft, AlertCircle, X } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { getPublicImageUrl } from "@/lib/utils";
import type { Course, Category } from "@/types";

const PAGE_SIZE = 12;

interface CatalogViewProps {
  courses: Course[];
  allCategories?: Category[];
  isLoggedIn?: boolean;
  initialInstructor?: string;
}

// ── Vista de categorías ────────────────────────────────────────────────────
function CategoryGrid({
  categories,
  courses,
  onSelect,
}: {
  categories: Category[];
  courses: Course[];
  onSelect: (name: string) => void;
}) {
  // Conteo de cursos por categoría
  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    courses.forEach((c) => c.categories.forEach((cat) => m.set(cat, (m.get(cat) ?? 0) + 1)));
    return m;
  }, [courses]);

  return (
    <div className="max-w-[1280px] mx-auto px-6">
      <div className="pt-24 pb-10">
        <h1 className="text-2xl font-medium text-text-primary">Módulos</h1>
        <p className="text-sm text-text-secondary mt-1">
          Elegí una categoría para explorar sus módulos
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
        {categories.map((cat) => {
          const count = countMap.get(cat.name) ?? 0;
          const thumb = getPublicImageUrl(cat.thumbnail_url);
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.name)}
              className="group flex flex-col rounded-xl overflow-hidden border border-border-default hover:border-gold/50 transition-all duration-200 bg-bg-secondary hover:bg-bg-tertiary text-left"
            >
              {/* Imagen cuadrada */}
              <div className="aspect-square relative overflow-hidden bg-bg-tertiary">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl">🥋</span>
                  </div>
                )}
                {/* Overlay sutil */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              </div>

              {/* Info */}
              <div className="px-3 py-3">
                <p className="text-sm font-medium text-text-primary leading-snug group-hover:text-gold transition-colors">
                  {cat.name}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {count === 0 ? "Próximamente" : `${count} módulo${count !== 1 ? "s" : ""}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista de cursos dentro de una categoría ────────────────────────────────
function CoursesInCategory({
  categoryName,
  courses,
  isLoggedIn,
  onBack,
}: {
  categoryName: string;
  courses: Course[];
  isLoggedIn: boolean;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = courses.filter((c) => c.categories.includes(categoryName));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }

    switch (sort) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "az":
        result.sort((a, b) => a.title.localeCompare(b.title, "es"));
        break;
      case "shortest":
        result.sort((a, b) => a.total_duration - b.total_duration);
        break;
      case "longest":
        result.sort((a, b) => b.total_duration - a.total_duration);
        break;
    }
    return result;
  }, [courses, categoryName, search, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <div className="max-w-[1280px] mx-auto px-6">
      {/* Header con volver */}
      <div className="pt-24 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Todas las categorías
        </button>
        <h1 className="text-2xl font-medium text-text-primary">{categoryName}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {filtered.length} módulo{filtered.length !== 1 ? "s" : ""} en esta categoría
        </p>
      </div>

      {/* Search + sort */}
      <div className="flex gap-3 items-center pb-4 border-b border-border-default mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar módulo…"
            className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-bg-tertiary border border-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors hidden sm:block"
        >
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="az">A-Z</option>
          <option value="shortest">Más cortos</option>
          <option value="longest">Más largos</option>
        </select>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center">
            <span className="text-2xl">🥋</span>
          </div>
          {search ? (
            <>
              <p className="text-text-primary font-medium">Sin resultados</p>
              <p className="text-sm text-text-secondary">Probá con otro término</p>
              <Button variant="secondary" onClick={() => setSearch("")}>Limpiar búsqueda</Button>
            </>
          ) : (
            <>
              <p className="text-text-primary font-medium">Próximamente</p>
              <p className="text-sm text-text-secondary max-w-xs">
                Estamos preparando los módulos de{" "}
                <span className="text-gold font-medium">{categoryName}</span>.
                Volvé pronto.
              </p>
              <Button variant="secondary" onClick={onBack}>Ver todas las categorías</Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
            {visible.map((course) => (
              <CourseCard key={course.id} course={course} showProgress={isLoggedIn} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-4 mb-20">
              <Button variant="secondary" size="md" onClick={() => setPage((p) => p + 1)}>
                Ver más módulos
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function CatalogView({
  courses,
  allCategories = [],
  isLoggedIn = false,
  initialInstructor,
}: CatalogViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleBack = useCallback(() => setSelectedCategory(null), []);

  // Si llega un instructor filter, ir directo a todos los módulos
  // mostrando banner de instructor (funcionalidad anterior)
  const [instructorFilter] = useState(initialInstructor ?? "");
  const activeInstructorName = useMemo(() => {
    if (!instructorFilter) return null;
    return courses.find((c) => c.instructor?.id === instructorFilter)?.instructor?.name ?? null;
  }, [courses, instructorFilter]);

  // Si hay filtro de instructor activo, mostrar vista de todos los módulos
  if (instructorFilter && activeInstructorName) {
    const byCat: Record<string, Course[]> = {};
    courses
      .filter((c) => c.instructor?.id === instructorFilter)
      .forEach((c) => {
        const cat = c.categories[0] ?? "Sin categoría";
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(c);
      });

    return (
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="pt-24 pb-6">
          <h1 className="text-2xl font-medium text-text-primary">
            Cursos de <span className="text-gold">{activeInstructorName}</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {courses.filter((c) => c.instructor?.id === instructorFilter).length} módulos
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
          {courses
            .filter((c) => c.instructor?.id === instructorFilter)
            .map((course) => (
              <CourseCard key={course.id} course={course} showProgress={isLoggedIn} />
            ))}
        </div>
      </div>
    );
  }

  if (selectedCategory) {
    return (
      <CoursesInCategory
        categoryName={selectedCategory}
        courses={courses}
        isLoggedIn={isLoggedIn}
        onBack={handleBack}
      />
    );
  }

  return (
    <CategoryGrid
      categories={allCategories}
      courses={courses}
      onSelect={setSelectedCategory}
    />
  );
}
