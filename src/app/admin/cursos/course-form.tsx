"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

interface CourseData {
  title?: string;
  description?: string;
  thumbnail_url?: string | null;
  trailer_url?: string | null;
  instructor_id?: string | null;
  is_free?: boolean;
  is_published?: boolean;
  is_new?: boolean;
  is_featured?: boolean;
  category_ids?: string[];
}

interface Props {
  categories: Array<{ id: string; name: string }>;
  instructors: Array<{ id: string; name: string; belt: string }>;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  defaultValues?: CourseData;
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-text-secondary">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
      />
    </div>
  );
}

function Toggle({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          name={name}
          value="true"
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <div className="w-9 h-5 rounded-full bg-bg-tertiary border border-border-default peer-checked:bg-gold peer-checked:border-gold transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-text-tertiary peer-checked:bg-black peer-checked:translate-x-4 transition-all" />
      </div>
      <div>
        <p className="text-sm text-text-primary">{label}</p>
        {hint && <p className="text-xs text-text-tertiary mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

export function CourseForm({
  categories,
  instructors,
  action,
  submitLabel,
  defaultValues = {},
}: Props) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Datos básicos */}
      <section className="bg-bg-secondary border border-border-default rounded-xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-text-primary">Información del curso</h2>

        <Field
          label="Título"
          name="title"
          placeholder="Ej: Sistema X-Guard"
          defaultValue={defaultValues.title}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary">Descripción</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Describí el contenido del módulo…"
            defaultValue={defaultValues.description ?? ""}
            className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors resize-none"
          />
        </div>

        <Field
          label="URL de miniatura (thumbnail)"
          name="thumbnail_url"
          placeholder="https://..."
          defaultValue={defaultValues.thumbnail_url ?? ""}
        />

        <Field
          label="URL de trailer (preview)"
          name="trailer_url"
          placeholder="https://..."
          defaultValue={defaultValues.trailer_url ?? ""}
        />
      </section>

      {/* Instructor y categorías */}
      <section className="bg-bg-secondary border border-border-default rounded-xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-text-primary">Clasificación</h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary">Instructor</label>
          <select
            name="instructor_id"
            defaultValue={defaultValues.instructor_id ?? ""}
            className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
          >
            <option value="">Sin instructor asignado</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} — {i.belt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-secondary">Categorías</label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="category_ids"
                  value={cat.id}
                  defaultChecked={defaultValues.category_ids?.includes(cat.id)}
                  className="w-4 h-4 rounded border-border-default text-gold focus:ring-gold bg-bg-tertiary"
                />
                <span className="text-sm text-text-secondary">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Flags */}
      <section className="bg-bg-secondary border border-border-default rounded-xl p-6 flex flex-col gap-5">
        <h2 className="text-sm font-medium text-text-primary">Visibilidad y etiquetas</h2>

        <Toggle
          label="Publicado"
          name="is_published"
          defaultChecked={defaultValues.is_published}
          hint="Solo los cursos publicados son visibles para los alumnos"
        />
        <Toggle
          label="Gratis"
          name="is_free"
          defaultChecked={defaultValues.is_free}
          hint="Accesible sin suscripción activa"
        />
        <Toggle
          label="Marcar como Nuevo"
          name="is_new"
          defaultChecked={defaultValues.is_new}
          hint="Muestra el badge 'NUEVO' en las tarjetas"
        />
        <Toggle
          label="Destacado"
          name="is_featured"
          defaultChecked={defaultValues.is_featured}
          hint="Aparece resaltado en el home y catálogo"
        />
      </section>

      <Button variant="primary" size="lg" type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
