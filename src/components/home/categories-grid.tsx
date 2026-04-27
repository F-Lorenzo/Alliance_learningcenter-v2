"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SectionHeader } from "@/components/section-header";
import type { Category } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  guardia: "from-blue-900/40",
  pasajes: "from-purple-900/40",
  escapes: "from-green-900/40",
  espalda: "from-red-900/40",
  controles: "from-yellow-900/40",
  derribos: "from-orange-900/40",
  fundamentos: "from-teal-900/40",
  "defensa-personal": "from-rose-900/40",
};

interface CategoriesGridProps {
  categories: Category[];
}

export function CategoriesGrid({ categories }: CategoriesGridProps) {
  return (
    <section className="py-20 px-6 max-w-[1280px] mx-auto">
      <SectionHeader
        label="CATEGORÍAS"
        action="Ver todas →"
        actionHref="/modulos"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-10">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <Link
              href={`/modulos?category=${cat.slug}`}
              className="group aspect-[4/3] relative rounded-xl overflow-hidden bg-bg-secondary flex items-end block"
            >
              {/* Fondo degradado */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  CATEGORY_COLORS[cat.slug] ?? "from-bg-tertiary"
                } to-bg-secondary`}
              />
              {/* Overlay inferior */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {/* Scale en hover */}
              <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" />
              {/* Contenido */}
              <div className="relative z-10 p-4">
                <p className="text-base font-medium text-text-primary">
                  {cat.name}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {cat.course_count} módulos
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
