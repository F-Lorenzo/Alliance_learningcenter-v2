import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Página no encontrada",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6 text-center">
      {/* Número grande */}
      <p className="text-[120px] sm:text-[180px] font-mono font-semibold leading-none text-transparent bg-clip-text bg-gradient-to-b from-gold/60 to-gold/10 select-none">
        404
      </p>

      {/* Mensaje */}
      <h1 className="text-xl sm:text-2xl font-medium text-text-primary mt-2">
        Esta página no existe
      </h1>
      <p className="text-sm text-text-secondary mt-3 max-w-xs leading-relaxed">
        Es posible que el enlace esté roto o que la página haya sido movida.
      </p>

      {/* Botón */}
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 bg-gold hover:bg-gold/90 text-black text-sm font-medium px-6 py-3 rounded-lg transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
