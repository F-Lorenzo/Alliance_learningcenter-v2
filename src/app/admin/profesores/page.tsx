import Link from "next/link";
import { Plus, Pencil, User } from "lucide-react";
import { getAdminInstructorsFull } from "@/lib/admin-queries";
import { DeleteInstructorButton } from "./delete-instructor-button";
import { deleteInstructor } from "@/app/admin/actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Profesores" };

export default async function ProfesoresAdminPage() {
  const instructors = await getAdminInstructorsFull();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Profesores</h1>
          <p className="text-sm text-text-secondary mt-1">{instructors.length} en total</p>
        </div>
        <Link
          href="/admin/profesores/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-black text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo profesor
        </Link>
      </div>

      {instructors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-bg-secondary border border-border-default rounded-xl">
          <div className="w-14 h-14 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
            <User className="w-6 h-6 text-text-tertiary" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">Sin profesores cargados</p>
          <p className="text-xs text-text-tertiary mb-5">
            Agregá el primer profesor para que aparezca en la página pública.
          </p>
          <Link
            href="/admin/profesores/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-black text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar profesor
          </Link>
        </div>
      ) : (
        <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider">
                  Profesor
                </th>
                <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                  Cinturón
                </th>
                <th className="text-left px-4 py-3 text-text-tertiary font-medium text-xs uppercase tracking-wider hidden lg:table-cell">
                  Logros
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {instructors.map((instructor) => (
                <tr
                  key={instructor.id}
                  className="border-b border-border-default last:border-b-0 hover:bg-bg-tertiary/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-bg-tertiary overflow-hidden shrink-0 flex items-center justify-center text-text-tertiary text-sm font-medium">
                        {instructor.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={instructor.photo_url} alt={instructor.name} className="w-full h-full object-cover" />
                        ) : (
                          instructor.name[0]
                        )}
                      </div>
                      <div>
                        <p className="text-text-primary font-medium leading-tight">{instructor.name}</p>
                        {instructor.bio && (
                          <p className="text-xs text-text-tertiary truncate max-w-xs mt-0.5">{instructor.bio}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-text-secondary text-xs">
                    {instructor.belt}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(instructor.achievements ?? []).slice(0, 2).map((a) => (
                        <span key={a} className="text-[10px] bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-sm">
                          {a}
                        </span>
                      ))}
                      {(instructor.achievements?.length ?? 0) > 2 && (
                        <span className="text-[10px] text-text-tertiary">
                          +{(instructor.achievements?.length ?? 0) - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/profesores/${instructor.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-tertiary hover:text-gold hover:bg-gold/10 rounded-md transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </Link>
                      <DeleteInstructorButton
                        instructorId={instructor.id}
                        instructorName={instructor.name}
                        onDelete={deleteInstructor}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
