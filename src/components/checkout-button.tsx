"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tag, X, Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
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

const PLAN_INFO = {
  monthly: { label: "Plan Mensual", price: "$20.000", period: "ARS / mes" },
  yearly:  { label: "Plan Anual",   price: "$199.000", period: "ARS / año" },
};

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

export function CheckoutButton({ plan, highlighted }: CheckoutButtonProps) {
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon]           = useState<CouponResult | null>(null);
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const info     = PLAN_INFO[plan];

  /* focus the input when modal opens */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  /* close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") handleClose(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleClose() {
    setOpen(false);
    setError("");
    setCoupon(null);
    setCouponInput("");
  }

  async function validateCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCoupon(null);
    try {
      const res  = await fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}&plan=${plan}`);
      const data: CouponResult = await res.json();
      setCoupon(data);
    } catch {
      setCoupon({ valid: false, error: "Error al validar el cupón" });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handlePay() {
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

  /* ── final price display ── */
  const finalPrice = coupon?.valid ? fmt(coupon.final_price!) : info.price;
  const originalPrice = coupon?.valid ? info.price : null;

  return (
    <>
      {/* Plan card button */}
      <Button
        variant={highlighted ? "primary" : "secondary"}
        size="lg"
        fullWidth
        onClick={() => setOpen(true)}
      >
        {highlighted ? "Elegir anual" : "Elegir mensual"}
      </Button>

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* sheet */}
          <div className="relative bg-bg-secondary border border-border-default rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-default">
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-widest mb-0.5">{info.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-mono font-semibold ${coupon?.valid ? "text-gold" : "text-text-primary"}`}>
                    {finalPrice}
                  </span>
                  {originalPrice && (
                    <span className="text-sm text-text-tertiary line-through">{originalPrice}</span>
                  )}
                  <span className="text-xs text-text-tertiary">{info.period}</span>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-text-tertiary hover:text-text-primary transition-colors p-1"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* body */}
            <div className="px-6 py-5 space-y-4">
              {/* coupon section */}
              <div className="space-y-2">
                <label className="text-xs text-text-secondary flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Cupón de descuento (opcional)
                </label>

                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      if (coupon) setCoupon(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") validateCoupon(); }}
                    placeholder="ej: ALLIANCE20"
                    className="flex-1 bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors uppercase tracking-wider"
                    disabled={couponLoading || loading}
                  />
                  <button
                    type="button"
                    onClick={validateCoupon}
                    disabled={!couponInput.trim() || couponLoading || loading}
                    className="px-3 py-2 text-xs font-medium bg-bg-tertiary border border-border-default rounded-lg text-text-secondary hover:text-text-primary hover:border-gold/40 transition-colors disabled:opacity-40 shrink-0"
                  >
                    {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aplicar"}
                  </button>
                </div>

                {/* coupon feedback */}
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
                          <strong>{coupon.code}</strong>{" "}—{" "}
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}% off`
                            : `${fmt(coupon.discount_amount!)} off`}
                          . Pagás <strong>{fmt(coupon.final_price!)}</strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{coupon.error ?? "Cupón inválido o vencido"}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* pay button */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handlePay}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo…</>
                ) : (
                  <>Continuar con el pago <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>

              {error && (
                <p className="text-xs text-danger text-center">{error}</p>
              )}

              <p className="text-center text-[11px] text-text-tertiary">
                Pago seguro con Mercado Pago · Podés cancelar cuando quieras
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
