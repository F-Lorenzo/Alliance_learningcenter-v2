import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createInstructor } from "@/app/admin/actions";
import { InstructorForm } from "../instructor-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Nuevo profesor" };

export default function NuevoProfesorPage() {
  return (
    <div className="p-8">
      <Link
        href="/admin/profesores"
        className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a profesores
      </Link>

      <h1 className="text-2xl font-medium text-text-primary mb-8">Nuevo profesor</h1>

      <InstructorForm action={createInstructor} submitLabel="Crear profesor" />
    </div>
  );
}
