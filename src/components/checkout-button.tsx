"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface CheckoutButtonProps {
  plan: "monthly" | "yearly";
  highlighted: boolean;
}

export function CheckoutButton({ plan, highlighted }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError("");

    try {
      // 1. Verificar sesión
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?redirect=/planes`);
        return;
      }

      // 2. Crear suscripción en MP
      const res = await fetch("/api/checkout/mp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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
    <div className="flex flex-col gap-2">
      <Button
        variant={highlighted ? "primary" : "secondary"}
        size="lg"
        fullWidth
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Redirigiendo a Mercado Pago…" : highlighted ? "Elegir anual" : "Elegir mensual"}
      </Button>
      {error && (
        <p className="text-xs text-danger text-center">{error}</p>
      )}
    </div>
  );
}
