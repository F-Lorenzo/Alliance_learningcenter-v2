"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

interface Props {
  instructorId: string;
  instructorName: string;
  onDelete: (id: string) => Promise<void>;
}

export function DeleteInstructorButton({ instructorId, instructorName, onDelete }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`¿Eliminar a "${instructorName}"? Esta acción no se puede deshacer.`)) return;
    startTransition(() => onDelete(instructorId));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-tertiary hover:text-danger hover:bg-danger/10 rounded-md transition-colors disabled:opacity-40"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
