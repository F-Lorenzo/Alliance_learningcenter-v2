"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CheckoutButtonProps {
  plan: "monthly" | "yearly";
  highlighted: boolean;
}

export function CheckoutButton({ plan, highlighted }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    // 1. Si no está logueado → redirigir a login
    // const { data: { session } } = await supabase.auth.getSession()
    // if (!session) { router.push(`/login?redirect=/planes&plan=${plan}`); return; }

    // 2. Si está logueado → POST /api/checkout/mp
    // const res = await fetch('/api/checkout/mp', { method: 'POST', body: JSON.stringify({ plan }) })
    // const { init_point } = await res.json()
    // window.location.href = init_point

    // TODO: conectar cuando haya credenciales de MP
    router.push("/login?redirect=/planes&plan=" + plan);
    setLoading(false);
  }

  return (
    <Button
      variant={highlighted ? "primary" : "secondary"}
      size="lg"
      fullWidth
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Redirigiendo…" : highlighted ? "Elegir anual" : "Elegir mensual"}
    </Button>
  );
}
