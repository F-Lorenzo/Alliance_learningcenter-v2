"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export function NewContentBanner() {
  return (
    <div className="bg-gold/10 border-y border-gold/30 py-3 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center justify-center gap-3 px-6"
      >
        {/* Pulsing dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold" />
        </span>

        <Zap className="w-4 h-4 text-gold shrink-0" fill="currentColor" />

        <p className="text-sm font-medium text-gold tracking-wide uppercase">
          Nuevos videos cada semana
        </p>

        <Zap className="w-4 h-4 text-gold shrink-0" fill="currentColor" />
      </motion.div>
    </div>
  );
}
