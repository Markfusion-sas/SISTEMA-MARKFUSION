-- ============================================================================
-- MarkFusion OS · Esquema inicial
-- Tablas, tipos, triggers, RLS y buckets de Storage.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tipos enumerados
-- ----------------------------------------------------------------------------
create type public.moneda as enum ('COP', 'USD');
create type public.cliente_estado as enum ('prospecto', 'activo', 'pausado', 'cerrado');
create type public.proyecto_tipo as enum ('web', 'automatizacion', 'bot_ia', 'ads', 'consultoria', 'otro');
create type public.proyecto_estado as enum ('en_curso', 'en_revision', 'entregado', 'mantenimiento', 'cancelado');
create type public.cotizacion_estado as enum ('borrador', 'enviada', 'aprobada', 'rechazada');
create type public.tarea_prioridad as enum ('alta', 'media', 'baja');
create type public.tarea_estado as enum ('pendiente', 'en_progreso', 'en_revision', 'hecha');
create type public.reunion_tipo as enum ('venta', 'kickoff', 'seguimiento', 'entrega', 'interna');
create type public.reunion_estado as enum ('programada', 'realizada', 'cancelada');
create type public.movimiento_tipo as enum ('ingreso', 'gasto');
create type public.cobro_estado as enum ('pendiente', 'pagado');
create type public.documento_tipo as enum ('contrato', 'brief', 'cotizacion', 'entregable', 'factura', 'otro');

-- ----------------------------------------------------------------------------
-- Utilidades
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Perfiles (1 a 1 con auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null,
  avatar_url  text,
  color       text not null default '#7c6cf0' check (color ~* '^#[0-9a-f]{6}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente cuando se crea un usuario en Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_palette text[] := array['#7c6cf0', '#22c3a6', '#f59e0b', '#ec4899', '#3b82f6'];
  v_count   int;
begin
  select count(*) into v_count from public.profiles;
  insert into public.profiles (id, nombre, color)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    v_palette[(v_count % array_length(v_palette, 1)) + 1]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Clientes
-- ----------------------------------------------------------------------------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) > 0),
  empresa     text,
  telefono    text,
  email       text,
  ciudad      text,
  pais        text default 'Colombia',
  estado      public.cliente_estado not null default 'prospecto',
  origen      text,
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

create index clients_estado_idx on public.clients (estado);
create index clients_nombre_idx on public.clients (lower(nombre));

-- ----------------------------------------------------------------------------
-- Proyectos
-- ----------------------------------------------------------------------------
create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete restrict,
  nombre         text not null check (length(trim(nombre)) > 0),
  tipo           public.proyecto_tipo not null default 'web',
  valor_total    numeric(14, 2) not null default 0 check (valor_total >= 0),
  moneda         public.moneda not null default 'COP',
  fee_mensual    numeric(14, 2) not null default 0 check (fee_mensual >= 0),
  estado         public.proyecto_estado not null default 'en_curso',
  fecha_inicio   date,
  fecha_entrega  date,
  descripcion    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint projects_fechas_chk check (fecha_entrega is null or fecha_inicio is null or fecha_entrega >= fecha_inicio)
);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create index projects_client_idx on public.projects (client_id);
create index projects_estado_idx on public.projects (estado);
create index projects_entrega_idx on public.projects (fecha_entrega);

-- ----------------------------------------------------------------------------
-- Cotizaciones
-- ----------------------------------------------------------------------------
create table public.quotes (
  id             uuid primary key default gen_random_uuid(),
  numero         text not null unique,
  client_id      uuid not null references public.clients (id) on delete cascade,
  project_id     uuid references public.projects (id) on delete set null,
  items          jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  total          numeric(14, 2) not null default 0,
  moneda         public.moneda not null default 'COP',
  fee_mensual    numeric(14, 2) not null default 0 check (fee_mensual >= 0),
  condiciones    text,
  vigencia_dias  int not null default 15 check (vigencia_dias > 0),
  estado         public.cotizacion_estado not null default 'borrador',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Genera el número MF-AAAA-MMDD (con sufijo -2, -3... si ya existe ese día)
-- y recalcula el total a partir de los ítems.
create or replace function public.set_quote_defaults()
returns trigger
language plpgsql
as $$
declare
  v_base text;
  v_n    int := 1;
begin
  if new.numero is null or trim(new.numero) = '' then
    v_base := 'MF-' || to_char(coalesce(new.created_at, now()) at time zone 'America/Bogota', 'YYYY-MMDD');
    perform pg_advisory_xact_lock(hashtext(v_base));
    new.numero := v_base;
    while exists (select 1 from public.quotes q where q.numero = new.numero) loop
      v_n := v_n + 1;
      new.numero := v_base || '-' || v_n;
    end loop;
  end if;

  new.total := coalesce((
    select sum(
      coalesce((item ->> 'cantidad')::numeric, 0) * coalesce((item ->> 'valor_unitario')::numeric, 0)
    )
    from jsonb_array_elements(new.items) as item
  ), 0);

  return new;
end;
$$;

create trigger quotes_defaults before insert or update of items, numero on public.quotes
  for each row execute function public.set_quote_defaults();

create trigger quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

create index quotes_client_idx on public.quotes (client_id);
create index quotes_estado_idx on public.quotes (estado);

-- ----------------------------------------------------------------------------
-- Reuniones
-- ----------------------------------------------------------------------------
create table public.meetings (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (length(trim(titulo)) > 0),
  tipo           public.reunion_tipo not null default 'seguimiento',
  client_id      uuid references public.clients (id) on delete set null,
  project_id     uuid references public.projects (id) on delete set null,
  fecha_inicio   timestamptz not null,
  fecha_fin      timestamptz,
  link           text,
  participantes  text,
  agenda         text,
  notas          text,
  decisiones     text,
  estado         public.reunion_estado not null default 'programada',
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint meetings_fechas_chk check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create trigger meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

create index meetings_inicio_idx on public.meetings (fecha_inicio);
create index meetings_client_idx on public.meetings (client_id);
create index meetings_project_idx on public.meetings (project_id);

-- ----------------------------------------------------------------------------
-- Tareas
-- ----------------------------------------------------------------------------
create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects (id) on delete cascade,
  meeting_id      uuid references public.meetings (id) on delete set null,
  titulo          text not null check (length(trim(titulo)) > 0),
  descripcion     text,
  responsable_id  uuid references public.profiles (id) on delete set null,
  prioridad       public.tarea_prioridad not null default 'media',
  estado          public.tarea_estado not null default 'pendiente',
  fecha_limite    date,
  completed_at    timestamptz,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  orden           double precision not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Marca completed_at al pasar a "hecha" y lo limpia al salir de ese estado.
create or replace function public.set_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'hecha' then
    if tg_op = 'INSERT' or old.estado is distinct from 'hecha' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_completed_at before insert or update of estado on public.tasks
  for each row execute function public.set_task_completed_at();

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create index tasks_project_idx on public.tasks (project_id);
create index tasks_meeting_idx on public.tasks (meeting_id);
create index tasks_responsable_idx on public.tasks (responsable_id);
create index tasks_estado_orden_idx on public.tasks (estado, orden);
create index tasks_fecha_limite_idx on public.tasks (fecha_limite);

-- ----------------------------------------------------------------------------
-- Cuentas por cobrar
-- ----------------------------------------------------------------------------
create table public.receivables (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  concepto           text not null check (length(trim(concepto)) > 0),
  monto              numeric(14, 2) not null check (monto > 0),
  moneda             public.moneda not null default 'COP',
  fecha_vencimiento  date not null,
  estado             public.cobro_estado not null default 'pendiente',
  pagado_en          date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger receivables_updated_at before update on public.receivables
  for each row execute function public.set_updated_at();

create index receivables_project_idx on public.receivables (project_id);
create index receivables_estado_venc_idx on public.receivables (estado, fecha_vencimiento);

-- ----------------------------------------------------------------------------
-- Movimientos (ingresos y gastos)
-- ----------------------------------------------------------------------------
create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  tipo            public.movimiento_tipo not null,
  monto           numeric(14, 2) not null check (monto > 0),
  moneda          public.moneda not null default 'COP',
  categoria       text not null,
  project_id      uuid references public.projects (id) on delete set null,
  receivable_id   uuid references public.receivables (id) on delete set null,
  descripcion     text,
  fecha           date not null default ((now() at time zone 'America/Bogota')::date),
  metodo_pago     text,
  soporte_url     text,
  registrado_por  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

create index transactions_fecha_idx on public.transactions (fecha desc);
create index transactions_tipo_cat_idx on public.transactions (tipo, categoria);
create index transactions_project_idx on public.transactions (project_id);
create index transactions_receivable_idx on public.transactions (receivable_id);

-- ----------------------------------------------------------------------------
-- Gastos recurrentes
-- ----------------------------------------------------------------------------
create table public.recurring_expenses (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) > 0),
  monto       numeric(14, 2) not null check (monto > 0),
  moneda      public.moneda not null default 'COP',
  dia_cobro   int not null check (dia_cobro between 1 and 31),
  categoria   text not null,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger recurring_expenses_updated_at before update on public.recurring_expenses
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Documentos
-- ----------------------------------------------------------------------------
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) > 0),
  tipo        public.documento_tipo not null default 'otro',
  file_url    text not null,
  subido_por  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint documents_vinculo_chk check (client_id is not null or project_id is not null)
);

create index documents_client_idx on public.documents (client_id);
create index documents_project_idx on public.documents (project_id);

-- ----------------------------------------------------------------------------
-- Categorías editables de movimientos
-- ----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  tipo        public.movimiento_tipo not null,
  slug        text not null check (slug ~ '^[a-z0-9_]+$'),
  nombre      text not null,
  color       text not null default '#71717a' check (color ~* '^#[0-9a-f]{6}$'),
  orden       int not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tipo, slug)
);

insert into public.categories (tipo, slug, nombre, color, orden) values
  ('gasto',   'herramientas_software', 'Herramientas y software', '#7c6cf0', 1),
  ('gasto',   'hosting_infra',         'Hosting e infraestructura', '#3b82f6', 2),
  ('gasto',   'pauta',                 'Pauta', '#ec4899', 3),
  ('gasto',   'freelancers',           'Freelancers', '#f59e0b', 4),
  ('gasto',   'impuestos',             'Impuestos', '#ef4444', 5),
  ('gasto',   'oficina',               'Oficina', '#14b8a6', 6),
  ('gasto',   'otros',                 'Otros', '#71717a', 7),
  ('ingreso', 'anticipo',              'Anticipo', '#22c3a6', 1),
  ('ingreso', 'pago_final',            'Pago final', '#10b981', 2),
  ('ingreso', 'fee_mensual',           'Fee mensual', '#7c6cf0', 3),
  ('ingreso', 'otros',                 'Otros', '#71717a', 4);

-- ----------------------------------------------------------------------------
-- Datos de la marca (fila única, usada en el PDF de cotizaciones)
-- ----------------------------------------------------------------------------
create table public.brand_settings (
  id                   int primary key default 1 check (id = 1),
  nombre_empresa       text not null default 'MarkFusion',
  nit                  text,
  telefono             text,
  email                text,
  direccion            text,
  sitio_web            text default 'markfusion.com.co',
  ciudad               text default 'Colombia',
  logo_url             text,
  condiciones_default  text default 'Anticipo del 50% para iniciar y 50% contra entrega. Precios no incluyen IVA.',
  updated_at           timestamptz not null default now()
);

create trigger brand_settings_updated_at before update on public.brand_settings
  for each row execute function public.set_updated_at();

insert into public.brand_settings (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Row Level Security: solo usuarios autenticados
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'clients', 'projects', 'quotes', 'meetings', 'tasks',
    'receivables', 'transactions', 'recurring_expenses', 'documents',
    'categories', 'brand_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Autenticados: acceso total" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Storage: buckets privados con acceso solo para autenticados
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('soportes', 'soportes', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']),
  ('documentos', 'documentos', false, 52428800, null),
  ('marca', 'marca', false, 5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "Autenticados leen archivos internos" on storage.objects
  for select to authenticated
  using (bucket_id in ('soportes', 'documentos', 'marca'));

create policy "Autenticados suben archivos internos" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('soportes', 'documentos', 'marca'));

create policy "Autenticados actualizan archivos internos" on storage.objects
  for update to authenticated
  using (bucket_id in ('soportes', 'documentos', 'marca'))
  with check (bucket_id in ('soportes', 'documentos', 'marca'));

create policy "Autenticados eliminan archivos internos" on storage.objects
  for delete to authenticated
  using (bucket_id in ('soportes', 'documentos', 'marca'));
