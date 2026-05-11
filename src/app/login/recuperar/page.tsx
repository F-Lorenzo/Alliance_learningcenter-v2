"use client";

import Link from "next/link";
import { useState } from "react";
import { GraduationCap, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RecuperarPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <GraduationCap className="w-6 h-6 text-gold" />
          <span className="text-text-primary font-medium tracking-wide">ALLIANCE</span>
          <span className="text-[11px] text-text-tertiary uppercase tracking-widest">Learning Center</span>
        </div>

        <div className="bg-bg-secondary rounded-xl p-8 border border-border-default">
          {sent ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
              <h1 className="text-lg font-medium text-text-primary mb-2">
                Revisá tu email
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                Te enviamos un link para recuperar tu contraseña. Si no aparece, revisá la carpeta de spam.
              </p>
              <Link href="/login" className="block mt-6">
                <Button variant="secondary" size="md" fullWidth>
                  Volver al inicio
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors mb-6"
              >
                <ArrowLeft className="w-3 h-3" /> Volver
              </Link>
              <h1 className="text-xl font-medium text-text-primary mb-2">
                Recuperar contraseña
              </h1>
              <p className="text-sm text-text-secondary mb-6">
                Ingresá tu email y te enviamos un link para crear una nueva contraseña.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-text-secondary">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <Button variant="primary" size="lg" fullWidth disabled={loading}>
                  {loading ? "Enviando…" : "Enviar link de recuperación"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
