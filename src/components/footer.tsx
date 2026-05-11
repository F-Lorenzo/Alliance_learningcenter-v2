import Link from "next/link";
import { GraduationCap, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-bg-primary border-t border-border-default mt-auto">
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1: Marca */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-gold" />
              <span className="text-text-primary font-medium text-sm tracking-wide">
                ALLIANCE
              </span>
            </div>
            <p className="text-text-secondary text-sm max-w-xs leading-relaxed">
              La plataforma oficial de Alliance Argentina. Aprendé jiu jitsu de
              los mejores.
            </p>
          </div>

          {/* Col 2: Plataforma */}
          <div>
            <p className="text-[11px] uppercase tracking-[3px] text-text-tertiary font-medium mb-4">
              Plataforma
            </p>
            <ul className="flex flex-col gap-2.5">
              {[
                { href: "/modulos", label: "Módulos" },
                { href: "/profesores", label: "Profesores" },
                { href: "/planes", label: "Planes" },
                { href: "/faq", label: "FAQ" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Legal */}
          <div>
            <p className="text-[11px] uppercase tracking-[3px] text-text-tertiary font-medium mb-4">
              Legal
            </p>
            <ul className="flex flex-col gap-2.5">
              {[
                { href: "/terminos", label: "Términos" },
                { href: "/privacidad", label: "Privacidad" },
                { href: "/afip", label: "AFIP" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Social */}
          <div>
            <p className="text-[11px] uppercase tracking-[3px] text-text-tertiary font-medium mb-4">
              Seguinos
            </p>
            <div className="flex gap-4">
              {/* YouTube */}
              <a href="#" className="text-text-tertiary hover:text-text-primary transition-colors" aria-label="YouTube">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              {/* Instagram */}
              <a href="#" className="text-text-tertiary hover:text-text-primary transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              {/* WhatsApp */}
              <a href="#" className="text-text-tertiary hover:text-text-primary transition-colors" aria-label="WhatsApp">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border-default">
          <p className="text-text-tertiary text-xs text-center">
            © 2026 Alliance Buenos Aires · Desarrollo Web Argentina
          </p>
        </div>
      </div>
    </footer>
  );
}
