-- ============================================================================
-- MarkFusion OS · Cuentas por cobrar sin proyecto
-- Un cobro ya no tiene que estar ligado a un proyecto: se puede escribir a
-- quién se le cobra (cliente, empresa o referencia) en texto libre.
-- ============================================================================

alter table public.receivables alter column project_id drop not null;

alter table public.receivables add column if not exists cliente text;

alter table public.receivables
  add constraint receivables_destino_chk
  check (project_id is not null or nullif(trim(cliente), '') is not null);

comment on column public.receivables.cliente is
  'A quién se le cobra cuando el cobro no está ligado a un proyecto (texto libre).';
