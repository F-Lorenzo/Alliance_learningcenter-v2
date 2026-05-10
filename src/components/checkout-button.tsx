"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tag, X, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface CheckoutButtonProps {
  plan: "monthly" | "yearly";
  highlighted: boolean;
}

interface CouponResult {
  valid: boolean;
  error?: string;
  code?: string;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  discount_amount?: number;
  original_price?: number;
  final_price?: number;
}

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

export function CheckoutButton({ plan, highlighted }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [showCouponField, setShowCouponField] = useState(false);
  const router = useRouter();
  const couponInputRef = useRef<HTMLInputElement>(null);

  async function validateCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCoupon(null);
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}&plan=${plan}`);
      const data: CouponResult = await res.json();
      setCoupon(data);
    } catch {
      setCoupon({ valid: false, error: "Error al validar el cupón" });
    } finally {
      setCouponLoading(false);
    }
  }

  function clearCoupon() {
    setCoupon(null);
    setCouponInput("");
  }

  function toggleCouponField() {
    setShowCouponField((v) => !v);
    if (!showCouponField) {
      clearCoupon();
      setTimeout(() => couponInputRef.current?.focus(), 50);
    }
  }

  async function handleClick() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?redirect=/planes`);
        return;
      }

      const res = await fetch("/api/checkout/mp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          coupon_code: coupon?.valid ? couponInput.trim().toUpperCase() : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al iniciar el pago");
      }

      const { init_point } = await res.json();
      window.location.href = init_point;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Cupón */}
      {!showCouponField ? (
        <button
          type="button"
          onClick={toggleCouponField}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-gold transition-colors self-start"
        >
          <Tag className="w-3 h-3" />
          Tengo un cupón de descuento
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                ref={couponInputRef}
                type="text"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value.toUpperCase());
                  if (coupon) setCoupon(null);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") validateCoupon(); }}
                placeholder="Código de cupón"
                className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors uppercase tracking-wider"
                disabled={couponLoading}
              />
            </div>
            <button
              type="button"
              onClick={validateCoupon}
              disabled={!couponInput.trim() || couponLoading}
              className="px-3 py-2 text-xs font-medium bg-bg-tertiary border border-border-default rounded-lg text-text-secondary hover:text-text-primary hover:border-gold/40 transition-colors disabled:opacity-40 shrink-0"
            >
              {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aplicar"}
            </button>
            <button
              type="button"
              onClick={() => { toggleCouponField(); clearCoupon(); setShowCouponField(false); }}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Feedback del cupón */}
          {coupon && (
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
              coupon.valid
                ? "bg-success/10 border border-success/20 text-success"
                : "bg-danger/10 border border-danger/20 text-danger"
            }`}>
              {coupon.valid ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>{coupon.code}</strong> aplicado —{" "}
                    {coupon.discount_type === "percentage"
                      ? `${coupon.discount_value}% de descuento`
                      : `${fmt(coupon.discount_amount!)} de descuento`}
                    {". "}Pagás <strong>{fmt(coupon.final_price!)}</strong> en lugar de {fmt(coupon.original_price!)}
                  </span>
                </>
              ) : (
                <span>{coupon.error ?? "Cupón inválido"}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Botón de pago */}
      <Button
        variant={highlighted ? "primary" : "secondary"}
        size="lg"
        fullWidth
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Redirigiendo a Mercado Pago…" : highlighted ? "Elegir anual" : "Elegir mensual"}
      </Button>

      {error && <p className="text-xs text-danger text-center">{error}</p>}
    </div>
  );
}
