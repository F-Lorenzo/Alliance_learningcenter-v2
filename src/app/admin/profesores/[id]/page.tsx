import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAdminInstructor } from "@/lib/admin-queries";
import { updateInstructor, deleteInstructor } from "@/app/admin/actions";
import { InstructorForm } from "../instructor-form";
import { DeleteInstructorButton } from "../delete-instructor-button";
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
  const instructor = await getAdminInstructor(id);

  if (!instructor) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateInstructor(id, formData);
  }

  return (
    <div className="p-8">
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
        </div>

        <DeleteInstructorButton
          instructorId={instructor.id}
          instructorName={instructor.name}
          onDelete={deleteInstructor}
        />
      </div>

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
    </div>
  );
}
