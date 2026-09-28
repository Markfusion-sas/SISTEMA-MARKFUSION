-- ============================================================================
-- MarkFusion OS · Borrar todos los datos de operación
-- Úsalo para quitar los datos de ejemplo antes de empezar con datos reales.
--
-- BORRA: clientes, proyectos, cotizaciones, reuniones, tareas, cuentas por
--        cobrar, movimientos, gastos recurrentes y registros de documentos.
-- CONSERVA: usuarios, perfiles (nombre y color), categorías y datos de la marca.
--
-- Los archivos subidos a Storage (soportes y documentos) no se borran con este
-- script; si subiste archivos de prueba, bórralos en Storage → soportes/documentos.
-- ============================================================================

truncate table
  public.documents,
  public.transactions,
  public.receivables,
  public.tasks,
  public.meetings,
  public.quotes,
  public.projects,
  public.clients,
  public.recurring_expenses
restart identity cascade;
