import type {
  ClienteEstado,
  CobroEstado,
  CotizacionEstado,
  DocumentoTipo,
  Moneda,
  MovimientoTipo,
  ProyectoEstado,
  ProyectoTipo,
  ReunionEstado,
  ReunionTipo,
  TareaEstado,
  TareaPrioridad,
} from "@/types/database";

/** Tonos semánticos que entiende el componente <Badge tone>. */
export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "pink";

export interface Option<T extends string> {
  value: T;
  label: string;
  tone: Tone;
}

function toOptions<T extends string>(map: Record<T, { label: string; tone: Tone }>): Option<T>[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, ...map[value] }));
}

export const MONEDAS: Record<Moneda, { label: string; tone: Tone }> = {
  COP: { label: "COP · Peso colombiano", tone: "neutral" },
  USD: { label: "USD · Dólar", tone: "neutral" },
};

export const CLIENTE_ESTADOS: Record<ClienteEstado, { label: string; tone: Tone }> = {
  prospecto: { label: "Prospecto", tone: "info" },
  activo: { label: "Activo", tone: "success" },
  pausado: { label: "Pausado", tone: "warning" },
  cerrado: { label: "Cerrado", tone: "neutral" },
};

export const PROYECTO_TIPOS: Record<ProyectoTipo, { label: string; tone: Tone }> = {
  web: { label: "Desarrollo web", tone: "info" },
  automatizacion: { label: "Automatización", tone: "brand" },
  bot_ia: { label: "Bot con IA", tone: "pink" },
  ads: { label: "Pauta / Ads", tone: "warning" },
  consultoria: { label: "Consultoría", tone: "success" },
  otro: { label: "Otro", tone: "neutral" },
};

export const PROYECTO_ESTADOS: Record<ProyectoEstado, { label: string; tone: Tone }> = {
  en_curso: { label: "En curso", tone: "brand" },
  en_revision: { label: "En revisión", tone: "warning" },
  entregado: { label: "Entregado", tone: "success" },
  mantenimiento: { label: "Mantenimiento", tone: "info" },
  cancelado: { label: "Cancelado", tone: "neutral" },
};

export const COTIZACION_ESTADOS: Record<CotizacionEstado, { label: string; tone: Tone }> = {
  borrador: { label: "Borrador", tone: "neutral" },
  enviada: { label: "Enviada", tone: "info" },
  aprobada: { label: "Aprobada", tone: "success" },
  rechazada: { label: "Rechazada", tone: "danger" },
};

export const TAREA_PRIORIDADES: Record<TareaPrioridad, { label: string; tone: Tone }> = {
  alta: { label: "Alta", tone: "danger" },
  media: { label: "Media", tone: "warning" },
  baja: { label: "Baja", tone: "neutral" },
};

export const TAREA_ESTADOS: Record<TareaEstado, { label: string; tone: Tone }> = {
  pendiente: { label: "Pendiente", tone: "neutral" },
  en_progreso: { label: "En progreso", tone: "brand" },
  en_revision: { label: "En revisión", tone: "warning" },
  hecha: { label: "Hecha", tone: "success" },
};

export const REUNION_TIPOS: Record<ReunionTipo, { label: string; tone: Tone }> = {
  venta: { label: "Venta", tone: "success" },
  kickoff: { label: "Kickoff", tone: "brand" },
  seguimiento: { label: "Seguimiento", tone: "info" },
  entrega: { label: "Entrega", tone: "pink" },
  interna: { label: "Interna", tone: "neutral" },
};

export const REUNION_ESTADOS: Record<ReunionEstado, { label: string; tone: Tone }> = {
  programada: { label: "Programada", tone: "info" },
  realizada: { label: "Realizada", tone: "success" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

export const MOVIMIENTO_TIPOS: Record<MovimientoTipo, { label: string; tone: Tone }> = {
  ingreso: { label: "Ingreso", tone: "success" },
  gasto: { label: "Gasto", tone: "danger" },
};

export const COBRO_ESTADOS: Record<CobroEstado | "vencido", { label: string; tone: Tone }> = {
  pendiente: { label: "Pendiente", tone: "warning" },
  pagado: { label: "Pagado", tone: "success" },
  vencido: { label: "Vencido", tone: "danger" },
};

export const DOCUMENTO_TIPOS: Record<DocumentoTipo, { label: string; tone: Tone }> = {
  contrato: { label: "Contrato", tone: "brand" },
  brief: { label: "Brief", tone: "info" },
  cotizacion: { label: "Cotización", tone: "success" },
  entregable: { label: "Entregable", tone: "pink" },
  factura: { label: "Factura", tone: "warning" },
  otro: { label: "Otro", tone: "neutral" },
};

export const METODOS_PAGO = [
  "Transferencia Bancolombia",
  "Transferencia Davivienda",
  "Transferencia",
  "Nequi",
  "Daviplata",
  "PSE",
  "Tarjeta de crédito",
  "Efectivo",
  "PayPal",
  "Otro",
] as const;

/** Sugerencias para el campo "origen" del cliente (se puede escribir otro). */
export const ORIGENES_CLIENTE = [
  "Referido",
  "Instagram",
  "LinkedIn",
  "Facebook",
  "TikTok",
  "Sitio web",
  "WhatsApp",
  "Google",
  "Evento",
  "Otro",
] as const;

export const CLIENTE_ESTADO_OPTIONS = toOptions(CLIENTE_ESTADOS);
export const PROYECTO_TIPO_OPTIONS = toOptions(PROYECTO_TIPOS);
export const PROYECTO_ESTADO_OPTIONS = toOptions(PROYECTO_ESTADOS);
export const COTIZACION_ESTADO_OPTIONS = toOptions(COTIZACION_ESTADOS);
export const TAREA_PRIORIDAD_OPTIONS = toOptions(TAREA_PRIORIDADES);
export const TAREA_ESTADO_OPTIONS = toOptions(TAREA_ESTADOS);
export const REUNION_TIPO_OPTIONS = toOptions(REUNION_TIPOS);
export const REUNION_ESTADO_OPTIONS = toOptions(REUNION_ESTADOS);
export const DOCUMENTO_TIPO_OPTIONS = toOptions(DOCUMENTO_TIPOS);

/** Paleta sugerida para el color de cada socio. */
export const USER_COLORS = [
  "#7c6cf0",
  "#22c3a6",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
] as const;
