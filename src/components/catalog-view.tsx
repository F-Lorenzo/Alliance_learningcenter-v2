"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal, AlertCircle, X } from "lucide-react";
import { FilterSidebar, type Filters, type CategoryOption } from "@/components/filter-sidebar";
import { CourseCard, CourseCardSkeleton } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import type { Course, Category } from "@/types";

const EMPTY_FILTERS: Filters = { category: "", role: "", instructor: "" };
const PAGE_SIZE = 12;

interface CatalogViewProps {
  courses: Course[];
  allCategories?: Category[];
  isLoggedIn?: boolean;
  initialInstructor?: string;
}

export function CatalogView({ courses, allCategories = [], isLoggedIn = false, initialInstructor }: CatalogViewProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    instructor: initialInstructor ?? "",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Computa conteos reales y cruza con todas las categorías de la DB
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    // Conteos desde los cursos
    const countMap = new Map<string, number>();
    courses.forEach((c) => {
      c.categories.forEach((catName) => {
        countMap.set(catName, (countMap.get(catName) ?? 0) + 1);
      });
    });

    if (allCategories.length > 0) {
      // Usa el orden de la DB, incluye categorías con 0 cursos
      return allCategories.map((cat) => ({
        value: cat.name,
        label: cat.name,
        count: countMap.get(cat.name) ?? 0,
      }));
    }

    // Fallback: solo categorías presentes en los cursos
    return Array.from(countMap.entries())
      .map(([name, count]) => ({ value: name, label: name, count }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [courses, allCategories]);

  const filtered = useMemo(() => {
    let result = [...courses];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    }

    if (filters.category) {
      result = result.filter((c) =>
        c.categories.some((cat) => cat === filters.category)
      );
    }

    if (filters.instructor) {
      result = result.filter((c) => c.instructor?.id === filters.instructor);
    }

    switch (sort) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "az":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "shortest":
        result.sort((a, b) => a.total_duration - b.total_duration);
        break;
      case "longest":
        result.sort((a, b) => b.total_duration - a.total_duration);
        break;
    }

    return result;
  }, [courses, search, filters, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  // Detecta si la categoría seleccionada existe pero no tiene cursos todavía
  const selectedCategoryIsEmpty =
    filters.category !== "" &&
    filtered.length === 0 &&
    categoryOptions.some((c) => c.value === filters.category && c.count === 0);

  // Nombre del instructor activo (lo derivamos de los cursos)
  const activeInstructorName = useMemo(() => {
    if (!filters.instructor) return null;
    return courses.find((c) => c.instructor?.id === filters.instructor)?.instructor?.name ?? null;
  }, [courses, filters.instructor]);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearch("");
  }, []);

  return (
    <div className="max-w-[1280px] mx-auto px-6">
      {/* Header */}
      <div className="pt-24 pb-6">
        <h1 className="text-2xl font-medium text-text-primary">
          Todos los módulos
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {filtered.length} módulos disponibles · filtrá por posición o profesor
        </p>
      </div>

      {/* Banner de filtro por instructor */}
      {activeInstructorName && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gold/10 border border-gold/30 rounded-lg text-sm">
          <span className="text-text-secondary">
            Cursos de <span className="text-gold font-medium">{activeInstructorName}</span>
          </span>
          <button
            onClick={() => { setFilters((f) => ({ ...f, instructor: "" })); setPage(1); }}
            className="ml-auto text-text-tertiary hover:text-gold transition-colors"
            aria-label="Quitar filtro de instructor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-3 items-center pb-4 border-b border-border-default mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar técnica, posición o profesor…"
            className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
          />
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

        {/* Mobile: filtros button */}
        <Button
          variant="secondary"
          size="md"
          className="lg:hidden"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      <div className="flex gap-8">
        {/* Sidebar desktop */}
        <div className="hidden lg:block sticky top-20 h-fit">
          <FilterSidebar
            filters={filters}
            categories={categoryOptions}
            onChange={(f) => { setFilters(f); setPage(1); }}
            onClear={clearFilters}
          />
        </div>

        {/* Mobile drawer de filtros */}
        {filtersOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setFiltersOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-default rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
              <FilterSidebar
                filters={filters}
                categories={categoryOptions}
                onChange={(f) => { setFilters(f); setPage(1); setFiltersOpen(false); }}
                onClear={() => { clearFilters(); setFiltersOpen(false); }}
              />
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {visible.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center gap-4">
              {selectedCategoryIsEmpty ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center">
                    <span className="text-2xl">🥋</span>
                  </div>
                  <p className="text-text-primary font-medium">Próximamente</p>
                  <p className="text-sm text-text-secondary max-w-xs">
                    Estamos preparando los módulos de{" "}
                    <span className="text-gold font-medium">{filters.category}</span>.
                    Volvé pronto.
                  </p>
                  <Button variant="secondary" onClick={clearFilters}>
                    Ver todos los módulos
                  </Button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-12 h-12 text-text-tertiary" />
                  <p className="text-text-primary font-medium">
                    No encontramos módulos con esos filtros
                  </p>
                  <p className="text-sm text-text-secondary">
                    Probá ajustando los filtros o buscando otra cosa
                  </p>
                  <Button variant="secondary" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visible.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    showProgress={isLoggedIn}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-10">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Ver más módulos
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
