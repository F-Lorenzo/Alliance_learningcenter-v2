"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "20+", label: "Sistemas" },
  { value: "200+", label: "Técnicas" },
  { value: "5", label: "Profesores campeones" },
  { value: "HD", label: "Producción cinematográfica" },
];

export function StatsBar() {
  return (
    <section className="border-y border-border-default py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-3xl font-medium text-text-primary font-mono">
                {stat.value}
              </p>
              <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
