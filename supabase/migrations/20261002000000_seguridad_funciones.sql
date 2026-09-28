-- ============================================================================
-- MarkFusion OS · Endurecimiento de funciones (avisos del Security Advisor)
-- ============================================================================

-- search_path fijo: las funciones solo usan objetos calificados (public.*)
-- o del catálogo del sistema, que siempre está disponible.
alter function public.set_updated_at() set search_path = '';
alter function public.set_task_completed_at() set search_path = '';
alter function public.set_quote_defaults() set search_path = '';

-- handle_new_user solo debe ejecutarse desde el trigger de auth.users,
-- nunca como RPC desde la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
