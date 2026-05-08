import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getInstructors, getCurrentUser } from "@/lib/queries";
import { logout } from "@/app/actions";
import { User, ArrowRight } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profesores — Alliance Learning Center",
  description: "Conocé al equipo de profesores de élite de Alliance Learning Center.",
};

export default async function ProfesoresPage() {
  const [instructors, user] = await Promise.all([getInstructors(), getCurrentUser()]);
  const navUser = user ? { name: user.name, email: user.email } : null;

  return (
    <>
      <Navbar user={navUser} onLogout={logout} />
      <main className="flex-1 pt-20 pb-24">

        {/* Hero */}
        <div className="max-w-[1280px] mx-auto px-6 pt-14 pb-10">
          <div className="max-w-xl">
            <p className="text-xs text-gold font-medium uppercase tracking-widest mb-3">
              Nuestro equipo
            </p>
            <h1 className="font-display text-4xl font-medium text-text-primary leading-tight">
              Profesores
            </h1>
            <p className="text-base text-text-secondary mt-4 leading-relaxed">
              Aprendé de instructores de nivel mundial con décadas de experiencia en competencia y enseñanza.
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div className="max-w-[1280px] mx-auto px-6">
          {instructors.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center mb-6">
                <User className="w-9 h-9 text-text-tertiary" />
              </div>
              <h2 className="text-lg font-medium text-text-primary mb-2">
                Próximamente
              </h2>
              <p className="text-sm text-text-secondary max-w-sm">
                Estamos preparando los perfiles de nuestros profesores. Volvé pronto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {instructors.map((instructor) => (
                <div
                  key={instructor.id}
                  className="bg-bg-secondary border border-border-default rounded-2xl overflow-hidden hover:border-gold/30 transition-colors group"
                >
                  {/* Foto */}
                  <div className="aspect-[4/3] bg-bg-tertiary overflow-hidden">
                    {instructor.photo_url ? (
                      <Image
                        src={instructor.photo_url}
                        alt={instructor.name}
                        width={480}
                        height={360}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl font-medium text-text-tertiary">
                          {instructor.name[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <p className="text-base font-medium text-text-primary leading-tight">
                      {instructor.name}
                    </p>
                    <p className="text-sm text-gold mt-1">{instructor.belt}</p>

                    {instructor.bio && (
                      <p className="text-sm text-text-secondary mt-3 leading-relaxed line-clamp-3">
                        {instructor.bio}
                      </p>
                    )}

                    {instructor.achievements && instructor.achievements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {instructor.achievements.map((a) => (
                          <span
                            key={a}
                            className="text-[11px] bg-bg-tertiary text-text-secondary px-2.5 py-1 rounded-sm"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/modulos?instructor=${instructor.id}`}
                      className="mt-5 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-sm font-medium text-text-secondary border border-border-default hover:border-gold/50 hover:text-gold transition-colors"
                    >
                      Ver cursos del profesor
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
      <Footer />
    </>
  );
}
