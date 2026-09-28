"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Verifica que el usuario logueado tiene rol admin o superior.
// Lanza error si no — corta la ejecución de cualquier action que la llame.
async function requireAdminRole() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const role = user.app_metadata?.role as string | undefined;
  if (!role || !["super_admin", "admin", "admin_profesor"].includes(role)) {
    throw new Error("Acceso denegado");
  }
}

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
  await requireAdminRole();
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
  redirect(`/admin/cursos/${data.id}?created=1`);
}

export async function updateCourse(id: string, formData: FormData) {
  await requireAdminRole();
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
  await requireAdminRole();
  const db = createAdminClient();
  await db.from("courses").delete().eq("id", id);
  revalidatePath("/admin/cursos");
  redirect("/admin/cursos");
}

export async function togglePublished(id: string, current: boolean) {
  await requireAdminRole();
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
  await requireAdminRole();
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
  await requireAdminRole();
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
      section_title: (formData.get("section_title") as string) || null,
    })
    .eq("id", lessonId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function deleteLesson(lessonId: string, courseId: string) {
  await requireAdminRole();
  const db = createAdminClient();
  await db.from("lessons").delete().eq("id", lessonId);
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function reorderLessons(courseId: string, orderedIds: string[]) {
  await requireAdminRole();
  const db = createAdminClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      db.from("lessons").update({ sort_order: index + 1 }).eq("id", id)
    )
  );
  revalidatePath(`/admin/cursos/${courseId}`);
}

// ── INSTRUCTORES ───────────────────────────────────────────────

export async function createInstructor(formData: FormData) {
  await requireAdminRole();
  const db = createAdminClient();

  const achievementsRaw = (formData.get("achievements") as string) ?? "";
  const achievements = achievementsRaw
    .split("\n")
    .map((a) => a.trim())
    .filter(Boolean);

  const { data, error } = await db
    .from("instructors")
    .insert({
      name: formData.get("name") as string,
      belt: formData.get("belt") as string,
      photo_url: (formData.get("photo_url") as string) || null,
      bio: (formData.get("bio") as string) || null,
      achievements: achievements.length ? achievements : null,
      sort_order: parseInt(formData.get("sort_order") as string) || 99,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/profesores");
  revalidatePath("/profesores");
  redirect(`/admin/profesores/${data.id}`);
}

export async function updateInstructor(id: string, formData: FormData) {
  await requireAdminRole();
  const db = createAdminClient();

  const achievementsRaw = (formData.get("achievements") as string) ?? "";
  const achievements = achievementsRaw
    .split("\n")
    .map((a) => a.trim())
    .filter(Boolean);

  const { error } = await db
    .from("instructors")
    .update({
      name: formData.get("name") as string,
      belt: formData.get("belt") as string,
      photo_url: (formData.get("photo_url") as string) || null,
      bio: (formData.get("bio") as string) || null,
      achievements: achievements.length ? achievements : null,
      sort_order: parseInt(formData.get("sort_order") as string) || 99,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/profesores");
  revalidatePath("/profesores");
}

export async function deleteInstructor(id: string) {
  await requireAdminRole();
  const db = createAdminClient();
  await db.from("instructors").delete().eq("id", id);
  revalidatePath("/admin/profesores");
  revalidatePath("/profesores");
  redirect("/admin/profesores");
}

// ── SUSCRIPCIONES ──────────────────────────────────────────────

export interface ToggleSubscriptionResult {
  ok: boolean;
  /** Advertencia no fatal (ej. no se pudo cancelar en Mercado Pago, pero sí en la base). */
  warning?: string;
}

/**
 * Activa o desactiva manualmente la suscripción de un usuario desde el panel admin.
 * - Si está activa/trialing → la cancela (status = "canceled") Y cancela la preapproval REAL en
 *   Mercado Pago si la fila tiene una vinculada — antes solo se marcaba en la base y Mercado
 *   Pago seguía cobrando; el próximo pago aprobado reactivaba solo a un usuario que el admin
 *   ya había dado de baja.
 * - Si no tiene o está cancelada → crea/reactiva con status = "active" (alta manual, sin MP).
 *   `plan` determina la duración: "monthly" = 1 mes, "yearly" = 1 año.
 */
export async function toggleSubscription(
  userId: string,
  currentStatus: string | null,
  plan: "monthly" | "yearly" = "yearly"
): Promise<ToggleSubscriptionResult> {
  await requireAdminRole();
  const db = createAdminClient();
  const isActive = currentStatus === "active" || currentStatus === "trialing";

  if (isActive) {
    // Buscar la(s) fila(s) activas para cancelar tambien su preapproval real en MP.
    const { data: rows } = await db
      .from("subscriptions")
      .select("id, mp_subscription_id")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);

    let mpWarning: string | undefined;
    const mpIds = (rows ?? [])
      .map((r) => r.mp_subscription_id as string | null)
      .filter((id): id is string => Boolean(id));

    if (mpIds.length > 0) {
      if (!process.env.MP_ACCESS_TOKEN) {
        mpWarning = "MP_ACCESS_TOKEN no configurado: la baja quedó solo en la base, Mercado Pago puede seguir cobrando.";
        console.error("[toggleSubscription]", mpWarning);
      } else {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const preApproval = new PreApproval(client);
        for (const mpId of mpIds) {
          try {
            await preApproval.update({ id: mpId, body: { status: "cancelled" } });
          } catch (err) {
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            console.error("[toggleSubscription] Error cancelando preapproval en MP:", mpId, msg);
            mpWarning = "No se pudo cancelar la suscripción en Mercado Pago; puede seguir cobrando. Revisalo manualmente en el panel de MP.";
          }
        }
      }
    }

    // Desactivar: marcar como cancelada
    const { error } = await db
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);

    revalidatePath("/admin/usuarios");
    if (error) return { ok: false, warning: error.message };
    return { ok: true, warning: mpWarning };
  } else {
    // Activar (alta manual, sin MP): calcular fecha de fin según plan elegido.
    const periodEnd = new Date();
    if (plan === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Reutilizar una fila "sin identidad" (sin preapproval de MP vinculada) si existe; nunca
    // una que ya pertenece a una preapproval real de MP — para que un alta manual no quede
    // mezclada con el historial de una suscripción de Mercado Pago y un evento tardío de esa
    // preapproval no le pise el estado a esta activación manual.
    const { data: existing } = await db
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .is("mp_subscription_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const write = existing
      ? db
          .from("subscriptions")
          .update({ status: "active", plan, current_period_end: periodEnd.toISOString() })
          .eq("id", existing.id)
      : db.from("subscriptions").insert({
          user_id: userId,
          status: "active",
          plan,
          current_period_end: periodEnd.toISOString(),
        });

    const { error } = await write;
    revalidatePath("/admin/usuarios");
    if (error) return { ok: false, warning: error.message };
    return { ok: true };
  }
}

// ── ROLES ──────────────────────────────────────────────────────

const VALID_ROLES = ["super_admin", "admin", "admin_profesor", "profesor", "user"] as const;
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
  await requireAdminRole();
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
