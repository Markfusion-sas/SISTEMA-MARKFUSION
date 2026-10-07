-- ============================================================================
-- MarkFusion OS · Mensualidades de clientes
-- Cobros que se repiten cada mes (hosting, mantenimiento, bots, sistemas…).
-- Cada pago mensual queda en subscription_payments y genera su ingreso en
-- transactions; si se borra ese ingreso, el mes vuelve a quedar pendiente.
-- ============================================================================

create table public.subscriptions (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.clients (id) on delete set null,
  cliente      text,
  project_id   uuid references public.projects (id) on delete set null,
  servicio     text not null check (length(trim(servicio)) > 0),
  monto        numeric(14, 2) not null check (monto > 0),
  moneda       public.moneda not null default 'COP',
  dia_cobro    int not null check (dia_cobro between 1 and 31),
  fecha_inicio date not null default ((now() at time zone 'America/Bogota')::date),
  activo       boolean not null default true,
  notas        text,
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint subscriptions_destino_chk check (client_id is not null or nullif(trim(cliente), '') is not null)
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index subscriptions_client_idx on public.subscriptions (client_id);
create index subscriptions_activo_idx on public.subscriptions (activo);

create table public.subscription_payments (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.subscriptions (id) on delete cascade,
  -- Mes que se paga, siempre el día 1 (ej. 2026-10-01 = octubre 2026).
  periodo          date not null check (extract(day from periodo) = 1),
  monto            numeric(14, 2) not null check (monto > 0),
  moneda           public.moneda not null default 'COP',
  fecha_pago       date not null,
  metodo_pago      text,
  -- Si se elimina el ingreso en Finanzas, el pago del mes se elimina también.
  transaction_id   uuid references public.transactions (id) on delete cascade,
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  unique (subscription_id, periodo)
);

create index subscription_payments_periodo_idx on public.subscription_payments (periodo);
create index subscription_payments_tx_idx on public.subscription_payments (transaction_id);

alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

create policy "Autenticados: acceso total" on public.subscriptions
  for all to authenticated using (true) with check (true);

create policy "Autenticados: acceso total" on public.subscription_payments
  for all to authenticated using (true) with check (true);
