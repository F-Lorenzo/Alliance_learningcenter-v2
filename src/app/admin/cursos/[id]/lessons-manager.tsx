"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, GripVertical, Link as LinkIcon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext as SortableContextBase,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type React from "react";

// React 19 compatibility cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DndContextC = DndContext as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SortableContext = SortableContextBase as any;
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  slug: string;
  title: string;
  description: string | null;
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
  onReorderLessons: (courseId: string, orderedIds: string[]) => Promise<void>;
}

const fieldCls =
  "bg-bg-primary border border-border-default rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 transition-colors";

function LessonField({
  label, name, type = "text", placeholder, defaultValue, required,
}: {
  label: string; name: string; type?: string;
  placeholder?: string; defaultValue?: string | number; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-text-tertiary">{label}</label>
      <input
        name={name} type={type} placeholder={placeholder}
        defaultValue={String(defaultValue ?? "")} required={required}
        className={fieldCls}
      />
    </div>
  );
}

function LessonTextarea({ label, name, placeholder, defaultValue }: {
  label: string; name: string; placeholder?: string; defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-text-tertiary">{label}</label>
      <textarea
        name={name} placeholder={placeholder} defaultValue={defaultValue ?? ""}
        rows={3} className={cn(fieldCls, "resize-none")}
      />
    </div>
  );
}

function NewLessonForm({ courseId, onSubmit, onCancel }: {
  courseId: string;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => { await onSubmit(formData); onCancel(); });
  }
  return (
    <form onSubmit={handleSubmit} className="bg-bg-primary border border-gold/30 rounded-lg p-4 flex flex-col gap-3">
      <p className="text-xs font-medium text-gold uppercase tracking-wider">Nueva lección</p>
      <LessonField label="Título *" name="title" placeholder="Ej: Grip inicial y posición base" required />
      <LessonTextarea label="Descripción" name="description" placeholder="Breve descripción…" />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-tertiary flex items-center gap-1">
          <LinkIcon className="w-3 h-3" /> Link del video
        </label>
        <input name="video_url" type="url" placeholder="https://..." className={fieldCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LessonField label="Duración (segundos)" name="duration" type="number" placeholder="600" />
        <LessonField label="Orden" name="sort_order" type="number" defaultValue="1" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="is_free" value="true" className="w-3.5 h-3.5 rounded" />
        <span className="text-xs text-text-secondary">Lección gratuita</span>
      </label>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Agregar lección"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

function EditLessonForm({ lesson, courseId, onSubmit, onCancel }: {
  lesson: Lesson; courseId: string;
  onSubmit: (lessonId: string, courseId: string, formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => { await onSubmit(lesson.id, courseId, formData); onCancel(); });
  }
  return (
    <form onSubmit={handleSubmit} className="bg-bg-primary border border-gold/20 rounded-lg p-4 flex flex-col gap-3">
      <LessonField label="Título *" name="title" defaultValue={lesson.title} required />
      <LessonTextarea label="Descripción" name="description" defaultValue={lesson.description ?? ""} placeholder="Breve descripción…" />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-tertiary flex items-center gap-1">
          <LinkIcon className="w-3 h-3" /> Link del video
        </label>
        <input name="video_url" type="url" defaultValue={lesson.video_url ?? ""} placeholder="https://..." className={fieldCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LessonField label="Duración (seg)" name="duration" type="number" defaultValue={lesson.duration} />
        <LessonField label="Orden" name="sort_order" type="number" defaultValue={lesson.sort_order} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="is_free" value="true" defaultChecked={lesson.is_free} className="w-3.5 h-3.5 rounded" />
        <span className="text-xs text-text-secondary">Lección gratuita</span>
      </label>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

// ── Sortable row ──────────────────────────────────────────────────────────────
function SortableLesson({
  lesson, courseId, editingId, deletingId, delPending,
  onEdit, onDelete,
}: {
  lesson: Lesson; courseId: string; editingId: string | null;
  deletingId: string | null; delPending: boolean;
  onEdit: (id: string) => void; onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function fmtDuration(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all group",
        isDragging
          ? "border-gold/40 bg-bg-tertiary shadow-lg opacity-90 z-10"
          : "border-transparent hover:border-border-default hover:bg-bg-tertiary/50",
        deletingId === lesson.id && "opacity-40"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-text-tertiary hover:text-gold transition-colors shrink-0 touch-none"
        tabIndex={-1}
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <span className="text-xs font-mono text-text-tertiary w-5 shrink-0">
        {String(lesson.sort_order).padStart(2, "0")}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate leading-tight">{lesson.title}</p>
        {lesson.description && (
          <p className="text-xs text-text-tertiary truncate mt-0.5 leading-tight">{lesson.description}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-tertiary font-mono">{fmtDuration(lesson.duration)}</span>
          {lesson.is_free && (
            <span className="text-[10px] bg-success/15 text-success px-1.5 py-0 rounded-sm">GRATIS</span>
          )}
          {lesson.video_url && (
            <span className="text-[10px] bg-info/10 text-info px-1.5 py-0 rounded-sm flex items-center gap-0.5">
              <LinkIcon className="w-2.5 h-2.5" /> VIDEO
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(lesson.id)}
          className="p-1.5 rounded-md text-text-tertiary hover:text-gold hover:bg-gold/10 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(lesson.id)}
          disabled={delPending && deletingId === lesson.id}
          className="p-1.5 rounded-md text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function LessonsManager({
  courseId, lessons, onCreateLesson, onUpdateLesson, onDeleteLesson, onReorderLessons,
}: Props) {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [delPending, startDelTransition] = useTransition();
  const [reorderPending, startReorderTransition] = useTransition();

  // Local order state for optimistic reordering
  const sorted = [...lessons].sort((a, b) => a.sort_order - b.sort_order);
  const [items, setItems] = useState<Lesson[]>(sorted);

  // Sync if lessons prop changes (e.g. after server revalidation)
  const lessonKey = lessons.map((l) => l.id + l.sort_order).join(",");
  const [lastKey, setLastKey] = useState(lessonKey);
  if (lessonKey !== lastKey) {
    setLastKey(lessonKey);
    setItems([...lessons].sort((a, b) => a.sort_order - b.sort_order));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    setItems(reordered); // optimistic update

    startReorderTransition(async () => {
      await onReorderLessons(courseId, reordered.map((i) => i.id));
    });
  }

  function handleDelete(lessonId: string) {
    setDeletingId(lessonId);
    startDelTransition(async () => {
      await onDeleteLesson(lessonId, courseId);
      setDeletingId(null);
    });
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-medium text-text-primary">Lecciones</h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            {items.length} técnicas
            {reorderPending && <span className="ml-2 text-gold">Guardando orden…</span>}
          </p>
        </div>
        {!showNew && (
          <Button variant="secondary" size="sm" onClick={() => setShowNew(true)}>
            <Plus className="w-3.5 h-3.5" /> Agregar
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 && !showNew && (
          <p className="text-sm text-text-tertiary text-center py-6">
            Este curso no tiene lecciones todavía.
          </p>
        )}

        <DndContextC sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((lesson) =>
              editingId === lesson.id ? (
                <EditLessonForm
                  key={lesson.id}
                  lesson={lesson}
                  courseId={courseId}
                  onSubmit={onUpdateLesson}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <SortableLesson
                  key={lesson.id}
                  lesson={lesson}
                  courseId={courseId}
                  editingId={editingId}
                  deletingId={deletingId}
                  delPending={delPending}
                  onEdit={setEditingId}
                  onDelete={handleDelete}
                />
              )
            )}
          </SortableContext>
        </DndContextC>

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
