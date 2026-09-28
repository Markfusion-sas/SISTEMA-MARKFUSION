-- ============================================================================
-- MarkFusion OS · Fecha de vencimiento opcional en cuentas por cobrar
-- Un cobro puede no tener fecha acordada: en ese caso no se muestra
-- "Vence…", nunca pasa a "Vencido" y no aparece en el calendario.
-- ============================================================================

alter table public.receivables alter column fecha_vencimiento drop not null;
