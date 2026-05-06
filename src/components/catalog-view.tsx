"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal, AlertCircle } from "lucide-react";
import { FilterSidebar, type Filters, type CategoryOption } from "@/components/filter-sidebar";
import { CourseCard, CourseCardSkeleton } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import type { Course } from "@/types";

const EMPTY_FILTERS: Filters = { category: "", role: "", instructor: "" };
const PAGE_SIZE = 12;

interface CatalogViewProps {
  courses: Course[];
  isLoggedIn?: boolean;
}

export function CatalogView({ courses, isLoggedIn = false }: CatalogViewProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Computa categorías con conteos reales a partir de los cursos cargados
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const map = new Map<string, { label: string; count: number }>();
    courses.forEach((c) => {
      c.categories.forEach((catName) => {
        if (!map.has(catName)) map.set(catName, { label: catName, count: 0 });
        map.get(catName)!.count++;
      });
    });
    return Array.from(map.entries())
      .map(([label, { count }]) => ({ value: label, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [courses]);

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
