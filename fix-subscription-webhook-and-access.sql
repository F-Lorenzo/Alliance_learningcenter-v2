-- Corrige el modelo de datos de subscriptions para el flujo de compra/cancelación.
-- Correr UNA vez en Supabase -> SQL Editor -> New query -> Run (es idempotente: se puede
-- correr de nuevo sin romper nada).
--
-- Qué hace y por qué (ver también src/app/api/webhooks/mp/route.ts y
-- src/lib/subscription-logic.ts):
--
--  1. Columnas nuevas en subscriptions:
--     - mp_status_as_of: last_modified de MP del último evento de preapproval aplicado a esa
--       fila. Evita que un evento desordenado o reintentado tardíamente retroceda el estado
--       de una suscripción ya autorizada.
--     - last_payment_id: id del último pago de MP ya aplicado. Evita extender el período dos
--       veces si MP notifica el mismo pago más de una vez (creado + actualizado, o un
--       reintento de webhook).
--
--  2. Índice ÚNICO parcial en mp_subscription_id: evita que dos webhooks concurrentes para la
--     misma preapproval creen dos filas duplicadas. Permite múltiples NULL (las filas que
--     activa el admin manualmente, sin preapproval vinculada todavía).
--
--  3. Función public.user_has_active_access(): única fuente de verdad de "tiene acceso ahora"
--     a nivel SQL/RLS. Debe reflejar EXACTAMENTE isSubscriptionActive() del código — en
--     particular, ahora agrega gracia de 3 días (igual que la app) y, sobre todo, ACCESO
--     DURANTE canceled mientras current_period_end siga en el futuro: cancelar una suscripción
--     (desde la app, desde Mercado Pago o desde el admin) ya NO corta el acceso a lo ya pagado.
--     Antes la política de "lessons" exigía status IN (active, trialing) sin gracia y sin
--     contemplar canceled, lo que además contradecía la lógica de acceso de la app
--     (isSubscriptionActive) para usuarios en gracia o recién cancelados.
--
--  4. Actualiza la política "Paid lessons for subscribers" para usar esa función.

alter table public.subscriptions
  add column if not exists mp_status_as_of timestamptz,
  add column if not exists last_payment_id text;

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'subscriptions_mp_subscription_id_key'
  ) then
    create unique index subscriptions_mp_subscription_id_key
      on public.subscriptions (mp_subscription_id)
      where mp_subscription_id is not null;
  end if;
end $$;

create index if not exists subscriptions_user_id_created_at_idx
  on public.subscriptions (user_id, created_at desc);

create or replace function public.user_has_active_access(check_user_id uuid, at_time timestamptz default now())
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = check_user_id
      and (
        (
          s.status in ('active', 'trialing')
          and (s.current_period_end is null or s.current_period_end + interval '3 days' > at_time)
        )
        or (
          s.status = 'past_due'
          and s.current_period_end is not null
          and s.current_period_end + interval '3 days' > at_time
        )
        or (
          s.status = 'canceled'
          and s.current_period_end is not null
          and s.current_period_end > at_time
        )
      )
  );
$$;

drop policy if exists "Paid lessons for subscribers" on public.lessons;
create policy "Paid lessons for subscribers" on public.lessons for select using (
  is_free = false and public.user_has_active_access(auth.uid())
);

-- ── Diagnóstico opcional: filas que hoy violarían el nuevo índice único ──────────────────────
-- Si esta consulta devuelve filas, el CREATE UNIQUE INDEX de arriba falla: hay que decidir
-- manualmente cuál de las filas duplicadas por mp_subscription_id es la vigente antes de
-- reintentar (típicamente producto del bug de "eventos de otra preapproval pisan la fila
-- vigente" que este mismo deploy corrige).
--
-- select mp_subscription_id, count(*), array_agg(id order by created_at desc) as row_ids
-- from public.subscriptions
-- where mp_subscription_id is not null
-- group by mp_subscription_id
-- having count(*) > 1;
