"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, BookOpen, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

function PasswordStrength({ password }: { password: string }) {
  const strength =
    password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
    : 3;

  const labels = ["", "Débil", "Regular", "Buena", "Fuerte"];
  const colors = ["", "bg-danger", "bg-warning", "bg-info", "bg-success"];
  const textColors = ["", "text-danger", "text-warning", "text-info", "text-success"];

  if (password.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= strength ? colors[strength] : "bg-bg-tertiary"
            )}
          />
        ))}
      </div>
      <span className={cn("text-[11px] font-medium", textColors[strength])}>
        {labels[strength]}
      </span>
    </div>
  );
}

export default function RegistroPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      setError(error.message === "User already registered"
        ? "Ya existe una cuenta con ese email"
        : "Error al crear la cuenta. Intentá de nuevo.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setShowConfirmModal(true);
  }

  function handleModalContinue() {
    setShowConfirmModal(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <>
      {/* Modal de confirmación de email */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-bg-secondary border border-border-default rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-5">
              <Mail className="w-7 h-7 text-gold" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Revisá tu correo
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed mb-1">
              Te enviamos un mail a
            </p>
            <p className="text-sm font-medium text-gold mb-4 break-all">{email}</p>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              Hacé clic en el link de confirmación para activar tu cuenta.
              Si no lo ves, revisá la carpeta de spam.
            </p>
            <Button variant="primary" size="lg" fullWidth onClick={handleModalContinue}>
              Entendido, ir al inicio
            </Button>
          </div>
        </div>
      )}

    <main className="min-h-screen flex items-center justify-center px-6 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <BookOpen className="w-6 h-6 text-gold" />
          <span className="text-text-primary font-medium tracking-wide">ALLIANCE</span>
          <span className="text-[11px] text-text-tertiary uppercase tracking-widest">Learning Center</span>
        </div>

        <div className="bg-bg-secondary rounded-xl p-8 border border-border-default">
          <h1 className="text-xl font-medium text-text-primary text-center mb-6">
            Creá tu cuenta
          </h1>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text-secondary">Nombre completo</label>
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Juan García"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

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
              <label className="text-xs text-text-secondary">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
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
              <PasswordStrength password={password} />
            </div>

            <Button variant="primary" size="lg" fullWidth disabled={loading} className="mt-2">
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <hr className="flex-1 border-border-default" />
            <span className="text-xs text-text-tertiary">o</span>
            <hr className="flex-1 border-border-default" />
          </div>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            type="button"
            onClick={handleGoogle}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>

          <p className="text-center mt-6 text-sm text-text-secondary">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-gold hover:underline">
              Ingresá
            </Link>
          </p>
        </div>
      </div>
    </main>
    </>
  );
}
