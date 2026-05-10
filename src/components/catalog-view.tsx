"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, ArrowLeft, X } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { getPublicImageUrl } from "@/lib/utils";
import type { Course, Category } from "@/types";

const PAGE_SIZE = 12;

// ── Tema visual por categoría ──────────────────────────────────────────────
// Gradiente (Tailwind inline style) + SVG temático de BJJ
const CATEGORY_THEMES: Record<string, { from: string; to: string; accent: string; svg: string }> = {
  "Guardia": {
    from: "#0f1f3d", to: "#1a3a6b", accent: "#4a9eff",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Figura en guardia de jiu jitsu -->
      <ellipse cx="60" cy="105" rx="32" ry="6" fill="#4a9eff" opacity="0.15"/>
      <!-- Cuerpo en guardia (supino) -->
      <rect x="30" y="72" width="60" height="14" rx="7" fill="#4a9eff" opacity="0.25"/>
      <!-- Torso -->
      <ellipse cx="60" cy="65" rx="14" ry="18" fill="#4a9eff" opacity="0.5"/>
      <!-- Cabeza -->
      <circle cx="60" cy="44" r="10" fill="#4a9eff" opacity="0.7"/>
      <!-- Piernas en guardia (abiertas) -->
      <path d="M48 78 Q30 88 22 102" stroke="#4a9eff" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
      <path d="M72 78 Q90 88 98 102" stroke="#4a9eff" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
      <!-- Brazos -->
      <path d="M50 60 Q36 55 28 62" stroke="#4a9eff" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
      <path d="M70 60 Q84 55 92 62" stroke="#4a9eff" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
      <!-- Símbolo escudo -->
      <path d="M60 18 L68 26 L68 36 Q60 42 52 36 L52 26 Z" stroke="#4a9eff" stroke-width="1.5" fill="none" opacity="0.4"/>
    </svg>`
  },
  "Pasajes": {
    from: "#1f1000", to: "#3d2000", accent: "#ff8c00",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Figura pasando la guardia -->
      <!-- Atacante (arriba) -->
      <circle cx="72" cy="32" r="10" fill="#ff8c00" opacity="0.8"/>
      <ellipse cx="72" cy="52" rx="12" ry="15" fill="#ff8c00" opacity="0.6"/>
      <path d="M64 48 Q50 44 44 50" stroke="#ff8c00" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M80 48 Q88 42 92 36" stroke="#ff8c00" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M68 65 Q60 78 55 88" stroke="#ff8c00" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
      <path d="M76 65 Q82 75 80 88" stroke="#ff8c00" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
      <!-- Defensor (abajo) -->
      <circle cx="44" cy="78" r="9" fill="#ff8c00" opacity="0.4"/>
      <ellipse cx="44" cy="94" rx="11" ry="12" fill="#ff8c00" opacity="0.3"/>
      <!-- Flecha de movimiento -->
      <path d="M80 55 Q95 60 95 72 Q95 80 85 82" stroke="#ff8c00" stroke-width="2" stroke-dasharray="4 3" fill="none" opacity="0.5"/>
      <path d="M82 80 L85 82 L88 78" stroke="#ff8c00" stroke-width="2" fill="none" opacity="0.5"/>
    </svg>`
  },
  "Escapes": {
    from: "#001a0f", to: "#003320", accent: "#00cc66",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Figura escapando (puente/shrimp) -->
      <!-- Base en el suelo -->
      <ellipse cx="60" cy="108" rx="35" ry="5" fill="#00cc66" opacity="0.15"/>
      <!-- Defensor escapando -->
      <circle cx="42" cy="72" r="9" fill="#00cc66" opacity="0.8"/>
      <ellipse cx="50" cy="88" rx="14" ry="11" fill="#00cc66" opacity="0.5"/>
      <!-- Puente de cadera -->
      <path d="M36 98 Q48 75 72 82 Q88 86 88 98" stroke="#00cc66" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.6"/>
      <!-- Atacante arriba -->
      <circle cx="78" cy="58" r="8" fill="#00cc66" opacity="0.35"/>
      <ellipse cx="78" cy="73" rx="10" ry="12" fill="#00cc66" opacity="0.25"/>
      <!-- Flechas de escape -->
      <path d="M35 80 Q22 68 28 52" stroke="#00cc66" stroke-width="2" stroke-dasharray="4 3" fill="none" opacity="0.6"/>
      <path d="M26 54 L28 52 L32 56" stroke="#00cc66" stroke-width="2" fill="none" opacity="0.6"/>
    </svg>`
  },
  "Sistema de Posiciones": {
    from: "#1a0a2e", to: "#2d1155", accent: "#a855f7",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Red de posiciones -->
      <circle cx="60" cy="60" r="6" fill="#a855f7" opacity="0.9"/>
      <circle cx="28" cy="38" r="5" fill="#a855f7" opacity="0.7"/>
      <circle cx="92" cy="38" r="5" fill="#a855f7" opacity="0.7"/>
      <circle cx="28" cy="82" r="5" fill="#a855f7" opacity="0.7"/>
      <circle cx="92" cy="82" r="5" fill="#a855f7" opacity="0.7"/>
      <circle cx="60" cy="22" r="4" fill="#a855f7" opacity="0.5"/>
      <circle cx="60" cy="98" r="4" fill="#a855f7" opacity="0.5"/>
      <!-- Conexiones -->
      <line x1="60" y1="60" x2="28" y2="38" stroke="#a855f7" stroke-width="1.5" opacity="0.5"/>
      <line x1="60" y1="60" x2="92" y2="38" stroke="#a855f7" stroke-width="1.5" opacity="0.5"/>
      <line x1="60" y1="60" x2="28" y2="82" stroke="#a855f7" stroke-width="1.5" opacity="0.5"/>
      <line x1="60" y1="60" x2="92" y2="82" stroke="#a855f7" stroke-width="1.5" opacity="0.5"/>
      <line x1="60" y1="60" x2="60" y2="22" stroke="#a855f7" stroke-width="1.5" opacity="0.5"/>
      <line x1="60" y1="60" x2="60" y2="98" stroke="#a855f7" stroke-width="1.5" opacity="0.5"/>
      <line x1="28" y1="38" x2="60" y2="22" stroke="#a855f7" stroke-width="1" opacity="0.3"/>
      <line x1="92" y1="38" x2="60" y2="22" stroke="#a855f7" stroke-width="1" opacity="0.3"/>
      <line x1="28" y1="82" x2="60" y2="98" stroke="#a855f7" stroke-width="1" opacity="0.3"/>
      <line x1="92" y1="82" x2="60" y2="98" stroke="#a855f7" stroke-width="1" opacity="0.3"/>
      <!-- Anillo exterior -->
      <circle cx="60" cy="60" r="38" stroke="#a855f7" stroke-width="1" stroke-dasharray="6 4" fill="none" opacity="0.25"/>
    </svg>`
  },
  "Espalda": {
    from: "#1f0000", to: "#3d0000", accent: "#ef4444",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Control de espalda -->
      <!-- Defensor (frente) -->
      <circle cx="56" cy="48" r="10" fill="#ef4444" opacity="0.5"/>
      <ellipse cx="56" cy="68" rx="13" ry="16" fill="#ef4444" opacity="0.4"/>
      <path d="M46 72 Q38 82 36 95" stroke="#ef4444" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
      <path d="M66 72 Q74 82 76 95" stroke="#ef4444" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
      <!-- Atacante (detrás, más brillante) -->
      <circle cx="68" cy="38" r="9" fill="#ef4444" opacity="0.85"/>
      <ellipse cx="64" cy="57" rx="12" ry="14" fill="#ef4444" opacity="0.7"/>
      <!-- Ganchos de pierna -->
      <path d="M56 75 Q48 85 44 98" stroke="#ef4444" stroke-width="5" stroke-linecap="round" opacity="0.75"/>
      <path d="M72 75 Q80 85 84 98" stroke="#ef4444" stroke-width="5" stroke-linecap="round" opacity="0.75"/>
      <!-- Brazos en mata-leão -->
      <path d="M58 52 Q72 44 80 50 Q86 54 82 62" stroke="#ef4444" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
      <!-- Símbolo -->
      <path d="M60 18 Q70 24 70 32 Q70 38 60 42 Q50 38 50 32 Q50 24 60 18Z" stroke="#ef4444" stroke-width="1.5" fill="none" opacity="0.35"/>
    </svg>`
  },
  "Lucha de Pie": {
    from: "#1a1000", to: "#2d1f00", accent: "#f59e0b",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Dos figuras de pie enfrentadas -->
      <ellipse cx="60" cy="110" rx="35" ry="5" fill="#f59e0b" opacity="0.12"/>
      <!-- Figura izquierda -->
      <circle cx="36" cy="32" r="9" fill="#f59e0b" opacity="0.75"/>
      <ellipse cx="36" cy="52" rx="10" ry="13" fill="#f59e0b" opacity="0.6"/>
      <path d="M30 62 Q24 78 22 95" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
      <path d="M42 62 Q46 78 46 95" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
      <path d="M30 46 Q20 38 16 30" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      <path d="M42 46 Q54 40 60 42" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <!-- Figura derecha (espejada) -->
      <circle cx="84" cy="32" r="9" fill="#f59e0b" opacity="0.75"/>
      <ellipse cx="84" cy="52" rx="10" ry="13" fill="#f59e0b" opacity="0.6"/>
      <path d="M90 62 Q96 78 98 95" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
      <path d="M78 62 Q74 78 74 95" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
      <path d="M90 46 Q100 38 104 30" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      <path d="M78 46 Q66 40 60 42" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <!-- Punto de contacto -->
      <circle cx="60" cy="42" r="4" fill="#f59e0b" opacity="0.9"/>
    </svg>`
  },
  "Controles": {
    from: "#001f1f", to: "#003333", accent: "#06b6d4",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Figura en mount/control superior -->
      <ellipse cx="60" cy="108" rx="35" ry="5" fill="#06b6d4" opacity="0.12"/>
      <!-- Defensor (abajo) -->
      <ellipse cx="60" cy="88" rx="28" ry="12" fill="#06b6d4" opacity="0.25"/>
      <circle cx="38" cy="78" r="8" fill="#06b6d4" opacity="0.3"/>
      <!-- Atacante (mount, arriba) -->
      <circle cx="62" cy="52" r="10" fill="#06b6d4" opacity="0.85"/>
      <ellipse cx="60" cy="72" rx="14" ry="15" fill="#06b6d4" opacity="0.7"/>
      <!-- Piernas en mount -->
      <path d="M48 80 Q36 88 32 100" stroke="#06b6d4" stroke-width="7" stroke-linecap="round" opacity="0.75"/>
      <path d="M72 80 Q84 88 88 100" stroke="#06b6d4" stroke-width="7" stroke-linecap="round" opacity="0.75"/>
      <!-- Brazos controlando -->
      <path d="M50 65 Q38 58 30 64" stroke="#06b6d4" stroke-width="5" stroke-linecap="round" opacity="0.65"/>
      <path d="M70 65 Q82 58 90 64" stroke="#06b6d4" stroke-width="5" stroke-linecap="round" opacity="0.65"/>
      <!-- Cruz de control -->
      <line x1="52" y1="60" x2="68" y2="60" stroke="#06b6d4" stroke-width="1.5" opacity="0.4"/>
      <line x1="60" y1="52" x2="60" y2="68" stroke="#06b6d4" stroke-width="1.5" opacity="0.4"/>
    </svg>`
  },
  "Derribos": {
    from: "#001a1a", to: "#0a2a2a", accent: "#14b8a6",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Figura ejecutando derribo (single leg) -->
      <ellipse cx="60" cy="110" rx="35" ry="5" fill="#14b8a6" opacity="0.15"/>
      <!-- Atacante (agachado) -->
      <circle cx="44" cy="42" r="9" fill="#14b8a6" opacity="0.85"/>
      <ellipse cx="50" cy="60" rx="13" ry="14" fill="#14b8a6" opacity="0.7"/>
      <path d="M42 72 Q32 84 30 98" stroke="#14b8a6" stroke-width="6" stroke-linecap="round" opacity="0.65"/>
      <path d="M58 72 Q60 82 56 95" stroke="#14b8a6" stroke-width="6" stroke-linecap="round" opacity="0.65"/>
      <!-- Agarre de pierna -->
      <path d="M56 64 Q68 58 78 62" stroke="#14b8a6" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
      <!-- Defensor (cayendo) -->
      <circle cx="84" cy="30" r="8" fill="#14b8a6" opacity="0.5"/>
      <ellipse cx="84" cy="48" rx="10" ry="12" fill="#14b8a6" opacity="0.35"/>
      <path d="M78 58 Q70 72 68 88" stroke="#14b8a6" stroke-width="5" stroke-linecap="round" opacity="0.4"/>
      <path d="M90 58 Q96 68 95 82" stroke="#14b8a6" stroke-width="5" stroke-linecap="round" opacity="0.4"/>
      <!-- Flecha de derribo -->
      <path d="M90 26 Q105 42 98 62" stroke="#14b8a6" stroke-width="2" stroke-dasharray="4 3" fill="none" opacity="0.55"/>
      <path d="M96 62 L98 62 L102 56" stroke="#14b8a6" stroke-width="2" fill="none" opacity="0.55"/>
    </svg>`
  },
  "Fundamentos": {
    from: "#1a1400", to: "#2e2400", accent: "#eab308",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Símbolo de base sólida / fundamentos -->
      <!-- Figura en postura base -->
      <ellipse cx="60" cy="108" rx="30" ry="5" fill="#eab308" opacity="0.15"/>
      <circle cx="60" cy="32" r="10" fill="#eab308" opacity="0.85"/>
      <ellipse cx="60" cy="54" rx="13" ry="16" fill="#eab308" opacity="0.7"/>
      <path d="M50 68 Q42 82 40 100" stroke="#eab308" stroke-width="7" stroke-linecap="round" opacity="0.7"/>
      <path d="M70 68 Q78 82 80 100" stroke="#eab308" stroke-width="7" stroke-linecap="round" opacity="0.7"/>
      <!-- Brazos en postura de guardia de pie -->
      <path d="M50 48 Q36 42 30 36" stroke="#eab308" stroke-width="5" stroke-linecap="round" opacity="0.65"/>
      <path d="M70 48 Q84 42 90 36" stroke="#eab308" stroke-width="5" stroke-linecap="round" opacity="0.65"/>
      <!-- Estrella de fundamentos (5 puntas) -->
      <path d="M60 10 L62 17 L70 17 L64 22 L66 29 L60 24 L54 29 L56 22 L50 17 L58 17 Z" fill="#eab308" opacity="0.6"/>
      <!-- Pilares base -->
      <rect x="26" y="100" width="6" height="10" rx="2" fill="#eab308" opacity="0.4"/>
      <rect x="57" y="100" width="6" height="10" rx="2" fill="#eab308" opacity="0.4"/>
      <rect x="88" y="100" width="6" height="10" rx="2" fill="#eab308" opacity="0.4"/>
      <line x1="22" y1="110" x2="98" y2="110" stroke="#eab308" stroke-width="2" opacity="0.4"/>
    </svg>`
  },
  "Defensa personal": {
    from: "#0f0f1f", to: "#1a1a3d", accent: "#818cf8",
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Escudo + figura defensiva -->
      <!-- Escudo central -->
      <path d="M60 15 L82 26 L82 52 Q82 72 60 82 Q38 72 38 52 L38 26 Z" fill="#818cf8" opacity="0.18" stroke="#818cf8" stroke-width="2"/>
      <!-- Check de seguridad -->
      <path d="M50 50 L56 58 L70 42" stroke="#818cf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
      <!-- Figura defensiva pequeña -->
      <circle cx="60" cy="90" r="7" fill="#818cf8" opacity="0.7"/>
      <ellipse cx="60" cy="104" rx="9" ry="10" fill="#818cf8" opacity="0.55"/>
      <!-- Brazos en posición defensiva -->
      <path d="M53 98 Q42 94 38 100" stroke="#818cf8" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      <path d="M67 98 Q78 94 82 100" stroke="#818cf8" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      <!-- Destellos de protección -->
      <circle cx="60" cy="48" r="26" stroke="#818cf8" stroke-width="1" stroke-dasharray="5 4" fill="none" opacity="0.2"/>
    </svg>`
  },
};

// Tema por defecto para categorías no mapeadas
const DEFAULT_THEME = {
  from: "#111111", to: "#1f1f1f", accent: "#C9A84C",
  svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="50" r="10" fill="#C9A84C" opacity="0.7"/>
    <ellipse cx="60" cy="72" rx="13" ry="16" fill="#C9A84C" opacity="0.55"/>
    <path d="M50 85 Q42 96 40 110" stroke="#C9A84C" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    <path d="M70 85 Q78 96 80 110" stroke="#C9A84C" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    <path d="M50 65 Q38 58 32 52" stroke="#C9A84C" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
    <path d="M70 65 Q82 58 88 52" stroke="#C9A84C" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
  </svg>`
};

function getCategoryTheme(name: string) {
  return CATEGORY_THEMES[name] ?? DEFAULT_THEME;
}

// ── Tarjeta de categoría ───────────────────────────────────────────────────
function CategoryCard({
  cat,
  count,
  onClick,
}: {
  cat: Category;
  count: number;
  onClick: () => void;
}) {
  const thumb = getPublicImageUrl(cat.thumbnail_url);
  const theme = getCategoryTheme(cat.name);

  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-xl overflow-hidden border border-white/8 hover:border-gold/50 transition-all duration-300 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
      style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
    >
      {/* Imagen cuadrada */}
      <div className="aspect-square relative overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={cat.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            {/* Gradiente de fondo ya en el padre, acá el SVG */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
              dangerouslySetInnerHTML={{ __html: theme.svg }}
            />
            {/* Glow en hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `radial-gradient(circle at 50% 60%, ${theme.accent}22 0%, transparent 70%)` }}
            />
          </>
        )}
        {/* Overlay degradado para el texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Info */}
      <div className="px-3.5 py-3 border-t border-white/5">
        <p
          className="text-sm font-semibold leading-snug transition-colors duration-200"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {cat.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: theme.accent, opacity: 0.85 }}>
          {count === 0 ? "Próximamente" : `${count} módulo${count !== 1 ? "s" : ""}`}
        </p>
      </div>
    </button>
  );
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
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            count={countMap.get(cat.name) ?? 0}
            onClick={() => onSelect(cat.name)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Mapa de subcategorías (UI only, sin cambio de DB) ─────────────────────
// Cada entrada define: nombre de subcategoría + función que matchea el título del curso.
// Si un curso no matchea ninguna subcategoría, va a "Otros".
const SUBCATEGORY_MAP: Record<
  string,
  { name: string; match: (title: string) => boolean }[]
> = {
  "Pasajes": [
    {
      name: "Pasajes Versus",
      match: (t) => /DLR|One[\s-]?Leg|Ara[nñ]a|Aranha/i.test(t),
    },
    {
      name: "Pasajes con Dominio Propio",
      match: (t) => /Guardia Abierta/i.test(t),
    },
  ],
};

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
  const theme = getCategoryTheme(categoryName);
  const subcategories = SUBCATEGORY_MAP[categoryName] ?? null;

  const inCategory = useMemo(
    () => courses.filter((c) => c.categories.includes(categoryName)),
    [courses, categoryName]
  );

  const sorted = useMemo(() => {
    const result = [...inCategory];
    switch (sort) {
      case "newest": result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "oldest": result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "az": result.sort((a, b) => a.title.localeCompare(b.title, "es")); break;
      case "shortest": result.sort((a, b) => a.total_duration - b.total_duration); break;
      case "longest": result.sort((a, b) => b.total_duration - a.total_duration); break;
    }
    return result;
  }, [inCategory, sort]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((c) => c.title.toLowerCase().includes(q));
  }, [sorted, search]);

  /* ── Agrupación en subcategorías ── */
  const groups = useMemo(() => {
    if (!subcategories) return null;
    const buckets = new Map<string, Course[]>(subcategories.map((s) => [s.name, []]));
    const others: Course[] = [];
    filtered.forEach((course) => {
      const sub = subcategories.find((s) => s.match(course.title));
      if (sub) buckets.get(sub.name)!.push(course);
      else others.push(course);
    });
    const result: { name: string; courses: Course[] }[] = subcategories
      .map((s) => ({ name: s.name, courses: buckets.get(s.name)! }))
      .filter((g) => g.courses.length > 0);
    if (others.length) result.push({ name: "Otros", courses: others });
    return result;
  }, [subcategories, filtered]);

  /* En modo flat (sin subcategorías) usamos paginación */
  const visible = groups ? filtered : filtered.slice(0, page * PAGE_SIZE);
  const hasMore = !groups && visible.length < filtered.length;

  return (
    <div className="max-w-[1280px] mx-auto px-6">
      <div className="pt-24 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Todas las categorías
        </button>
        <h1 className="text-2xl font-medium" style={{ color: theme.accent }}>
          {categoryName}
        </h1>
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

      {filtered.length === 0 ? (
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
                <span className="font-medium" style={{ color: theme.accent }}>{categoryName}</span>.
                Volvé pronto.
              </p>
              <Button variant="secondary" onClick={onBack}>Ver todas las categorías</Button>
            </>
          )}
        </div>
      ) : groups ? (
        /* ── Vista con subcategorías ── */
        <div className="space-y-12 pb-20">
          {groups.map((group) => (
            <section key={group.name}>
              {/* Header de subcategoría */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-5 rounded-full" style={{ background: theme.accent }} />
                <h2 className="text-base font-semibold text-text-primary">{group.name}</h2>
                <span className="text-xs text-text-tertiary">
                  {group.courses.length} módulo{group.courses.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.courses.map((course) => (
                  <CourseCard key={course.id} course={course} showProgress={isLoggedIn} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* ── Vista flat (sin subcategorías) ── */
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
interface CatalogViewProps {
  courses: Course[];
  allCategories?: Category[];
  isLoggedIn?: boolean;
  initialInstructor?: string;
}

export function CatalogView({ courses, allCategories = [], isLoggedIn = false, initialInstructor }: CatalogViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const handleBack = useCallback(() => setSelectedCategory(null), []);

  const instructorFilter = initialInstructor ?? "";
  const activeInstructorName = useMemo(() => {
    if (!instructorFilter) return null;
    return courses.find((c) => c.instructor?.id === instructorFilter)?.instructor?.name ?? null;
  }, [courses, instructorFilter]);

  if (instructorFilter && activeInstructorName) {
    const instructorCourses = courses.filter((c) => c.instructor?.id === instructorFilter);
    return (
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="pt-24 pb-6">
          <h1 className="text-2xl font-medium text-text-primary">
            Cursos de <span className="text-gold">{activeInstructorName}</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">{instructorCourses.length} módulos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
          {instructorCourses.map((course) => (
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

  return <CategoryGrid categories={allCategories} courses={courses} onSelect={setSelectedCategory} />;
}
