"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader } from "@/components/section-header";
import { cn } from "@/lib/utils";

const FAQ = [
  {
    q: "¿Qué incluye la suscripción?",
    a: "Acceso ilimitado a toda la biblioteca de módulos y técnicas de contenido regular, más todas las actualizaciones que vamos sumando. Es todo lo que necesitás para entrenar y progresar. Adicionalmente, organizamos seminarios especiales y cursos extra con instructores invitados que se ofrecen de forma independiente — así podés elegir lo que más te interesa sin pagarlo dentro de la suscripción.",
  },
  {
    q: "¿Puedo ver el contenido desde el celular?",
    a: "Sí, la plataforma está optimizada para celular. Podés estudiar desde cualquier dispositivo con conexión a internet.",
  },
  {
    q: "¿Cómo cancelo mi suscripción?",
    a: "Podés cancelar en cualquier momento desde la sección Mi cuenta. Seguís teniendo acceso hasta que termine el período pagado.",
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: "Aceptamos Mercado Pago (tarjeta de crédito, débito, efectivo en Rapipago/Pago Fácil, y saldo MP). Próximamente AstroPay para pagos internacionales.",
  },
  {
    q: "¿Emiten factura?",
    a: "Sí, emitimos factura AFIP automáticamente después de cada cobro. Necesitás cargar tu CUIT y razón social en tu perfil.",
  },
  {
    q: "¿Hay prueba gratis?",
    a: "Podés ver técnicas gratuitas sin registrarte. Además, podés revisar nuestra sección de muestra gratis para conocer la calidad del contenido antes de suscribirte.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border-default">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex justify-between items-center py-5 text-left gap-4"
      >
        <span className="text-sm font-medium text-text-primary">{q}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-text-tertiary shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-text-secondary leading-relaxed pb-5">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <SectionHeader label="PREGUNTAS FRECUENTES" />
        <div className="mt-10">
          {FAQ.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
