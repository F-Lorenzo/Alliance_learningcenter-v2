export interface Course {
  id: string;
  slug: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  trailer_url?: string;
  total_duration: number; // segundos
  is_free: boolean;
  is_published: boolean;
  is_new?: boolean;
  is_featured?: boolean;
  created_at: string;
  categories: string[];
  instructor?: Instructor;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  duration: number; // segundos
  is_free: boolean;
  sort_order: number;
  video_url?: string | null;
  section_title?: string | null;
}

export interface Instructor {
  id: string;
  name: string;
  belt: string;
  photo_url?: string;
  bio?: string;
  achievements?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  thumbnail_url?: string;
  course_count?: number;
  sort_order: number;
}

export interface Progress {
  lesson_id: string;
  watched_seconds: number;
  completed: boolean;
  last_watched_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  razon_social?: string;
  cuit?: string;
  condicion_iva?: string;
}

export interface Subscription {
  status: "active" | "past_due" | "trialing" | "canceled";
  plan: "monthly" | "yearly";
  current_period_end: string;
}
