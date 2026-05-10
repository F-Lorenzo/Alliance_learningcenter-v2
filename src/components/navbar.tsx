"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, BookOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/modulos", label: "Módulos" },
  { href: "/profesores", label: "Profesores" },
  { href: "/planes", label: "Planes" },
];

interface NavbarProps {
  user?: { name: string; email: string } | null;
  onLogout?: () => Promise<void>;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const initial = user?.name?.[0]?.toUpperCase() ?? "";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-xl bg-bg-primary/80 border-b border-border-default">
        <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-gold" />
              <span className="text-text-primary font-medium text-sm tracking-wide">
                ALLIANCE
              </span>
            </div>
            <span className="hidden sm:block text-[11px] text-text-tertiary uppercase tracking-widest">
              Learning Center
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm transition-colors",
                  pathname === link.href
                    ? "text-text-primary font-medium underline underline-offset-8 decoration-gold decoration-2"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {link.label}
              </Link>
            ))}

            <div className="w-px h-6 bg-border-default mx-2" />

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Mi progreso
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setAvatarOpen((v) => !v)}
                    className="w-8 h-8 rounded-full bg-gold/20 text-gold text-sm font-medium flex items-center justify-center hover:bg-gold/30 transition-colors"
                  >
                    {initial}
                  </button>
                  {avatarOpen && (
                    <div className="absolute right-0 top-10 w-44 bg-bg-secondary border border-border-default rounded-xl shadow-xl overflow-hidden">
                      <Link
                        href="/dashboard/cuenta"
                        className="block px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                        onClick={() => setAvatarOpen(false)}
                      >
                        Mi cuenta
                      </Link>
                      <Link
                        href="/dashboard/favoritos"
                        className="block px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                        onClick={() => setAvatarOpen(false)}
                      >
                        Mis favoritos
                      </Link>
                      <hr className="border-border-default" />
                      <form action={onLogout}>
                        <button
                          type="submit"
                          className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-bg-tertiary transition-colors"
                        >
                          Cerrar sesión
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button variant="secondary" size="sm">
                  Ingresar
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute right-0 top-0 bottom-0 w-72 bg-bg-secondary border-l border-border-default flex flex-col pt-20 px-6 gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "py-3 text-base transition-colors border-b border-border-default",
                  pathname === link.href
                    ? "text-text-primary font-medium"
                    : "text-text-secondary hover:text-text-primary"
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-6">
              {user ? (
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="md" fullWidth>
                    Mi progreso
                  </Button>
                </Link>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="md" fullWidth>
                    Ingresar
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
