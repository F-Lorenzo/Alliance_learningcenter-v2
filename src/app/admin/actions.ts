"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── CURSOS ─────────────────────────────────────────────────────

export async function createCourse(formData: FormData) {
  const db = createAdminClient();
  const title = formData.get("title") as string;

  const { data, error } = await db
    .from("courses")
    .insert({
      title,
      slug: slugify(title),
      description: formData.get("description") as string || null,
      thumbnail_url: formData.get("thumbnail_url") as string || null,
      trailer_url: formData.get("trailer_url") as string || null,
      instructor_id: formData.get("instructor_id") as string || null,
      is_free: formData.get("is_free") === "true",
      is_published: formData.get("is_published") === "true",
      is_new: formData.get("is_new") === "true",
      is_featured: formData.get("is_featured") === "true",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Asignar categorías
  const categoryIds = formData.getAll("category_ids") as string[];
  if (categoryIds.length) {
    await db.from("course_categories").insert(
      categoryIds.map((cat_id) => ({ course_id: data.id, category_id: cat_id }))
    );
  }

  revalidatePath("/admin/cursos");
  redirect(`/admin/cursos/${data.id}`);
}

export async function updateCourse(id: string, formData: FormData) {
  const db = createAdminClient();
  const title = formData.get("title") as string;

  const { error } = await db
    .from("courses")
    .update({
      title,
      slug: slugify(title),
      description: formData.get("description") as string || null,
      thumbnail_url: formData.get("thumbnail_url") as string || null,
      trailer_url: formData.get("trailer_url") as string || null,
      instructor_id: formData.get("instructor_id") as string || null,
      is_free: formData.get("is_free") === "true",
      is_published: formData.get("is_published") === "true",
      is_new: formData.get("is_new") === "true",
      is_featured: formData.get("is_featured") === "true",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Reemplazar categorías
  await db.from("course_categories").delete().eq("course_id", id);
  const categoryIds = formData.getAll("category_ids") as string[];
  if (categoryIds.length) {
    await db.from("course_categories").insert(
      categoryIds.map((cat_id) => ({ course_id: id, category_id: cat_id }))
    );
  }

  revalidatePath("/admin/cursos");
  revalidatePath(`/admin/cursos/${id}`);
  revalidatePath("/modulos");
}

export async function deleteCourse(id: string) {
  const db = createAdminClient();
  await db.from("courses").delete().eq("id", id);
  revalidatePath("/admin/cursos");
  redirect("/admin/cursos");
}

export async function togglePublished(id: string, current: boolean) {
  const db = createAdminClient();
  await db
    .from("courses")
    .update({ is_published: !current, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/cursos");
  revalidatePath(`/admin/cursos/${id}`);
}

// ── LECCIONES ──────────────────────────────────────────────────

export async function createLesson(courseId: string, formData: FormData) {
  const db = createAdminClient();
  const title = formData.get("title") as string;

  // Calcular el siguiente sort_order
  const { data: last } = await db
    .from("lessons")
    .select("sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = ((last?.sort_order as number) ?? 0) + 1;

  const { error } = await db.from("lessons").insert({
    course_id: courseId,
    title,
    slug: slugify(title),
    duration: parseInt(formData.get("duration") as string) || 0,
    video_url: formData.get("video_url") as string || null,
    is_free: formData.get("is_free") === "true",
    sort_order: nextOrder,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function updateLesson(
  lessonId: string,
  courseId: string,
  formData: FormData
) {
  const db = createAdminClient();
  const title = formData.get("title") as string;

  const { error } = await db
    .from("lessons")
    .update({
      title,
      slug: slugify(title),
      duration: parseInt(formData.get("duration") as string) || 0,
      video_url: formData.get("video_url") as string || null,
      is_free: formData.get("is_free") === "true",
      sort_order: parseInt(formData.get("sort_order") as string) || 1,
    })
    .eq("id", lessonId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function deleteLesson(lessonId: string, courseId: string) {
  const db = createAdminClient();
  await db.from("lessons").delete().eq("id", lessonId);
  revalidatePath(`/admin/cursos/${courseId}`);
}

// ── USUARIOS ───────────────────────────────────────────────────

export async function toggleAdminRole(userId: string, current: boolean) {
  const db = createAdminClient();
  await db
    .from("profiles")
    .update({ is_admin: !current })
    .eq("id", userId);
  revalidatePath("/admin/usuarios");
}
