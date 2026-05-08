-- Tabla para rate limiting de URLs firmadas de video
-- Usada por /api/videos/signed-url para protección entre instancias serverless

create table if not exists public.rate_limits (
  id         bigserial primary key,
  user_id    uuid    not null,
  created_at timestamptz default now() not null
);

-- Índice para queries rápidas por usuario + tiempo
create index if not exists rate_limits_user_time_idx
  on public.rate_limits (user_id, created_at);

-- Sin RLS: solo el admin client escribe/lee esta tabla
-- No expone datos sensibles de usuarios
