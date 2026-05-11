import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BookMarked, Eye, EyeOff } from "lucide-react";
import { getAdminInstructor, getAdminInstructorCourses } from "@/lib/admin-queries";
import { updateInstructor, deleteInstructor } from "@/app/admin/actions";
import { InstructorForm } from "../instructor-form";
import { DeleteInstructorButton } from "../delete-instructor-button";
import { getPublicImageUrl } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const instructor = await getAdminInstructor(id);
  return { title: instructor ? `Admin — ${instructor.name}` : "Admin — Profesor" };
}

export default async function EditProfesorPage({ params }: Props) {
  const { id } = await params;
  const [instructor, courses] = await Promise.all([
    getAdminInstructor(id),
    getAdminInstructorCourses(id),
  ]);

  if (!instructor) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateInstructor(id, formData);
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/admin/profesores"
            className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver a profesores
          </Link>
          <h1 className="text-2xl font-medium text-text-primary">{instructor.name}</h1>
          <p className="text-sm text-text-tertiary mt-0.5">{instructor.belt}</p>
        </div>

        <DeleteInstructorButton
          instructorId={instructor.id}
          instructorName={instructor.name}
          onDelete={deleteInstructor}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Formulario */}
        <InstructorForm
          action={handleUpdate}
          submitLabel="Guardar cambios"
          defaultValues={{
            name: instructor.name,
            belt: instructor.belt,
            photo_url: instructor.photo_url,
            bio: instructor.bio,
            achievements: instructor.achievements,
            sort_order: instructor.sort_order,
          }}
        />

        {/* Cursos asignados */}
        <aside className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-text-tertiary" />
              Cursos asignados
            </h2>
            <span className="text-xs text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded-full">
              {courses.length}
            </span>
          </div>

          {courses.length === 0 ? (
            <div className="bg-bg-secondary border border-border-default rounded-xl p-6 text-center">
              <p className="text-sm text-text-tertiary">
                Este profesor no tiene cursos asignados todavía.
              </p>
              <Link
                href="/admin/cursos"
                className="text-xs text-gold hover:underline mt-2 inline-block"
              >
                Ir a cursos para asignar →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {courses.map((course) => {
                const lessonCount = (course.lessons as unknown as Array<{ count: number }>)?.[0]?.count ?? 0;
                const thumbUrl = getPublicImageUrl(course.thumbnail_url);
                return (
                  <Link
                    key={course.id}
                    href={`/admin/cursos/${course.id}`}
                    className="flex items-center gap-3 bg-bg-secondary border border-border-default rounded-xl p-3 hover:border-gold/40 transition-colors group"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-10 rounded-md overflow-hidden bg-bg-tertiary shrink-0">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbUrl} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-bg-tertiary" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-gold transition-colors">
                        {course.title}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {lessonCount} técnica{lessonCount !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Estado publicación */}
                    {course.is_published ? (
                      <Eye className="w-3.5 h-3.5 text-success shrink-0" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
