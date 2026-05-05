"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

interface UserData {
  name: string;
  email: string;
  razon_social: string | null;
  cuit: string | null;
  condicion_iva: string | null;
}

interface SubData {
  status: string;
  plan: string;
  current_period_end: string | null;
}

interface Props {
  user: UserData;
  subscription: SubData | null;
  onLogout: () => Promise<void>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-border-default mt-6">
      <h2 className="text-base font-medium text-text-primary mb-5">{title}</h2>
      {children}
    </div>
  );
}

const PLAN_LABELS: Record<string, string> = {
  monthly: "Mensual",
  yearly: "Anual",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "bg-success/20 text-success" },
  trialing: { label: "Período de prueba", color: "bg-info/20 text-info" },
  past_due: { label: "Pago pendiente", color: "bg-warning/20 text-warning" },
  canceled: { label: "Cancelada", color: "bg-danger/20 text-danger" },
  inactive: { label: "Sin suscripción", color: "bg-bg-tertiary text-text-tertiary" },
};

export function CuentaClient({ user, subscription, onLogout }: Props) {
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const subStatus = subscription?.status ?? "inactive";
  const subLabel = STATUS_LABELS[subStatus] ?? STATUS_LABELS.inactive;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Navbar user={{ name: user.name, email: user.email }} onLogout={onLogout} />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-6 pt-8">
          <h1 className="text-2xl font-medium text-text-primary">Mi cuenta</h1>

          {/* Datos personales */}
          <Section title="Datos personales">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary">Nombre completo</label>
                <input
                  defaultValue={user.name}
                  className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary">Email</label>
                <input
                  value={user.email}
                  readOnly
                  className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-secondary cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <Button variant="primary" size="sm">Guardar cambios</Button>
            </div>
          </Section>

          {/* Datos de facturación */}
          <Section title="Datos de facturación">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary">Razón social</label>
                <input
                  defaultValue={user.razon_social ?? ""}
                  placeholder="Tu nombre o empresa"
                  className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary">CUIT</label>
                <input
                  defaultValue={user.cuit ?? ""}
                  placeholder="XX-XXXXXXXX-X"
                  className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-secondary">Condición IVA</label>
                <select
                  defaultValue={user.condicion_iva ?? ""}
                  className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="">Seleccioná</option>
                  <option>Consumidor Final</option>
                  <option>Monotributo</option>
                  <option>Responsable Inscripto</option>
                  <option>Exento</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <Button variant="primary" size="sm">Guardar</Button>
            </div>
          </Section>

          {/* Mi suscripción */}
          <Section title="Mi suscripción">
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Estado</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${subLabel.color}`}>
                  {subLabel.label}
                </span>
              </div>
              {subscription && (
                <>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Plan</span>
                    <span className="text-text-primary">
                      {PLAN_LABELS[subscription.plan] ?? subscription.plan}
                    </span>
                  </div>
                  {periodEnd && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Próximo cobro</span>
                      <span className="text-text-primary">{periodEnd}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Método de pago</span>
                    <span className="text-text-primary">Mercado Pago</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 pt-5 border-t border-border-default flex flex-col gap-2">
              <Button variant="ghost" size="sm" className="justify-start text-text-secondary hover:text-text-primary">
                Ver historial de pagos
              </Button>
              <Button variant="ghost" size="sm" className="justify-start text-text-secondary hover:text-text-primary">
                Descargar última factura
              </Button>

              {subscription && subscription.status === "active" && (
                !cancelConfirm ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-danger hover:text-danger mt-2"
                    onClick={() => setCancelConfirm(true)}
                  >
                    Cancelar suscripción
                  </Button>
                ) : (
                  <div className="mt-2 p-4 rounded-lg border border-danger/30 bg-danger/5">
                    <p className="text-sm text-text-primary mb-1 font-medium">¿Seguro que querés cancelar?</p>
                    <p className="text-xs text-text-secondary mb-4">
                      Vas a mantener acceso hasta el {periodEnd}.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="danger" size="sm">Sí, cancelar</Button>
                      <Button variant="ghost" size="sm" onClick={() => setCancelConfirm(false)}>
                        Quedarme suscripto
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}
