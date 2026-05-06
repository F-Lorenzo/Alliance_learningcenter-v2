"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

interface Props {
  courseTitle: string;
  onDelete: () => Promise<void>;
}

export function DeleteCourseConfirm({ courseTitle, onDelete }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`¿Eliminar "${courseTitle}" y todas sus lecciones? Esta acción no se puede deshacer.`)) return;
    startTransition(() => onDelete());
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-40"
    >
      <Trash2 className="w-4 h-4" />
      {pending ? "Eliminando…" : "Eliminar curso"}
    </button>
  );
}
