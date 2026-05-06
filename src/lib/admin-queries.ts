import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ── Helpers ────────────────────────────────────────────────────

/**
 * Obtiene TODOS los usuarios de auth paginando correctamente.
 * Reemplaza el patrón { perPage: 1000 } que falla con más de 1000 usuarios.
 */
async function fetchAllAuthUsers(db: ReturnType<typeof createAdminClient>) {
  const allUsers: Array<{ id: string; email?: string }> = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;
    allUsers.push(...data.users.map((u) => ({ id: u.id, email: u.email })));
    if (data.users.length < perPage) break; // última página
    page++;
  }

  return allUsers;
}

// ── Role del admin logueado ─────────────────────────────────────

export type AdminRole = "super_admin" | "admin" | "profesor" | "user";

/**
 * Devuelve el role del usuario logueado.
 * Lee primero del JWT (sin DB), hace fallback a profiles si no está cacheado.
 */
export async function getAdminCurrentRole(): Promise<AdminRole> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  // 1. JWT cache (app_metadata actualizado en setUserRole)
  const roleFromJwt = user?.app_metadata?.role as string | undefined;
  if (roleFromJwt) return roleFromJwt as AdminRole;

  // 2. Fallback a DB (para admins anteriores a la migración)
  if (user?.id) {
    const adminDb = createAdminClient();
    const { data } = await adminDb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.role) return data.role as AdminRole;
  }

  return "user";
}

// ── Stats ──────────────────────────────────────────────────────

export async function getAdminStats() {
  const db = createAdminClient();

  const [users, subs, courses, lessons] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("courses").select("id", { count: "exact", head: true }),
    db.from("lessons").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalUsers: users.count ?? 0,
    activeSubs: subs.count ?? 0,
    totalCourses: courses.count ?? 0,
    totalLessons: lessons.count ?? 0,
  };
}

// ── Usuarios ───────────────────────────────────────────────────

const USERS_PER_PAGE = 50;

export async function getAdminUsers(page = 1) {
  const db = createAdminClient();
  const offset = (page - 1) * USERS_PER_PAGE;

  // Las 4 fuentes de datos se consultan EN PARALELO para eliminar el N+1
  const [profilesResult, adminRowsResult, subsResult, authUsers] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, created_at, role", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + USERS_PER_PAGE - 1),
    db.from("admins").select("user_id"),
    db.from("subscriptions")
      .select("user_id, status, plan, current_period_end")
      .in("status", ["active", "trialing", "past_due"]),
    fetchAllAuthUsers(db),
  ]);

  const profiles = profilesResult.data ?? [];
  const total = profilesResult.count ?? 0;

  if (!profiles.length) return { users: [], total, page, perPage: USERS_PER_PAGE };

  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? "—"]));
  const adminSet = new Set(adminRowsResult.data?.map((a) => a.user_id as string) ?? []);
  const subMap = new Map(subsResult.data?.map((s) => [s.user_id as string, s]) ?? []);

  const users = profiles.map((p) => ({
    id: p.id as string,
    full_name: (p.full_name as string | null) ?? "—",
    email: emailMap.get(p.id as string) ?? "—",
    role: ((p.role as string | null) ?? "user") as AdminRole,
    is_admin: adminSet.has(p.id as string),
    created_at: p.created_at as string,
    subscription: subMap.get(p.id as string) ?? null,
  }));

  return { users, total, page, perPage: USERS_PER_PAGE };
}

// ── Cursos ─────────────────────────────────────────────────────

export async function getAdminCourses() {
  const db = createAdminClient();

  const { data } = await db
    .from("courses")
    .select(
      `id, slug, title, is_published, is_free, is_new, is_featured, created_at,
      instructor:instructors(id, name),
      course_categories(category:categories(id, name)),
      lessons(id)`
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((c) => ({
    id: c.id as string,
    slug: c.slug as string,
    title: c.title as string,
    is_published: c.is_published as boolean,
    is_free: c.is_free as boolean,
    is_new: c.is_new as boolean,
    is_featured: c.is_featured as boolean,
    created_at: c.created_at as string,
    instructor: c.instructor as unknown as { id: string; name: string } | null,
    categories: (
      (c.course_categories as unknown as Array<{ category: { id: string; name: string } | null }>) ?? []
    )
      .map((cc) => cc.category)
      .filter(Boolean) as Array<{ id: string; name: string }>,
    lesson_count: ((c.lessons as unknown[]) ?? []).length,
  }));
}

export async function getAdminCourse(id: string) {
  const db = createAdminClient();

  const { data } = await db
    .from("courses")
    .select(
      `id, slug, title, description, thumbnail_url, trailer_url,
      total_duration, is_free, is_published, is_new, is_featured,
      instructor_id,
      course_categories(category_id),
      lessons(id, slug, title, description, duration, video_url, is_free, sort_order)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    // Supabase puede devolver null en relaciones vacías — defensivo con ?? []
    category_ids: ((data.course_categories as Array<{ category_id: string }>) ?? []).map(
      (cc) => cc.category_id
    ),
    lessons: (
      (data.lessons as Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        duration: number;
        video_url: string | null;
        is_free: boolean;
        sort_order: number;
      }>) ?? []
    ).sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function getAdminCategories() {
  const db = createAdminClient();
  const { data } = await db.from("categories").select("id, name, slug").order("sort_order");
  return data ?? [];
}

export async function getAdminInstructors() {
  const db = createAdminClient();
  const { data } = await db.from("instructors").select("id, name, belt").order("sort_order");
  return data ?? [];
}

export async function getAdminInstructorsFull() {
  const db = createAdminClient();
  const { data } = await db
    .from("instructors")
    .select("id, name, belt, photo_url, bio, achievements, sort_order")
    .order("sort_order");
  return (data ?? []) as Array<{
    id: string;
    name: string;
    belt: string;
    photo_url: string | null;
    bio: string | null;
    achievements: string[] | null;
    sort_order: number;
  }>;
}

export async function getAdminInstructor(id: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("instructors")
    .select("id, name, belt, photo_url, bio, achievements, sort_order")
    .eq("id", id)
    .maybeSingle();
  return data as {
    id: string;
    name: string;
    belt: string;
    photo_url: string | null;
    bio: string | null;
    achievements: string[] | null;
    sort_order: number;
  } | null;
}

// ── Cobros ─────────────────────────────────────────────────────

export async function getAdminSubscriptions(page = 1) {
  const db = createAdminClient();
  const perPage = 50;
  const offset = (page - 1) * perPage;

  const { data: subs, count } = await db
    .from("subscriptions")
    .select(
      "id, user_id, status, plan, mp_subscription_id, current_period_start, current_period_end, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (!subs?.length) return { subscriptions: [], total: count ?? 0, page, perPage };

  const userIds = [...new Set(subs.map((s) => s.user_id as string))];

  // Profiles y auth users en paralelo
  const [profilesResult, authUsers] = await Promise.all([
    db.from("profiles").select("id, full_name").in("id", userIds),
    fetchAllAuthUsers(db),
  ]);

  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? "—"]));
  const nameMap = new Map(
    profilesResult.data?.map((p) => [p.id as string, p.full_name as string | null]) ?? []
  );

  const subscriptions = subs.map((s) => ({
    id: s.id as string,
    user_id: s.user_id as string,
    user_name: nameMap.get(s.user_id as string) ?? "—",
    user_email: emailMap.get(s.user_id as string) ?? "—",
    status: s.status as string,
    plan: s.plan as string,
    mp_subscription_id: s.mp_subscription_id as string | null,
    current_period_end: s.current_period_end as string | null,
    created_at: s.created_at as string,
  }));

  return { subscriptions, total: count ?? 0, page, perPage };
}
