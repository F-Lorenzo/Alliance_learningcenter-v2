import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getAdminCourses } from "@/lib/admin-queries";
import { togglePublished, deleteCourse } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Cursos" };

export default async function CursosPage() {
  const courses = await getAdminCourses();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Cursos</h1>
          <p className="text-sm text-text-secondary mt-1">{courses.length} cursos en total</p>
        </div>
        <Link
          href="/admin/cursos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-black text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo curso
        </Link>
      </div>

      <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider">
                Título
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                Instructor
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                Lecciones
              </th>
              <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-tertiary">
                  No hay cursos todavía.{" "}
                  <Link href="/admin/cursos/nuevo" className="text-gold hover:underline">
                    Creá el primero
                  </Link>
                </td>
              </tr>
            ) : (
              courses.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border-default last:border-b-0 hover:bg-bg-tertiary/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-text-primary font-medium leading-tight">{c.title}</p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {c.is_free && (
                        <span className="text-[10px] bg-success/15 text-success px-1.5 py-0.5 rounded-sm">
                          GRATIS
                        </span>
                      )}
                      {c.is_new && (
                        <span className="text-[10px] bg-gold/15 text-gold px-1.5 py-0.5 rounded-sm">
                          NUEVO
                        </span>
                      )}
                      {c.is_featured && (
                        <span className="text-[10px] bg-info/15 text-info px-1.5 py-0.5 rounded-sm">
                          DESTACADO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-text-secondary">
                    {c.instructor?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-text-secondary font-mono">
                    {c.lesson_count}
                  </td>
                  <td className="px-4 py-3">
                    <form
                      action={async () => {
                        "use server";
                        await togglePublished(c.id, c.is_published);
                      }}
                    >
                      <button
                        type="submit"
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-sm font-medium transition-opacity hover:opacity-70",
                          c.is_published
                            ? "bg-success/15 text-success"
                            : "bg-bg-tertiary text-text-tertiary"
                        )}
                      >
                        {c.is_published ? "Publicado" : "Borrador"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/cursos/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-tertiary hover:text-gold hover:bg-gold/10 rounded-md transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deleteCourse(c.id);
                        }}
                      >
                        <button
                          type="submit"
                          onClick={(e) => {
                            if (!confirm(`¿Eliminar "${c.title}"? Esta acción no se puede deshacer.`)) {
                              e.preventDefault();
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-tertiary hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
