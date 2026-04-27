"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/section-header";

const STEPS = [
  {
    num: "01",
    title: "Elegí tu posición",
    desc: "Guardia, pasajes, escapes, espalda y más. Navegá por categorías o buscá directamente la técnica que necesitás.",
  },
  {
    num: "02",
    title: "Mirá el módulo",
    desc: "Técnica por técnica, a tu ritmo, desde cualquier dispositivo. Videos en HD con controles profesionales.",
  },
  {
    num: "03",
    title: "Aplicalo en el tatami",
    desc: "Tu progreso se guarda automáticamente. Tomá notas en el momento exacto del video y volvé cuando quieras.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 max-w-4xl mx-auto px-6">
      <SectionHeader label="CÓMO FUNCIONA" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className="bg-bg-secondary rounded-xl p-6 border border-border-default hover:border-gold/30 transition-colors"
          >
            <p className="text-sm font-mono text-gold mb-4">{step.num}</p>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {step.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
