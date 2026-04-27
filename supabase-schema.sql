-- ============================================================
-- Alliance Learning Center — Schema completo
-- Correr en Supabase → SQL Editor → New query → Run
-- ============================================================

-- Extensiones
create extension if not exists "unaccent";

-- ─── PROFILES ────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  razon_social text,
  cuit text,
  condicion_iva text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users see own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-crear profile al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  status text not null default 'inactive', -- active | past_due | trialing | canceled | inactive
  plan text not null default 'monthly',    -- monthly | yearly
  mp_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.subscriptions enable row level security;
create policy "Users see own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- ─── CATEGORIES ──────────────────────────────────────────────
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  thumbnail_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.categories enable row level security;
create policy "Categories are public" on public.categories for select using (true);

insert into public.categories (name, slug, sort_order) values
  ('Guardia', 'guardia', 1),
  ('Pasajes', 'pasajes', 2),
  ('Escapes', 'escapes', 3),
  ('Espalda', 'espalda', 4),
  ('Controles', 'controles', 5),
  ('Derribos', 'derribos', 6),
  ('Fundamentos', 'fundamentos', 7),
  ('Defensa personal', 'defensa-personal', 8);

-- ─── INSTRUCTORS ─────────────────────────────────────────────
create table public.instructors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  belt text,
  photo_url text,
  bio text,
  achievements text[],
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.instructors enable row level security;
create policy "Instructors are public" on public.instructors for select using (true);

insert into public.instructors (name, belt, achievements, sort_order) values
  ('Marcelo Garcia', 'Cinturón negro 4to grado', array['Campeón Mundial 5x', 'ADCC Champion 4x'], 1),
  ('Romulo Barral', 'Cinturón negro 4to grado', array['Campeón Mundial 6x'], 2),
  ('Leandro Lo', 'Cinturón negro 2do grado', array['Campeón Mundial 8x'], 3),
  ('Bernardo Faria', 'Cinturón negro 3er grado', array['Campeón Mundial 5x'], 4),
  ('Lucas Lepri', 'Cinturón negro 3er grado', array['Campeón Mundial 6x'], 5);

-- ─── COURSES ─────────────────────────────────────────────────
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  description text,
  thumbnail_url text,
  trailer_url text,
  total_duration int default 0, -- segundos
  instructor_id uuid references public.instructors,
  is_free boolean default false,
  is_published boolean default false,
  is_new boolean default false,
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.courses enable row level security;
create policy "Published courses are public" on public.courses for select using (is_published = true);

-- ─── COURSE_CATEGORIES (M2M) ─────────────────────────────────
create table public.course_categories (
  course_id uuid references public.courses on delete cascade,
  category_id uuid references public.categories on delete cascade,
  primary key (course_id, category_id)
);
alter table public.course_categories enable row level security;
create policy "Course categories are public" on public.course_categories for select using (true);

-- ─── LESSONS ─────────────────────────────────────────────────
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses on delete cascade not null,
  slug text not null,
  title text not null,
  duration int default 0, -- segundos
  video_url text,         -- URL en Cloudflare R2
  is_free boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique (course_id, slug)
);
alter table public.lessons enable row level security;
-- Lecciones gratis: públicas. Lecciones pagas: solo suscriptores activos
create policy "Free lessons are public" on public.lessons for select using (is_free = true);
create policy "Paid lessons for subscribers" on public.lessons for select using (
  is_free = false and
  exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
    and status in ('active', 'trialing')
    and current_period_end > now()
  )
);

-- ─── PROGRESS ────────────────────────────────────────────────
create table public.progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  lesson_id uuid references public.lessons on delete cascade not null,
  watched_seconds int default 0,
  completed boolean default false,
  last_watched_at timestamptz default now(),
  unique (user_id, lesson_id)
);
alter table public.progress enable row level security;
create policy "Users manage own progress" on public.progress
  for all using (auth.uid() = user_id);

-- ─── FAVORITES ───────────────────────────────────────────────
create table public.favorites (
  user_id uuid references auth.users on delete cascade,
  course_id uuid references public.courses on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, course_id)
);
alter table public.favorites enable row level security;
create policy "Users manage own favorites" on public.favorites
  for all using (auth.uid() = user_id);

-- ─── NOTES ───────────────────────────────────────────────────
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  lesson_id uuid references public.lessons on delete cascade not null,
  text text not null,
  timestamp_seconds int default 0,
  created_at timestamptz default now()
);
alter table public.notes enable row level security;
create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = user_id);

-- ─── HELPER: calcular total_duration de un curso ─────────────
create or replace function update_course_duration()
returns trigger language plpgsql as $$
begin
  update public.courses
  set total_duration = (
    select coalesce(sum(duration), 0)
    from public.lessons
    where course_id = coalesce(new.course_id, old.course_id)
  )
  where id = coalesce(new.course_id, old.course_id);
  return new;
end;
$$;
create trigger on_lesson_change
  after insert or update or delete on public.lessons
  for each row execute procedure update_course_duration();
