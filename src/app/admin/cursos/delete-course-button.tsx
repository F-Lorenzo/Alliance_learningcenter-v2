"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

interface Props {
  courseId: string;
  courseTitle: string;
  onDelete: (courseId: string) => Promise<void>;
}

export function DeleteCourseButton({ courseId, courseTitle, onDelete }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`¿Eliminar "${courseTitle}"? Esta acción no se puede deshacer.`)) return;
    startTransition(() => onDelete(courseId));
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
