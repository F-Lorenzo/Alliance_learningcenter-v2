"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, GripVertical, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  slug: string;
  title: string;
  duration: number;
  video_url: string | null;
  is_free: boolean;
  sort_order: number;
}

interface Props {
  courseId: string;
  lessons: Lesson[];
  onCreateLesson: (formData: FormData) => Promise<void>;
  onUpdateLesson: (lessonId: string, courseId: string, formData: FormData) => Promise<void>;
  onDeleteLesson: (lessonId: string, courseId: string) => Promise<void>;
}

function LessonField({
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
  defaultValue?: string | number;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-text-tertiary">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={String(defaultValue ?? "")}
        required={required}
        className="bg-bg-primary border border-border-default rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors"
      />
    </div>
  );
}

function NewLessonForm({
  courseId,
  onSubmit,
  onCancel,
}: {
  courseId: string;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onSubmit(formData);
      onCancel();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-primary border border-gold/30 rounded-lg p-4 flex flex-col gap-3">
      <p className="text-xs font-medium text-gold uppercase tracking-wider">Nueva lección</p>
      <LessonField label="Título *" name="title" placeholder="Ej: Grip inicial y posición base" required />
      <LessonField label="Video (key en R2)" name="video_url" placeholder="ej: clase-guardia-1.mp4" />
      <LessonField label="Duración (segundos)" name="duration" type="number" placeholder="600" />
      <LessonField label="Orden" name="sort_order" type="number" defaultValue="1" />
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="is_free"
          value="true"
          className="w-3.5 h-3.5 rounded"
        />
        <span className="text-xs text-text-secondary">Lección gratuita</span>
      </label>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Agregar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function EditLessonForm({
  lesson,
  courseId,
  onSubmit,
  onCancel,
}: {
  lesson: Lesson;
  courseId: string;
  onSubmit: (lessonId: string, courseId: string, formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onSubmit(lesson.id, courseId, formData);
      onCancel();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-primary border border-gold/20 rounded-lg p-4 flex flex-col gap-3">
      <LessonField label="Título *" name="title" defaultValue={lesson.title} required />
      <LessonField label="Video (key en R2)" name="video_url" defaultValue={lesson.video_url ?? ""} placeholder="ej: clase-guardia-1.mp4" />
      <div className="grid grid-cols-2 gap-3">
        <LessonField label="Duración (seg)" name="duration" type="number" defaultValue={lesson.duration} />
        <LessonField label="Orden" name="sort_order" type="number" defaultValue={lesson.sort_order} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="is_free"
          value="true"
          defaultChecked={lesson.is_free}
          className="w-3.5 h-3.5 rounded"
        />
        <span className="text-xs text-text-secondary">Lección gratuita</span>
      </label>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function LessonsManager({ courseId, lessons, onCreateLesson, onUpdateLesson, onDeleteLesson }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [delPending, startDelTransition] = useTransition();

  function handleDelete(lessonId: string) {
    setDeletingId(lessonId);
    startDelTransition(async () => {
      await onDeleteLesson(lessonId, courseId);
      setDeletingId(null);
    });
  }

  function fmtDuration(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-medium text-text-primary">Lecciones</h2>
          <p className="text-xs text-text-tertiary mt-0.5">{lessons.length} técnicas</p>
        </div>
        {!showNew && (
          <Button variant="secondary" size="sm" onClick={() => setShowNew(true)}>
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {lessons.length === 0 && !showNew && (
          <p className="text-sm text-text-tertiary text-center py-6">
            Este curso no tiene lecciones todavía.
          </p>
        )}

        {lessons.map((lesson) =>
          editingId === lesson.id ? (
            <EditLessonForm
              key={lesson.id}
              lesson={lesson}
              courseId={courseId}
              onSubmit={onUpdateLesson}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={lesson.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-border-default hover:bg-bg-tertiary/50 transition-colors group",
                deletingId === lesson.id && "opacity-40"
              )}
            >
              <GripVertical className="w-3.5 h-3.5 text-text-tertiary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-xs font-mono text-text-tertiary w-5 shrink-0">
                {String(lesson.sort_order).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate leading-tight">{lesson.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-tertiary font-mono">{fmtDuration(lesson.duration)}</span>
                  {lesson.is_free && (
                    <span className="text-[10px] bg-success/15 text-success px-1.5 py-0 rounded-sm">
                      GRATIS
                    </span>
                  )}
                  {lesson.video_url && (
                    <span className="text-[10px] bg-info/10 text-info px-1.5 py-0 rounded-sm">
                      VIDEO
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => setEditingId(lesson.id)}
                  className="p-1.5 rounded-md text-text-tertiary hover:text-gold hover:bg-gold/10 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(lesson.id)}
                  disabled={delPending && deletingId === lesson.id}
                  className="p-1.5 rounded-md text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        )}

        {showNew && (
          <NewLessonForm
            courseId={courseId}
            onSubmit={onCreateLesson}
            onCancel={() => setShowNew(false)}
          />
        )}
      </div>
    </div>
  );
}
