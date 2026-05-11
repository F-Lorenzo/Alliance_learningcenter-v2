import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";

export function PricingSection() {
  return (
    <section className="py-20 px-6 text-center">
      <div className="max-w-[1280px] mx-auto">
        <SectionHeader label="PLANES" />
        <h2 className="text-3xl font-display font-medium text-text-primary mt-4">
          Una suscripción, acceso a todo
        </h2>
        <p className="text-text-secondary mt-2">
          Accedé a todos los módulos y técnicas sin límites
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto mt-12 text-left">
          {/* Mensual */}
          <div className="bg-bg-secondary rounded-xl p-8 border border-border-default">
            <p className="text-sm text-text-secondary mb-2">Mensual</p>
            <p className="text-4xl font-medium text-text-primary font-mono">
              $20.000
            </p>
            <p className="text-sm text-text-secondary mt-1">ARS por mes</p>
            <p className="text-xs text-text-tertiary mt-4">
              Cancelás cuando quieras
            </p>
            <div className="mt-6">
              <Link href="/planes">
                <Button variant="secondary" size="md" fullWidth>
                  Elegir mensual
                </Button>
              </Link>
            </div>
          </div>

          {/* Anual */}
          <div className="bg-bg-secondary rounded-xl p-8 border-2 border-gold relative">
            <span className="absolute -top-3 left-6 bg-gold text-black text-[11px] font-medium px-3 py-1 rounded-sm">
              Más elegido
            </span>
            <p className="text-sm text-text-secondary mb-2">Anual</p>
            <p className="text-4xl font-medium text-text-primary font-mono">
              $199.000
            </p>
            <p className="text-sm text-text-secondary mt-1">
              ARS por año · 2 meses gratis
            </p>
            <p className="text-xs text-text-tertiary mt-4">
              Equivalente a $16.583 por mes
            </p>
            <div className="mt-6">
              <Link href="/planes">
                <Button variant="primary" size="md" fullWidth>
                  Elegir anual
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <p className="text-xs text-text-tertiary mt-6">
          Pago con Mercado Pago · Tarjeta, efectivo o cuenta MP
        </p>
      </div>
    </section>
  );
}
