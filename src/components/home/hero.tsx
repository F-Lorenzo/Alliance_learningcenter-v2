"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const words = ["Aprendé", "el", "jiu", "jitsu", "de", "Alliance"];

export function Hero() {
  return (
    <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Video / Fondo */}
      <div className="absolute inset-0 bg-bg-tertiary">
        {/* Placeholder hasta tener el video real */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1a1a_0%,_#0a0a0a_70%)]" />
        {/* Patrón sutil */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #C9A961 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-bg-primary/20" />

      {/* Contenido */}
      <div className="relative z-10 text-center max-w-2xl mx-auto px-6">
        {/* Headline con stagger */}
        <h1 className="font-display text-5xl md:text-6xl font-medium text-text-primary leading-tight">
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
              className="inline-block mr-[0.3em]"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-lg text-text-secondary mt-6 max-w-md mx-auto leading-relaxed"
        >
          Técnica por técnica · Acceso ilimitado a más de 20 sistemas · Desde{" "}
          <span className="text-text-primary">$20.000 ARS</span> al mes
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="text-sm text-gold/80 mt-2 tracking-wide"
        >
          Actualizaciones con nuevas técnicas todas las semanas
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-10"
        >
          <Link href="/modulos">
            <Button variant="primary" size="lg">
              Comenzar ahora
            </Button>
          </Link>
          <Link href="/modulos?filter=free">
            <Button variant="secondary" size="lg">
              Ver muestra gratis
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-tertiary"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="w-6 h-6" />
      </motion.div>
    </section>
  );
}
