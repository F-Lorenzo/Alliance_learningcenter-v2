-- Tabla para deduplicación e historial de webhooks de MercadoPago
-- Usada por /api/webhooks/mp para evitar procesar el mismo evento dos veces

create table if not exists public.webhook_events (
  id            uuid        default gen_random_uuid() primary key,
  event_id      text        not null unique,
  type          text        not null,
  status        text        not null default 'pending', -- pending | processed | failed
  payload       jsonb,
  error_message text,
  processed_at  timestamptz,
  created_at    timestamptz default now() not null
);

-- Índice para búsquedas por event_id (la constraint UNIQUE ya lo crea implícitamente,
-- pero este índice lo hace explícito para consultas administrativas)
create index if not exists webhook_events_event_id_idx
  on public.webhook_events (event_id);

-- Índice para filtrar por status (útil para revisar eventos fallidos)
create index if not exists webhook_events_status_idx
  on public.webhook_events (status, created_at desc);

-- Sin RLS: solo el service role (admin client) escribe/lee esta tabla
