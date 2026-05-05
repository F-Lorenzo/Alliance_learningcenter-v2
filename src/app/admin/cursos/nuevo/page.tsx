import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAdminCategories, getAdminInstructors } from "@/lib/admin-queries";
import { createCourse } from "@/app/admin/actions";
import { CourseForm } from "../course-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Nuevo curso" };

export default async function NuevoCursoPage() {
  const [categories, instructors] = await Promise.all([
    getAdminCategories(),
    getAdminInstructors(),
  ]);

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/admin/cursos"
        className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a cursos
      </Link>

      <h1 className="text-2xl font-medium text-text-primary mb-8">Nuevo curso</h1>

      <CourseForm
        categories={categories as Array<{ id: string; name: string }>}
        instructors={instructors as Array<{ id: string; name: string; belt: string }>}
        action={createCourse}
        submitLabel="Crear curso"
      />
    </div>
  );
}
