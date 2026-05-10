-- Tabla de notas por técnica
create table if not exists public.lesson_notes (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  lesson_id     uuid        references public.lessons(id) on delete cascade not null,
  text          text        not null,
  timestamp_sec integer     not null default 0,
  created_at    timestamptz default now() not null
);

-- Índice para traer notas de un usuario+lección rápido
create index if not exists lesson_notes_user_lesson_idx
  on public.lesson_notes (user_id, lesson_id);

-- Row Level Security
alter table public.lesson_notes enable row level security;

create policy "Usuarios ven sus propias notas"
  on public.lesson_notes for select
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propias notas"
  on public.lesson_notes for insert
  with check (auth.uid() = user_id);

create policy "Usuarios borran sus propias notas"
  on public.lesson_notes for delete
  using (auth.uid() = user_id);
