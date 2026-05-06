"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

interface InstructorData {
  name?: string;
  belt?: string;
  photo_url?: string | null;
  bio?: string | null;
  achievements?: string[] | null;
  sort_order?: number;
}

interface Props {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  defaultValues?: InstructorData;
}

const fieldCls =
  "bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors";

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
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
        className={fieldCls}
      />
      {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

export function InstructorForm({ action, submitLabel, defaultValues = {} }: Props) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
      <section className="bg-bg-secondary border border-border-default rounded-xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-text-primary">Información personal</h2>

        <Field label="Nombre completo" name="name" placeholder="Ej: Marcelo Garcia" required defaultValue={defaultValues.name} />
        <Field label="Cinturón / Grado" name="belt" placeholder="Ej: Cinturón negro 4to grado" required defaultValue={defaultValues.belt} />
        <Field label="Foto (URL)" name="photo_url" type="url" placeholder="https://..." defaultValue={defaultValues.photo_url ?? ""} />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary">Biografía</label>
          <textarea
            name="bio"
            rows={4}
            placeholder="Describí la trayectoria del profesor…"
            defaultValue={defaultValues.bio ?? ""}
            className={`${fieldCls} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary">Logros</label>
          <textarea
            name="achievements"
            rows={4}
            placeholder={"Campeón Mundial 5x\nADCC Champion 4x\n(uno por línea)"}
            defaultValue={(defaultValues.achievements ?? []).join("\n")}
            className={`${fieldCls} resize-none font-mono text-xs`}
          />
          <p className="text-xs text-text-tertiary">Un logro por línea</p>
        </div>

        <Field
          label="Orden de aparición"
          name="sort_order"
          type="number"
          placeholder="1"
          defaultValue={String(defaultValues.sort_order ?? 99)}
          hint="Número menor = aparece primero"
        />
      </section>

      <Button variant="primary" size="lg" type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
