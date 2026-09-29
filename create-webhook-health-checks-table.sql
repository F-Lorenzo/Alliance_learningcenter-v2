-- Tabla para el resultado de /api/cron/webhook-healthcheck: un ping real y firmado que el cron
-- de Vercel manda periódicamente a la URL PÚBLICA de /api/webhooks/mp (no una llamada interna),
-- para detectar justamente el tipo de falla que causó el incidente de septiembre/2026 (la URL
-- del webhook en Mercado Pago apuntaba al dominio sin "www", que en Vercel redirige — rompiendo
-- la entrega — y nadie lo notó hasta que un cliente reclamó).
--
-- Correr en Supabase -> SQL Editor -> New query -> Run.

create table if not exists public.webhook_health_checks (
  id          uuid        default gen_random_uuid() primary key,
  ok          boolean     not null,
  status_code int,
  error       text,
  checked_at  timestamptz default now() not null
);

create index if not exists webhook_health_checks_checked_at_idx
  on public.webhook_health_checks (checked_at desc);

-- Sin RLS: solo el service role (admin client, usado por el cron y por el panel admin) la toca.

-- Limpieza opcional: si en algún momento la tabla crece demasiado (un ping diario tarda ~1000
-- años en llegar a un volumen relevante, así que no es urgente), correr algo como:
-- delete from public.webhook_health_checks where checked_at < now() - interval '180 days';
