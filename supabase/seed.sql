-- ============================================================================
-- MarkFusion OS · Datos de ejemplo
-- Ejecuta este archivo DESPUÉS de crear los 2 usuarios (Juan Jose y Jerónimo)
-- para que las tareas y movimientos queden asignados a ellos.
-- Todas las fechas son relativas a hoy (zona America/Bogota).
-- ============================================================================

do $$
declare
  v_today date := (now() at time zone 'America/Bogota')::date;
  v_m0    date := date_trunc('month', (now() at time zone 'America/Bogota'))::date;
  v_m1    date := (date_trunc('month', (now() at time zone 'America/Bogota')) - interval '1 month')::date;
  v_m2    date := (date_trunc('month', (now() at time zone 'America/Bogota')) - interval '2 months')::date;
  v_m3    date := (date_trunc('month', (now() at time zone 'America/Bogota')) - interval '3 months')::date;
  v_m4    date := (date_trunc('month', (now() at time zone 'America/Bogota')) - interval '4 months')::date;
  v_m5    date := (date_trunc('month', (now() at time zone 'America/Bogota')) - interval '5 months')::date;

  v_u1 uuid;
  v_u2 uuid;

  c_dental uuid := gen_random_uuid();
  c_horiz  uuid := gen_random_uuid();
  c_cafe   uuid := gen_random_uuid();
  c_logi   uuid := gen_random_uuid();
  c_fit    uuid := gen_random_uuid();

  p_web    uuid := gen_random_uuid();
  p_bot    uuid := gen_random_uuid();
  p_tienda uuid := gen_random_uuid();
  p_crm    uuid := gen_random_uuid();
  p_ads    uuid := gen_random_uuid();

  m_kick   uuid := gen_random_uuid();
  m_rev    uuid := gen_random_uuid();
  m_weekly uuid := gen_random_uuid();
  m_demo   uuid := gen_random_uuid();
  m_entr   uuid := gen_random_uuid();
  m_fit    uuid := gen_random_uuid();

  r_web_ant    uuid := gen_random_uuid();
  r_bot_ant    uuid := gen_random_uuid();
  r_tienda_ant uuid := gen_random_uuid();
  r_tienda_fin uuid := gen_random_uuid();
  r_crm_ant    uuid := gen_random_uuid();
  r_crm_fin    uuid := gen_random_uuid();
  r_ads_ant    uuid := gen_random_uuid();
begin
  if exists (select 1 from public.clients) then
    raise notice 'La base ya tiene clientes; el seed no se vuelve a ejecutar.';
    return;
  end if;

  select id into v_u1 from public.profiles order by created_at asc limit 1;
  select id into v_u2 from public.profiles order by created_at asc offset 1 limit 1;
  v_u2 := coalesce(v_u2, v_u1);

  if v_u1 is null then
    raise notice 'No hay usuarios creados: las tareas quedarán sin responsable.';
  end if;

  -- --------------------------------------------------------------------------
  -- Clientes
  -- --------------------------------------------------------------------------
  insert into public.clients (id, nombre, empresa, telefono, email, ciudad, pais, estado, origen, notas, created_at) values
    (c_dental, 'Laura Restrepo', 'Clínica Dental Sonríe', '+57 310 482 1190', 'laura@clinicasonrie.co', 'Medellín', 'Colombia', 'activo', 'Instagram',
      'Odontóloga y dueña. Prefiere WhatsApp y reuniones temprano en la mañana.', now() - interval '45 days'),
    (c_horiz, 'Andrés Gómez', 'Inmobiliaria Horizonte', '+57 315 901 7734', 'agomez@horizonteinmobiliaria.com', 'Bogotá', 'Colombia', 'activo', 'Referido',
      'Gerente comercial. Cliente desde el proyecto de CRM, muy buen pagador.', now() - interval '170 days'),
    (c_cafe, 'Mariana Ortiz', 'Café Origen Huila', '+57 318 225 6041', 'mariana@cafeorigenhuila.com', 'Neiva', 'Colombia', 'pausado', 'Sitio web',
      'Tienda online entregada. Evaluando fase 2 con suscripciones mensuales.', now() - interval '135 days'),
    (c_logi, 'Camilo Vargas', 'LogiExpress SAS', '+57 301 774 3358', 'cvargas@logiexpress.com.co', 'Cali', 'Colombia', 'prospecto', 'LinkedIn',
      'Operación de 40 mensajeros. Quiere automatizar el seguimiento de envíos.', now() - interval '12 days'),
    (c_fit, 'Valentina Cárdenas', 'Academia Fit360', '+57 300 618 9920', 'vale@fit360.co', 'Barranquilla', 'Colombia', 'activo', 'Referido',
      'Tres sedes. Objetivo: 120 nuevas inscripciones por trimestre.', now() - interval '40 days');

  -- --------------------------------------------------------------------------
  -- Proyectos
  -- --------------------------------------------------------------------------
  insert into public.projects (id, client_id, nombre, tipo, valor_total, moneda, fee_mensual, estado, fecha_inicio, fecha_entrega, descripcion) values
    (p_web, c_dental, 'Sitio web + agenda de citas', 'web', 6500000, 'COP', 350000, 'en_curso', v_today - 40, v_today + 10,
      'Sitio de 6 secciones con agenda de citas, blog y SEO local para Medellín.'),
    (p_bot, c_horiz, 'Bot de WhatsApp para leads', 'bot_ia', 9800000, 'COP', 800000, 'en_revision', v_today - 95, v_today + 3,
      'Asistente de WhatsApp que califica leads, muestra inmuebles y agenda visitas.'),
    (p_tienda, c_cafe, 'Tienda online de cafés especiales', 'web', 6200000, 'COP', 0, 'entregado', v_today - 130, v_today - 65,
      'E-commerce con pasarela de pagos, 24 productos y envíos nacionales.'),
    (p_crm, c_horiz, 'Automatización CRM + facturación', 'automatizacion', 7200000, 'COP', 500000, 'mantenimiento', v_today - 160, v_today - 120,
      'Flujos entre formulario web, CRM y facturación electrónica. Mantenimiento mensual.'),
    (p_ads, c_fit, 'Campañas Meta Ads trimestrales', 'ads', 2500000, 'COP', 1800000, 'en_curso', v_today - 35, v_today + 55,
      'Estrategia, piezas y gestión de pauta para inscripciones en las 3 sedes.');

  -- --------------------------------------------------------------------------
  -- Reuniones
  -- --------------------------------------------------------------------------
  insert into public.meetings (id, titulo, tipo, client_id, project_id, fecha_inicio, fecha_fin, link, participantes, agenda, notas, decisiones, estado, created_by) values
    (m_kick, 'Kickoff sitio web Clínica Sonríe', 'kickoff', c_dental, p_web,
      ((v_today - 38) + time '09:00') at time zone 'America/Bogota',
      ((v_today - 38) + time '10:00') at time zone 'America/Bogota',
      'https://meet.google.com/abc-defg-hij', 'Laura Restrepo, Juan Jose, Jerónimo',
      E'1. Objetivos del sitio\n2. Secciones y contenidos\n3. Cronograma y entregables',
      'Laura quiere priorizar la agenda de citas y los testimonios. Tiene fotos profesionales de la clínica.',
      E'- Entrega en 7 semanas\n- Paleta azul clínica + blanco\n- Laura envía textos antes del viernes',
      'realizada', v_u1),
    (m_rev, 'Revisión de flujos del bot Horizonte', 'seguimiento', c_horiz, p_bot,
      ((v_today - 6) + time '15:00') at time zone 'America/Bogota',
      ((v_today - 6) + time '16:00') at time zone 'America/Bogota',
      'https://meet.google.com/klm-nopq-rst', 'Andrés Gómez, equipo comercial Horizonte, Juan Jose',
      E'1. Demo del bot\n2. Ajustes de respuestas\n3. Fecha de salida a producción',
      'El equipo comercial pidió que el bot no dé precios exactos de arriendo, solo rangos.',
      E'- Cambiar respuestas de precios a rangos\n- Agregar botón "Hablar con un asesor"\n- Salida a producción el día de la entrega',
      'realizada', v_u1),
    (m_weekly, 'Weekly interna MarkFusion', 'interna', null, null,
      (v_today + time '08:30') at time zone 'America/Bogota',
      (v_today + time '09:15') at time zone 'America/Bogota',
      'https://meet.google.com/wek-lyin-tna', 'Juan Jose, Jerónimo',
      E'1. Estado de proyectos\n2. Cobros pendientes\n3. Prioridades de la semana',
      null, null, 'programada', v_u2),
    (m_demo, 'Demo de propuesta a LogiExpress', 'venta', c_logi, null,
      ((v_today + 2) + time '11:00') at time zone 'America/Bogota',
      ((v_today + 2) + time '12:00') at time zone 'America/Bogota',
      'https://meet.google.com/lgx-demo-cal', 'Camilo Vargas, Juan Jose, Jerónimo',
      E'1. Diagnóstico de la operación\n2. Demo de seguimiento automático\n3. Propuesta económica',
      null, null, 'programada', v_u1),
    (m_entr, 'Entrega del bot de WhatsApp', 'entrega', c_horiz, p_bot,
      ((v_today + 3) + time '16:00') at time zone 'America/Bogota',
      ((v_today + 3) + time '17:00') at time zone 'America/Bogota',
      'https://meet.google.com/ent-rega-bot', 'Andrés Gómez, Juan Jose, Jerónimo',
      E'1. Salida a producción\n2. Capacitación al equipo comercial\n3. Acta de entrega',
      null, null, 'programada', v_u1),
    (m_fit, 'Seguimiento de campañas Fit360', 'seguimiento', c_fit, p_ads,
      ((v_today + 7) + time '10:00') at time zone 'America/Bogota',
      ((v_today + 7) + time '10:45') at time zone 'America/Bogota',
      'https://meet.google.com/fit-360a-ads', 'Valentina Cárdenas, Jerónimo',
      E'1. Resultados del mes\n2. Costo por inscripción\n3. Piezas nuevas',
      null, null, 'programada', v_u2);

  -- --------------------------------------------------------------------------
  -- Tareas (25)
  -- --------------------------------------------------------------------------
  insert into public.tasks (project_id, meeting_id, titulo, descripcion, responsable_id, prioridad, estado, fecha_limite, created_by, orden) values
    (p_web, m_kick, 'Definir mapa del sitio y secciones', 'Home, servicios, equipo, testimonios, blog y agenda.', v_u1, 'alta', 'hecha', v_today - 30, v_u1, 1000),
    (p_web, m_kick, 'Recopilar fotos y textos de la clínica', null, v_u2, 'media', 'hecha', v_today - 25, v_u1, 2000),
    (p_web, null, 'Diseño UI de home y servicios en Figma', null, v_u2, 'alta', 'hecha', v_today - 15, v_u2, 3000),
    (p_web, null, 'Maquetar home responsive', 'Next.js + Tailwind. Revisar en iPhone SE y Android gama media.', v_u1, 'alta', 'en_progreso', v_today + 2, v_u1, 1000),
    (p_web, null, 'Configurar agenda de citas', 'Horarios por odontólogo y bloqueo de festivos.', v_u1, 'media', 'pendiente', v_today + 6, v_u1, 1000),
    (p_web, null, 'Optimización SEO on-page', 'Títulos, meta descripciones y schema de clínica dental.', v_u2, 'baja', 'pendiente', v_today + 9, v_u2, 2000),

    (p_bot, null, 'Mapear flujos de conversación', null, v_u1, 'alta', 'hecha', v_today - 70, v_u1, 4000),
    (p_bot, null, 'Cargar inventario de inmuebles', 'Exportar listado desde el CRM y normalizar barrios.', v_u1, 'alta', 'hecha', v_today - 40, v_u1, 5000),
    (p_bot, m_rev, 'Ajustar respuestas de precios a rangos', 'Pedido del equipo comercial en la revisión.', v_u1, 'alta', 'en_revision', v_today - 1, v_u1, 1000),
    (p_bot, m_rev, 'Agregar derivación a asesor humano', 'Botón "Hablar con un asesor" con horario de atención.', v_u2, 'alta', 'en_progreso', v_today + 1, v_u1, 2000),
    (p_bot, m_rev, 'Pruebas con 20 conversaciones reales', null, v_u2, 'media', 'pendiente', v_today + 2, v_u1, 3000),
    (p_bot, null, 'Manual de uso para el equipo comercial', 'PDF corto con capturas y preguntas frecuentes.', v_u1, 'media', 'pendiente', v_today + 3, v_u1, 4000),

    (p_tienda, null, 'Capacitación en administración de la tienda', null, v_u2, 'media', 'hecha', v_today - 66, v_u2, 6000),
    (p_tienda, null, 'Enviar propuesta de fase 2 (suscripciones)', null, v_u1, 'media', 'pendiente', v_today - 3, v_u1, 5000),

    (p_crm, null, 'Revisar logs de sincronización del mes', null, v_u1, 'baja', 'pendiente', v_today + 5, v_u1, 6000),
    (p_crm, null, 'Ajustar plantilla de factura con nuevo NIT', null, v_u2, 'media', 'en_progreso', v_today + 4, v_u2, 3000),

    (p_ads, null, 'Configurar píxel y eventos de conversión', null, v_u2, 'alta', 'hecha', v_today - 28, v_u2, 7000),
    (p_ads, null, 'Crear 6 piezas para la campaña del mes', '3 reels + 3 carruseles, una línea por sede.', v_u2, 'alta', 'en_progreso', v_today + 3, v_u2, 4000),
    (p_ads, null, 'Informe de resultados del mes anterior', null, v_u1, 'media', 'pendiente', v_today + 1, v_u2, 7000),
    (p_ads, null, 'Test A/B de audiencias similares', null, v_u2, 'baja', 'pendiente', v_today + 12, v_u2, 8000),

    (null, null, 'Actualizar portafolio en la web de MarkFusion', 'Agregar Clínica Sonríe y Café Origen.', v_u1, 'media', 'pendiente', v_today + 10, v_u1, 9000),
    (null, null, 'Grabar caso de éxito de Horizonte', null, v_u2, 'baja', 'pendiente', v_today + 20, v_u2, 10000),
    (null, null, 'Conciliar gastos del mes anterior', 'Cruzar extracto bancario con soportes.', v_u1, 'alta', 'pendiente', v_today - 2, v_u2, 500),
    (null, null, 'Renovar dominio markfusion.com.co', null, v_u2, 'alta', 'pendiente', v_today, v_u2, 750),
    (null, m_weekly, 'Definir precios 2027 de planes de mantenimiento', null, v_u1, 'media', 'en_revision', v_today + 7, v_u2, 2000);

  -- --------------------------------------------------------------------------
  -- Cuentas por cobrar
  -- --------------------------------------------------------------------------
  insert into public.receivables (id, project_id, concepto, monto, moneda, fecha_vencimiento, estado, pagado_en) values
    (r_crm_ant,    p_crm,    'Anticipo 50%',            3600000, 'COP', v_m5 + 9,  'pagado', v_m5 + 8),
    (r_crm_fin,    p_crm,    'Pago final 50%',          3600000, 'COP', v_m4 + 14, 'pagado', v_m4 + 12),
    (r_tienda_ant, p_tienda, 'Anticipo 50%',            3100000, 'COP', v_m4 + 20, 'pagado', v_m4 + 19),
    (r_tienda_fin, p_tienda, 'Pago final 50%',          3100000, 'COP', v_m2 + 10, 'pagado', v_m2 + 11),
    (r_bot_ant,    p_bot,    'Anticipo 50%',            4900000, 'COP', v_m3 + 5,  'pagado', v_m3 + 4),
    (gen_random_uuid(), p_bot, 'Pago final 50%',        4900000, 'COP', v_today - 5, 'pendiente', null),
    (r_web_ant,    p_web,    'Anticipo 50%',            3250000, 'COP', v_m1 + 18, 'pagado', v_m1 + 17),
    (gen_random_uuid(), p_web, 'Pago final 50%',        3250000, 'COP', v_today + 12, 'pendiente', null),
    (r_ads_ant,    p_ads,    'Anticipo setup',          1250000, 'COP', v_m1 + 24, 'pagado', v_m1 + 24),
    (gen_random_uuid(), p_ads, 'Saldo setup',           1250000, 'COP', v_today + 20, 'pendiente', null),
    (gen_random_uuid(), p_ads, 'Fee de gestión del próximo mes', 1800000, 'COP', (v_m0 + interval '1 month')::date + 4, 'pendiente', null),
    (gen_random_uuid(), p_crm, 'Fee de mantenimiento del próximo mes', 500000, 'COP', (v_m0 + interval '1 month')::date + 4, 'pendiente', null);

  -- --------------------------------------------------------------------------
  -- Movimientos (30) en los últimos 6 meses
  -- --------------------------------------------------------------------------
  insert into public.transactions (tipo, monto, moneda, categoria, project_id, receivable_id, descripcion, fecha, metodo_pago, registrado_por) values
    -- hace 5 meses
    ('ingreso', 3600000, 'COP', 'anticipo',              p_crm,    r_crm_ant,    'Anticipo automatización CRM Horizonte', v_m5 + 8,  'Transferencia Bancolombia', v_u1),
    ('gasto',    185000, 'COP', 'herramientas_software', null,     null,         'Google Workspace (2 cuentas)',          v_m5 + 5,  'Tarjeta de crédito', v_u2),
    ('gasto',     95000, 'COP', 'hosting_infra',         null,     null,         'Hostinger VPS',                         v_m5 + 22, 'Tarjeta de crédito', v_u2),
    -- hace 4 meses
    ('ingreso', 3600000, 'COP', 'pago_final',            p_crm,    r_crm_fin,    'Pago final automatización CRM',         v_m4 + 12, 'Transferencia Bancolombia', v_u1),
    ('ingreso', 3100000, 'COP', 'anticipo',              p_tienda, r_tienda_ant, 'Anticipo tienda Café Origen',           v_m4 + 19, 'Nequi', v_u2),
    ('gasto',   1200000, 'COP', 'freelancers',           p_tienda, null,         'Fotografía de producto (24 referencias)', v_m4 + 21, 'Transferencia', v_u2),
    ('gasto',    210000, 'COP', 'herramientas_software', null,     null,         'Google Workspace + Figma',              v_m4 + 5,  'Tarjeta de crédito', v_u2),
    -- hace 3 meses
    ('ingreso', 4900000, 'COP', 'anticipo',              p_bot,    r_bot_ant,    'Anticipo bot de WhatsApp Horizonte',    v_m3 + 4,  'Transferencia Bancolombia', v_u1),
    ('ingreso',  500000, 'COP', 'fee_mensual',           p_crm,    null,         'Fee mantenimiento CRM',                 v_m3 + 5,  'Transferencia Bancolombia', v_u1),
    ('gasto',    400000, 'COP', 'pauta',                 null,     null,         'Pauta propia MarkFusion en Instagram',  v_m3 + 10, 'Tarjeta de crédito', v_u2),
    ('gasto',    620000, 'COP', 'impuestos',             null,     null,         'Retención en la fuente e ICA',          v_m3 + 18, 'PSE', v_u1),
    -- hace 2 meses
    ('ingreso', 3100000, 'COP', 'pago_final',            p_tienda, r_tienda_fin, 'Pago final tienda Café Origen',         v_m2 + 11, 'Nequi', v_u2),
    ('ingreso',  500000, 'COP', 'fee_mensual',           p_crm,    null,         'Fee mantenimiento CRM',                 v_m2 + 5,  'Transferencia Bancolombia', v_u1),
    ('gasto',    240000, 'COP', 'herramientas_software', null,     null,         'Google Workspace + Figma',              v_m2 + 5,  'Tarjeta de crédito', v_u2),
    ('gasto',     95000, 'COP', 'hosting_infra',         null,     null,         'Hostinger VPS',                         v_m2 + 22, 'Tarjeta de crédito', v_u2),
    ('gasto',    900000, 'COP', 'freelancers',           p_bot,    null,         'Desarrollador backend (integración CRM)', v_m2 + 15, 'Transferencia', v_u1),
    -- mes anterior
    ('ingreso', 3250000, 'COP', 'anticipo',              p_web,    r_web_ant,    'Anticipo sitio web Clínica Sonríe',     v_m1 + 17, 'Transferencia Davivienda', v_u1),
    ('ingreso',  500000, 'COP', 'fee_mensual',           p_crm,    null,         'Fee mantenimiento CRM',                 v_m1 + 5,  'Transferencia Bancolombia', v_u1),
    ('ingreso', 1250000, 'COP', 'anticipo',              p_ads,    r_ads_ant,    'Anticipo setup campañas Fit360',        v_m1 + 24, 'Nequi', v_u2),
    ('gasto',    350000, 'COP', 'pauta',                 null,     null,         'Pauta propia MarkFusion en LinkedIn',   v_m1 + 12, 'Tarjeta de crédito', v_u2),
    ('gasto',    240000, 'COP', 'herramientas_software', null,     null,         'Google Workspace + Figma',              v_m1 + 5,  'Tarjeta de crédito', v_u2),
    ('gasto',    450000, 'COP', 'oficina',               null,     null,         'Coworking (puestos flexibles)',         v_m1 + 1,  'Transferencia', v_u1),
    -- mes actual
    ('ingreso',  500000, 'COP', 'fee_mensual',           p_crm,    null,         'Fee mantenimiento CRM',                 least(v_m0 + 4, v_today), 'Transferencia Bancolombia', v_u1),
    ('ingreso', 1800000, 'COP', 'fee_mensual',           p_ads,    null,         'Fee de gestión Meta Ads',               least(v_m0 + 6, v_today), 'Nequi', v_u2),
    ('ingreso',  800000, 'COP', 'otros',                 null,     null,         'Consultoría puntual de automatización', least(v_m0 + 9, v_today), 'Transferencia', v_u1),
    ('gasto',    240000, 'COP', 'herramientas_software', null,     null,         'Google Workspace + Figma',              least(v_m0 + 4, v_today), 'Tarjeta de crédito', v_u2),
    ('gasto',     95000, 'COP', 'hosting_infra',         null,     null,         'Hostinger VPS',                         least(v_m0 + 7, v_today), 'Tarjeta de crédito', v_u2),
    ('gasto',   1100000, 'COP', 'freelancers',           p_web,    null,         'Copywriter para textos del sitio',      least(v_m0 + 10, v_today), 'Transferencia', v_u1),
    ('gasto',    540000, 'COP', 'impuestos',             null,     null,         'Retención en la fuente',                least(v_m0 + 14, v_today), 'PSE', v_u1),
    ('gasto',    120000, 'COP', 'otros',                 null,     null,         'Domicilios y papelería',                least(v_m0 + 2, v_today), 'Efectivo', v_u2);

  -- --------------------------------------------------------------------------
  -- Gastos recurrentes
  -- --------------------------------------------------------------------------
  insert into public.recurring_expenses (nombre, monto, moneda, dia_cobro, categoria, activo) values
    ('Coworking',                       450000, 'COP',  1, 'oficina',               true),
    ('Google Workspace (2 cuentas)',     95000, 'COP',  5, 'herramientas_software', true),
    ('Vercel Pro',                       85000, 'COP', 12, 'hosting_infra',         true),
    ('Figma Professional',               60000, 'COP', 18, 'herramientas_software', true),
    ('Hostinger VPS',                    45000, 'COP', 22, 'hosting_infra',         true),
    ('Contador externo',                350000, 'COP', 28, 'otros',                 true);

  -- --------------------------------------------------------------------------
  -- Cotizaciones (3) · el número MF-AAAA-MMDD se genera automáticamente
  -- --------------------------------------------------------------------------
  insert into public.quotes (client_id, project_id, items, moneda, fee_mensual, condiciones, vigencia_dias, estado, created_at) values
    (c_horiz, p_bot,
      '[{"descripcion":"Bot de WhatsApp con calificación de leads","cantidad":1,"valor_unitario":7500000},
        {"descripcion":"Conexión con CRM e inventario de inmuebles","cantidad":1,"valor_unitario":1500000},
        {"descripcion":"Capacitación al equipo comercial (sesiones)","cantidad":2,"valor_unitario":400000}]'::jsonb,
      'COP', 800000,
      'Anticipo del 50% para iniciar y 50% contra entrega. Fee mensual incluye soporte y ajustes menores. Precios no incluyen IVA.',
      15, 'aprobada', ((v_today - 100) + time '10:00') at time zone 'America/Bogota'),
    (c_logi, null,
      '[{"descripcion":"Automatización de seguimiento de envíos por WhatsApp","cantidad":1,"valor_unitario":5800000},
        {"descripcion":"Panel de indicadores de entregas","cantidad":1,"valor_unitario":2400000}]'::jsonb,
      'COP', 600000,
      'Anticipo del 50% para iniciar y 50% contra entrega. Tiempo estimado: 6 semanas. Precios no incluyen IVA.',
      20, 'enviada', ((v_today - 4) + time '16:30') at time zone 'America/Bogota'),
    (c_cafe, null,
      '[{"descripcion":"Módulo de suscripciones mensuales","cantidad":1,"valor_unitario":3900000},
        {"descripcion":"Configuración de email marketing","cantidad":1,"valor_unitario":1200000},
        {"descripcion":"Fotografía de producto nuevo (referencias)","cantidad":8,"valor_unitario":150000}]'::jsonb,
      'COP', 0,
      'Anticipo del 50% para iniciar y 50% contra entrega. Precios no incluyen IVA.',
      15, 'borrador', ((v_today - 1) + time '11:15') at time zone 'America/Bogota');

  raise notice 'Seed de MarkFusion OS cargado correctamente.';
end;
$$;
