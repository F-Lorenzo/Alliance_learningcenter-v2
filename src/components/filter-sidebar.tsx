"use client";

import { cn } from "@/lib/utils";

export interface Filters {
  category: string;
  role: string;
  instructor: string;
}

export interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClear: () => void;
  categories?: CategoryOption[];
}

function FilterOption({
  value,
  label,
  count,
  isActive,
  onClick,
}: {
  value: string;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex justify-between items-center px-3 py-2 rounded-md text-sm transition-all text-left w-full",
        isActive
          ? "text-text-primary bg-bg-secondary font-medium border-l-2 border-gold"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-xs text-text-tertiary font-mono">{count}</span>
      )}
    </button>
  );
}

export function FilterSidebar({ filters, onChange, onClear, categories = [] }: FilterSidebarProps) {
  const hasActive = Object.values(filters).some((v) => v !== "");

  return (
    <aside className="w-full lg:w-[240px] shrink-0">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[11px] uppercase tracking-[3px] text-text-tertiary font-medium">
          Filtros
        </p>
        {hasActive && (
          <button
            onClick={onClear}
            className="text-xs text-text-secondary hover:text-gold transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {/* Categorías dinámicas */}
        {categories.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-medium mb-3">
              Posición
            </p>
            <div className="flex flex-col gap-1">
              <FilterOption
                value=""
                label="Todas"
                isActive={filters.category === ""}
                onClick={() => onChange({ ...filters, category: "" })}
              />
              {categories.map((cat) => (
                <FilterOption
                  key={cat.value}
                  value={cat.value}
                  label={cat.label}
                  count={cat.count}
                  isActive={filters.category === cat.value}
                  onClick={() => onChange({ ...filters, category: cat.value })}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
