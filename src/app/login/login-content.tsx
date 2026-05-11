"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <BookOpen className="w-6 h-6 text-gold" />
          <span className="text-text-primary font-medium tracking-wide">ALLIANCE</span>
          <span className="text-[11px] text-text-tertiary uppercase tracking-widest">Learning Center</span>
        </div>

        <div className="bg-bg-secondary rounded-xl p-8 border border-border-default">
          <h1 className="text-xl font-medium text-text-primary text-center mb-6">
            Ingresá a tu cuenta
          </h1>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text-secondary">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-text-secondary">Contraseña</label>
                <Link href="/login/recuperar" className="text-xs text-text-tertiary hover:text-gold transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button variant="primary" size="lg" fullWidth disabled={loading} className="mt-2">
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-text-secondary">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="text-gold hover:underline">Registrate</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
