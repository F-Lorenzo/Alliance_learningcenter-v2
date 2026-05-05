import { createAdminClient } from "@/lib/supabase/admin";

// ── Stats ──────────────────────────────────────────────────────

export async function getAdminStats() {
  const db = createAdminClient();

  const [users, subs, courses, lessons] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
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

export async function getAdminUsers() {
  const db = createAdminClient();

  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, created_at")
    .order("created_at", { ascending: false });

  if (!profiles?.length) return [];

  // Emails desde auth
  const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(authUsers?.users?.map((u) => [u.id, u.email]) ?? []);

  // Admins desde tabla admins (sin recursión)
  const { data: adminRows } = await db.from("admins").select("user_id");
  const adminSet = new Set(adminRows?.map((a) => a.user_id as string) ?? []);

  // Suscripciones
  const { data: subs } = await db
    .from("subscriptions")
    .select("user_id, status, plan, current_period_end")
    .in("status", ["active", "trialing", "past_due"]);
  const subMap = new Map(subs?.map((s) => [s.user_id, s]) ?? []);

  return profiles.map((p) => ({
    id: p.id as string,
    full_name: (p.full_name as string | null) ?? "—",
    email: emailMap.get(p.id as string) ?? "—",
    is_admin: adminSet.has(p.id as string),
    created_at: p.created_at as string,
    subscription: subMap.get(p.id as string) ?? null,
  }));
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
      c.course_categories as unknown as Array<{ category: { id: string; name: string } | null }>
    )
      .map((cc) => cc.category)
      .filter(Boolean) as Array<{ id: string; name: string }>,
    lesson_count: (c.lessons as unknown[]).length,
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
      lessons(id, slug, title, duration, video_url, is_free, sort_order)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    category_ids: (data.course_categories as Array<{ category_id: string }>).map(
      (cc) => cc.category_id
    ),
    lessons: (
      data.lessons as Array<{
        id: string;
        slug: string;
        title: string;
        duration: number;
        video_url: string | null;
        is_free: boolean;
        sort_order: number;
      }>
    ).sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function getAdminCategories() {
  const db = createAdminClient();
  const { data } = await db
    .from("categories")
    .select("id, name, slug")
    .order("sort_order");
  return data ?? [];
}

export async function getAdminInstructors() {
  const db = createAdminClient();
  const { data } = await db
    .from("instructors")
    .select("id, name, belt")
    .order("sort_order");
  return data ?? [];
}

// ── Cobros ─────────────────────────────────────────────────────

export async function getAdminSubscriptions() {
  const db = createAdminClient();

  const { data: subs } = await db
    .from("subscriptions")
    .select(
      "id, user_id, status, plan, mp_subscription_id, current_period_start, current_period_end, created_at"
    )
    .order("created_at", { ascending: false });

  if (!subs?.length) return [];

  const userIds = [...new Set(subs.map((s) => s.user_id as string))];
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(authUsers?.users?.map((u) => [u.id, u.email]) ?? []);
  const nameMap = new Map(
    profiles?.map((p) => [p.id as string, p.full_name as string | null]) ?? []
  );

  return subs.map((s) => ({
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
}
