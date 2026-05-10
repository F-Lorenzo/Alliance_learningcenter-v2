import { Check } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CheckoutButton } from "@/components/checkout-button";
import { getCurrentUser } from "@/lib/queries";
import { logout } from "@/app/actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planes",
  description: "Suscribite a Alliance Learning Center y accedé a todos los módulos de jiu jitsu.",
};

const FEATURES_SHARED = [
  "Todos los módulos incluidos",
  "Actualizaciones incluidas",
  "Desde cualquier dispositivo",
];

const PLAN_MONTHLY = {
  id: "monthly",
  name: "Mensual",
  price: "$20.000",
  period: "ARS por mes",
  features: [...FEATURES_SHARED, "Cancelás cuando quieras"],
  highlighted: false,
  tag: null,
  savings: null,
};

const PLAN_YEARLY = {
  id: "yearly",
  name: "Anual",
  price: "$199.000",
  period: "ARS por año",
  features: [...FEATURES_SHARED, "Cancelás cuando quieras", "Ahorrás $41.000 vs mensual"],
  highlighted: true,
  tag: "Mejor precio",
  savings: "Equivale a $16.583/mes",
};

export default async function PlanesPage() {
  const user = await getCurrentUser();
  const navUser = user ? { name: user.name, email: user.email } : null;

  return (
    <>
      <Navbar user={navUser} onLogout={logout} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-display text-3xl md:text-4xl font-medium text-text-primary">
              Empezá a entrenar como Alliance
            </h1>
            <p className="text-base text-text-secondary mt-3 max-w-md mx-auto">
              Acceso ilimitado a todos los módulos, técnicas y actualizaciones
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
            {[PLAN_MONTHLY, PLAN_YEARLY].map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl p-8 flex flex-col ${
                  plan.highlighted
                    ? "border-2 border-gold bg-bg-secondary"
                    : "border border-border-default bg-bg-secondary"
                }`}
              >
                {plan.tag && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-black text-[11px] font-medium px-4 py-1 rounded-full whitespace-nowrap">
                    {plan.tag}
                  </span>
                )}

                <p className="text-sm text-text-secondary">{plan.name}</p>
                <p className="text-5xl font-medium text-text-primary font-mono mt-2">{plan.price}</p>
                <p className="text-sm text-text-secondary mt-1">{plan.period}</p>
                {plan.savings && (
                  <p className="text-sm text-gold mt-1">{plan.savings}</p>
                )}

                <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-border-default flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Check className="w-3.5 h-3.5 text-success shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <CheckoutButton plan={plan.id as "monthly" | "yearly"} highlighted={plan.highlighted} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-tertiary text-center mt-8">
            Pago con Mercado Pago · Tarjeta, efectivo o cuenta MP
          </p>

          {/* FAQ rápido */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-border-default pt-12">
            {[
              { q: "¿Puedo cancelar cuando quiero?", a: "Sí, cancelás desde Mi cuenta en cualquier momento y mantenés el acceso hasta fin del período." },
              { q: "¿Qué métodos de pago aceptan?", a: "Mercado Pago: tarjeta de crédito, débito, efectivo (Rapipago/Pago Fácil) y saldo MP." },
              { q: "¿Emiten factura AFIP?", a: "Sí, automáticamente después de cada cobro. Solo necesitás cargar tu CUIT en Mi cuenta." },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-sm font-medium text-text-primary mb-1.5">{q}</p>
                <p className="text-sm text-text-secondary leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
