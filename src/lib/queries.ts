import { createClient } from "@/lib/supabase/server";
import type { Course, Category, Instructor, Lesson } from "@/types";

function transformCourse(row: Record<string, unknown>): Course {
  const ccRows = row.course_categories as Array<{ category: { name: string } | null }> | null;
  const lessonRows = row.lessons as Array<Record<string, unknown>> | undefined;

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string | undefined,
    thumbnail_url: row.thumbnail_url as string | undefined,
    trailer_url: row.trailer_url as string | undefined,
    total_duration: (row.total_duration as number) ?? 0,
    is_free: row.is_free as boolean,
    is_published: row.is_published as boolean,
    is_new: row.is_new as boolean | undefined,
    is_featured: row.is_featured as boolean | undefined,
    created_at: row.created_at as string,
    categories: ccRows?.map((cc) => cc.category?.name).filter(Boolean) as string[] ?? [],
    instructor: row.instructor as Instructor | undefined,
    lessons: lessonRows
      ? lessonRows
          .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
          .map((l) => ({
            id: l.id as string,
            slug: l.slug as string,
            title: l.title as string,
            duration: (l.duration as number) ?? 0,
            is_free: l.is_free as boolean,
            sort_order: l.sort_order as number,
            video_url: (l.video_url as string | null) ?? null,
          } satisfies Lesson))
      : undefined,
  };
}

const COURSE_SELECT = `
  id, slug, title, description, thumbnail_url, trailer_url,
  total_duration, is_free, is_published, is_new, is_featured, created_at,
  instructor:instructors(id, name, belt, photo_url, bio, achievements),
  course_categories(category:categories(name))
` as const;

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, thumbnail_url, sort_order")
    .order("sort_order");
  return (data ?? []) as Category[];
}

export async function getInstructors(): Promise<Instructor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("instructors")
    .select("id, name, belt, photo_url, bio, achievements")
    .order("sort_order");
  return (data ?? []) as Instructor[];
}

export async function getFreeCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("is_published", true)
    .eq("is_free", true)
    .order("created_at", { ascending: false })
    .limit(6);
  return (data ?? []).map((r) => transformCourse(r as Record<string, unknown>));
}

export async function getCourses(limit = 100): Promise<Course[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit); // evita cargar miles de cursos sin control
  return (data ?? []).map((r) => transformCourse(r as Record<string, unknown>));
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(
      `${COURSE_SELECT},
      lessons(id, slug, title, duration, is_free, sort_order)`
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) return null;
  return transformCourse(data as Record<string, unknown>);
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, razon_social, cuit, condicion_iva")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    name:
      (profile?.full_name as string | null) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email ??
      "",
    avatar_url: (profile?.avatar_url as string | null) ?? null,
    razon_social: (profile?.razon_social as string | null) ?? null,
    cuit: (profile?.cuit as string | null) ?? null,
    condicion_iva: (profile?.condicion_iva as string | null) ?? null,
  };
}

export async function getSubscription(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, plan, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { status: string; plan: string; current_period_end: string | null } | null;
}

export async function getLessonProgress(userId: string, lessonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("progress")
    .select("watched_seconds, completed")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  return { watched_seconds: data?.watched_seconds ?? 0, completed: data?.completed ?? false };
}

export async function getLessonWithCourse(courseSlug: string, lessonSlug: string) {
  const supabase = await createClient();

  // Dos queries en paralelo:
  // 1. Curso + lecciones para el sidebar (sin video_url → menos datos)
  // 2. Lección específica con video_url para el player
  const [courseResult, lessonResult] = await Promise.all([
    supabase
      .from("courses")
      .select("id, slug, title, lessons(id, slug, title, duration, is_free, sort_order)")
      .eq("slug", courseSlug)
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("lessons")
      .select("id, slug, title, duration, is_free, sort_order, video_url, course_id")
      .eq("slug", lessonSlug)
      .maybeSingle(),
  ]);

  const course = courseResult.data;
  const lessonRaw = lessonResult.data;

  if (!course || !lessonRaw) return null;

  // Verificar que la lección pertenece al curso correcto
  if (lessonRaw.course_id !== course.id) return null;

  const lessons = (course.lessons as Array<{
    id: string; slug: string; title: string; duration: number;
    is_free: boolean; sort_order: number;
  }>).sort((a, b) => a.sort_order - b.sort_order);

  const lesson = {
    id: lessonRaw.id as string,
    slug: lessonRaw.slug as string,
    title: lessonRaw.title as string,
    duration: (lessonRaw.duration as number) ?? 0,
    is_free: lessonRaw.is_free as boolean,
    sort_order: lessonRaw.sort_order as number,
    video_url: (lessonRaw.video_url as string | null) ?? null,
  };

  return { course, lessons, lesson };
}

export async function getRecentProgress(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("progress")
    .select(
      `watched_seconds, completed, last_watched_at,
      lesson:lessons(
        id, slug, title, duration, course_id,
        course:courses(
          id, slug, title, total_duration,
          course_categories(category:categories(name))
        )
      )`
    )
    .eq("user_id", userId)
    .order("last_watched_at", { ascending: false })
    .limit(3);
  return data ?? [];
}
