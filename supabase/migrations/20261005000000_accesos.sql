-- ============================================================================
-- MarkFusion OS · Accesos (credenciales de plataformas)
-- La contraseña NUNCA se guarda en texto plano: la app la cifra en el servidor
-- con AES-256-GCM (llave CREDENTIALS_ENCRYPTION_KEY, fuera de la base) y aquí
-- solo queda el texto cifrado.
-- ============================================================================

create table public.credentials (
  id            uuid primary key default gen_random_uuid(),
  plataforma    text not null check (length(trim(plataforma)) > 0),
  url           text,
  usuario       text not null check (length(trim(usuario)) > 0),
  password_enc  text not null,
  client_id     uuid references public.clients (id) on delete set null,
  notas         text,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger credentials_updated_at before update on public.credentials
  for each row execute function public.set_updated_at();

create index credentials_client_idx on public.credentials (client_id);
create index credentials_plataforma_idx on public.credentials (lower(plataforma));

alter table public.credentials enable row level security;

create policy "Autenticados: acceso total" on public.credentials
  for all to authenticated using (true) with check (true);

comment on column public.credentials.password_enc is
  'Contraseña cifrada con AES-256-GCM (base64 iv.tag.datos). Solo la app puede descifrarla.';
