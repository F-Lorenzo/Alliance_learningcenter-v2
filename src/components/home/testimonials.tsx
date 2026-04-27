"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/section-header";

const TESTIMONIALS = [
  {
    id: "1",
    quote:
      "Desde que empecé con Alliance Learning Center mejoré muchísimo mi guardia. Las explicaciones son claras y puedo volver a ver cada técnica cuantas veces quiero.",
    name: "Martín R.",
    detail: "Alumno hace 2 años",
  },
  {
    id: "2",
    quote:
      "El contenido es de un nivel increíble. Aprender de los mismos profesores que entrenan los campeones mundiales desde mi casa es algo que no imaginaba posible.",
    name: "Carolina S.",
    detail: "Alumna hace 1 año",
  },
  {
    id: "3",
    quote:
      "Lo que más valoro es el orden del contenido. Podés seguir una ruta clara desde principiante y ver cómo mejorás semana a semana en el tatami.",
    name: "Diego M.",
    detail: "Alumno hace 6 meses",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 px-6 max-w-[1280px] mx-auto">
      <SectionHeader label="ALUMNOS" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className="bg-bg-secondary rounded-xl p-6 border border-border-default"
          >
            <span className="font-display text-4xl text-gold/30 leading-none block -mb-2">
              &ldquo;
            </span>
            <p className="text-sm text-text-primary leading-relaxed italic">
              {t.quote}
            </p>
            <div className="flex items-center gap-3 mt-5">
              <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-tertiary text-sm font-medium">
                {t.name[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {t.name}
                </p>
                <p className="text-xs text-text-secondary">{t.detail}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
