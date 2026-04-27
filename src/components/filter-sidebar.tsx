"use client";

import { cn } from "@/lib/utils";

export interface Filters {
  category: string;
  role: string;
  instructor: string;
}

interface FilterGroup {
  label: string;
  key: keyof Filters;
  options: { value: string; label: string; count?: number }[];
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    label: "POSICIÓN",
    key: "category",
    options: [
      { value: "", label: "Todas" },
      { value: "guardia", label: "Guardia", count: 8 },
      { value: "pasajes", label: "Pasajes", count: 6 },
      { value: "escapes", label: "Escapes", count: 5 },
      { value: "espalda", label: "Espalda", count: 4 },
      { value: "controles", label: "Controles", count: 7 },
      { value: "derribos", label: "Derribos", count: 3 },
      { value: "fundamentos", label: "Fundamentos", count: 6 },
      { value: "defensa-personal", label: "Defensa personal", count: 2 },
    ],
  },
  {
    label: "ROL",
    key: "role",
    options: [
      { value: "", label: "Todos" },
      { value: "arriba", label: "Desde arriba" },
      { value: "abajo", label: "Desde abajo" },
      { value: "parado", label: "Parado" },
    ],
  },
];

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClear: () => void;
}

export function FilterSidebar({ filters, onChange, onClear }: FilterSidebarProps) {
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
        {FILTER_GROUPS.map((group) => (
          <div key={group.key}>
            <p className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-medium mb-3">
              {group.label}
            </p>
            <div className="flex flex-col gap-1">
              {group.options.map((opt) => {
                const isActive = filters[group.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      onChange({ ...filters, [group.key]: opt.value })
                    }
                    className={cn(
                      "flex justify-between items-center px-3 py-2 rounded-md text-sm transition-all text-left",
                      isActive
                        ? "text-text-primary bg-bg-secondary font-medium border-l-2 border-gold"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                    )}
                  >
                    <span>{opt.label}</span>
                    {opt.count !== undefined && (
                      <span className="text-xs text-text-tertiary font-mono">
                        {opt.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
