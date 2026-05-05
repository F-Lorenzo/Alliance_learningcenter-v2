import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { getAdminCourse, getAdminCategories, getAdminInstructors } from "@/lib/admin-queries";
import { updateCourse, deleteCourse, createLesson, updateLesson, deleteLesson } from "@/app/admin/actions";
import { CourseForm } from "../course-form";
import { LessonsManager } from "./lessons-manager";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = await getAdminCourse(id);
  return { title: course ? `Admin — ${course.title}` : "Admin — Curso" };
}

export default async function EditCursoPage({ params }: Props) {
  const { id } = await params;

  const [course, categories, instructors] = await Promise.all([
    getAdminCourse(id),
    getAdminCategories(),
    getAdminInstructors(),
  ]);

  if (!course) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateCourse(id, formData);
  }

  async function handleDelete() {
    "use server";
    await deleteCourse(id);
  }

  async function handleCreateLesson(formData: FormData) {
    "use server";
    await createLesson(id, formData);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/admin/cursos"
            className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver a cursos
          </Link>
          <h1 className="text-2xl font-medium text-text-primary">{course.title}</h1>
        </div>

        <form action={handleDelete}>
          <button
            type="submit"
            onClick={(e) => {
              if (!confirm("¿Eliminar este curso y todas sus lecciones? Esta acción no se puede deshacer.")) {
                e.preventDefault();
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar curso
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8">
        {/* Columna izquierda: datos del curso */}
        <div className="max-w-2xl">
          <CourseForm
            categories={categories as Array<{ id: string; name: string }>}
            instructors={instructors as Array<{ id: string; name: string; belt: string }>}
            action={handleUpdate}
            submitLabel="Guardar cambios"
            defaultValues={{
              title: course.title as string,
              description: course.description as string ?? "",
              thumbnail_url: course.thumbnail_url as string | null,
              trailer_url: course.trailer_url as string | null,
              instructor_id: course.instructor_id as string | null,
              is_free: course.is_free as boolean,
              is_published: course.is_published as boolean,
              is_new: course.is_new as boolean,
              is_featured: course.is_featured as boolean,
              category_ids: course.category_ids,
            }}
          />
        </div>

        {/* Columna derecha: lecciones */}
        <div>
          <LessonsManager
            courseId={id}
            lessons={course.lessons}
            onCreateLesson={handleCreateLesson}
            onUpdateLesson={updateLesson}
            onDeleteLesson={deleteLesson}
          />
        </div>
      </div>
    </div>
  );
}
