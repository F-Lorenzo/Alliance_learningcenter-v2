-- ============================================================
-- Alliance Admin — Solo correr ESTO (no el schema original)
-- Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Agregar columna is_admin a profiles (seguro si ya existe)
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Políticas admin (drop primero para evitar errores si ya existen)
drop policy if exists "Admins read all profiles"       on public.profiles;
drop policy if exists "Admins read all subscriptions"  on public.subscriptions;
drop policy if exists "Admins manage courses"          on public.courses;
drop policy if exists "Admins manage lessons"          on public.lessons;
drop policy if exists "Admins manage categories"       on public.categories;
drop policy if exists "Admins manage instructors"      on public.instructors;
drop policy if exists "Admins manage course_categories" on public.course_categories;

create policy "Admins read all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins read all subscriptions" on public.subscriptions
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins manage courses" on public.courses
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins manage lessons" on public.lessons
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins manage categories" on public.categories
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins manage instructors" on public.instructors
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins manage course_categories" on public.course_categories
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- 3. Hacerte admin (reemplazá con tu email si es diferente)
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'facundoilorenzo@gmail.com');
