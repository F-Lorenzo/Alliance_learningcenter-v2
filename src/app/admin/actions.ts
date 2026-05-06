"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  redirect("/admin/cursos");
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
    description: (formData.get("description") as string) || null,
    duration: parseInt(formData.get("duration") as string) || 0,
    video_url: (formData.get("video_url") as string) || null,
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
      description: (formData.get("description") as string) || null,
      duration: parseInt(formData.get("duration") as string) || 0,
      video_url: (formData.get("video_url") as string) || null,
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

// ── SUSCRIPCIONES ──────────────────────────────────────────────

/**
 * Activa o desactiva manualmente la suscripción de un usuario desde el panel admin.
 * - Si está activa/trialing → la cancela (status = "canceled").
 * - Si no tiene o está cancelada → crea/reactiva con status = "active" por 1 año.
 */
export async function toggleSubscription(
  userId: string,
  currentStatus: string | null
) {
  const db = createAdminClient();
  const isActive = currentStatus === "active" || currentStatus === "trialing";

  if (isActive) {
    // Desactivar: marcar como cancelada
    await db
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);
  } else {
    // Activar: buscar fila existente para reutilizar el plan
    const { data: existing } = await db
      .from("subscriptions")
      .select("id, plan")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 año

    if (existing) {
      await db
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: periodEnd.toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await db.from("subscriptions").insert({
        user_id: userId,
        status: "active",
        plan: "yearly",
        current_period_end: periodEnd.toISOString(),
      });
    }
  }

  revalidatePath("/admin/usuarios");
}

// ── ROLES ──────────────────────────────────────────────────────

const VALID_ROLES = ["super_admin", "admin", "profesor", "user"] as const;
type Role = (typeof VALID_ROLES)[number];

/**
 * Cambia el rol de un usuario. Solo el super_admin puede ejecutar esta acción.
 * El rol super_admin no puede ser asignado ni removido desde aquí.
 */
export async function setUserRole(targetUserId: string, newRole: Role) {
  // 1. Verificar que el caller es super_admin
  const serverDb = await createClient();
  const {
    data: { user: caller },
  } = await serverDb.auth.getUser();

  if (!caller) throw new Error("No autenticado");
  const callerRole = caller.app_metadata?.role as string | undefined;
  if (callerRole !== "super_admin") throw new Error("Solo el super admin puede cambiar roles");
  if (!VALID_ROLES.includes(newRole)) throw new Error("Rol inválido");

  const db = createAdminClient();

  // 2. No se puede tocar al super_admin
  const { data: target } = await db
    .from("profiles")
    .select("role")
    .eq("id", targetUserId)
    .maybeSingle();
  if ((target?.role as string) === "super_admin") {
    throw new Error("El rol del super admin no puede cambiarse");
  }

  // 3. Actualizar profiles.role
  await db.from("profiles").update({ role: newRole }).eq("id", targetUserId);

  // 4. Sincronizar JWT app_metadata (sin DB extra en próximas requests)
  await db.auth.admin.updateUserById(targetUserId, {
    app_metadata: {
      role: newRole,
      is_admin: ["super_admin", "admin"].includes(newRole),
    },
  });

  // 5. Sincronizar tabla admins (retrocompatibilidad con proxy fallback)
  if (["super_admin", "admin"].includes(newRole)) {
    await db
      .from("admins")
      .upsert({ user_id: targetUserId }, { onConflict: "user_id" });
  } else {
    await db.from("admins").delete().eq("user_id", targetUserId);
  }

  revalidatePath("/admin/usuarios");
}

// ── USUARIOS ───────────────────────────────────────────────────

export async function toggleAdminRole(userId: string, current: boolean) {
  const db = createAdminClient();
  const makeAdmin = !current;

  // 1. Actualizar tabla admins
  if (current) {
    await db.from("admins").delete().eq("user_id", userId);
  } else {
    await db.from("admins").insert({ user_id: userId });
  }

  // 2. Sincronizar app_metadata en el JWT para que el proxy no haga
  //    una query a DB en cada request de este usuario.
  await db.auth.admin.updateUserById(userId, {
    app_metadata: { is_admin: makeAdmin },
  });

  revalidatePath("/admin/usuarios");
}
