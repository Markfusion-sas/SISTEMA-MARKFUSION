-- ============================================================================
-- MarkFusion OS · Colores de categorías validados para gráficas
-- Cambia los colores por defecto de las categorías a una paleta categórica
-- validada para daltonismo (orden fijo). Solo toca las categorías que aún
-- tienen el color original, así no se pisan colores personalizados.
-- ============================================================================

update public.categories set color = v.nuevo
from (values
  ('gasto',   'herramientas_software', '#7c6cf0', '#2a78d6'),
  ('gasto',   'hosting_infra',         '#3b82f6', '#eb6834'),
  ('gasto',   'pauta',                 '#ec4899', '#1baf7a'),
  ('gasto',   'freelancers',           '#f59e0b', '#eda100'),
  ('gasto',   'impuestos',             '#ef4444', '#e87ba4'),
  ('gasto',   'oficina',               '#14b8a6', '#008300'),
  ('gasto',   'otros',                 '#71717a', '#8a8a94'),
  ('ingreso', 'anticipo',              '#22c3a6', '#2a78d6'),
  ('ingreso', 'pago_final',            '#10b981', '#eb6834'),
  ('ingreso', 'fee_mensual',           '#7c6cf0', '#1baf7a'),
  ('ingreso', 'otros',                 '#71717a', '#8a8a94')
) as v(tipo, slug, anterior, nuevo)
where categories.tipo = v.tipo::public.movimiento_tipo
  and categories.slug = v.slug
  and lower(categories.color) = v.anterior;
