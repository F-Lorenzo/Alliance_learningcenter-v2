"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCoupon, deleteCoupon, toggleCoupon } from "./actions";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  applicable_plan: "monthly" | "yearly" | "all";
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
};

const PLAN_LABELS: Record<string, string> = { all: "Todos", monthly: "Mensual", yearly: "Anual" };

function fmt(n: number) { return `$${n.toLocaleString("es-AR")}`; }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="text-text-tertiary hover:text-gold transition-colors ml-1">
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function NewCouponModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Coupon) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createCoupon(fd);
      if (result.error) { setError(result.error); return; }
      onCreated(result.coupon!);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border-default rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-medium text-text-primary mb-6">Nuevo cupón</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código */}
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Código *</label>
            <input
              name="code"
              required
              placeholder="ej: ALLIANCE20"
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary uppercase tracking-wider placeholder:text-text-tertiary focus:outline-none focus:border-gold/50"
              onChange={(e) => e.target.value = e.target.value.toUpperCase()}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Descripción (nota interna)</label>
            <input
              name="description"
              placeholder="ej: Descuento apertura"
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50"
            />
          </div>

          {/* Tipo + valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Tipo de descuento *</label>
              <select
                name="discount_type"
                required
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo (ARS)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Valor *</label>
              <input
                name="discount_value"
                type="number"
                required
                min="1"
                placeholder="ej: 20"
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>

          {/* Plan aplicable */}
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Aplica a</label>
            <select
              name="applicable_plan"
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
            >
              <option value="all">Todos los planes</option>
              <option value="monthly">Solo mensual</option>
              <option value="yearly">Solo anual</option>
            </select>
          </div>

          {/* Max uses + vigencia */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Usos máximos (vacío = ilimitado)</label>
              <input
                name="max_uses"
                type="number"
                min="1"
                placeholder="ilimitado"
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Vence el (vacío = sin venc.)</label>
              <input
                name="valid_until"
                type="date"
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" size="md" fullWidth onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" size="md" fullWidth disabled={pending}>
              {pending ? "Creando…" : "Crear cupón"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CuponesClient({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [showModal, setShowModal] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleCreated(c: Coupon) {
    setCoupons((prev) => [c, ...prev]);
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      const result = await toggleCoupon(id);
      if (result.ok) {
        setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !c.is_active } : c));
      }
    });
  }

  function handleDelete(id: string, code: string) {
    if (!confirm(`¿Eliminar el cupón "${code}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteCoupon(id);
      if (result.ok) setCoupons((prev) => prev.filter((c) => c.id !== id));
    });
  }

  return (
    <div>
      {showModal && (
        <NewCouponModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Cupones de descuento</h1>
          <p className="text-sm text-text-secondary mt-0.5">{coupons.length} cupones</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Nuevo cupón
        </Button>
      </div>

      {/* Tabla */}
      {coupons.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border-default rounded-xl">
          <Tag className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary text-sm">No hay cupones todavía</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-gold hover:underline">
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="border border-border-default rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-tertiary border-b border-border-default">
              <tr>
                {["Código", "Descuento", "Plan", "Usos", "Vence", "Estado", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-text-tertiary font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-border-default last:border-0 hover:bg-bg-tertiary/50 transition-colors">
                  {/* Código */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-semibold text-text-primary tracking-wider">{c.code}</span>
                      <CopyButton text={c.code} />
                    </div>
                    {c.description && <p className="text-xs text-text-tertiary mt-0.5">{c.description}</p>}
                  </td>

                  {/* Descuento */}
                  <td className="px-4 py-3 text-gold font-medium">
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : fmt(c.discount_value)}
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3 text-text-secondary">{PLAN_LABELS[c.applicable_plan]}</td>

                  {/* Usos */}
                  <td className="px-4 py-3 text-text-secondary">
                    {c.current_uses}
                    {c.max_uses !== null ? ` / ${c.max_uses}` : " / ∞"}
                    {c.max_uses !== null && c.current_uses >= c.max_uses && (
                      <span className="ml-1 text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-sm">Agotado</span>
                    )}
                  </td>

                  {/* Vence */}
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {c.valid_until
                      ? new Date(c.valid_until) < new Date()
                        ? <span className="text-danger">Venció {new Date(c.valid_until).toLocaleDateString("es-AR")}</span>
                        : new Date(c.valid_until).toLocaleDateString("es-AR")
                      : "Sin venc."}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(c.id)}
                      disabled={pending}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        c.is_active ? "text-success hover:text-success/70" : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      {c.is_active
                        ? <><ToggleRight className="w-4 h-4" /> Activo</>
                        : <><ToggleLeft className="w-4 h-4" /> Inactivo</>
                      }
                    </button>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(c.id, c.code)}
                      disabled={pending}
                      className="text-text-tertiary hover:text-danger transition-colors"
                      aria-label="Eliminar cupón"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
