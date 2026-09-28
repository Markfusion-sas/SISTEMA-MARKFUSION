// Tipos de las tablas de Supabase (espejo de supabase/migrations).

export type Moneda = "COP" | "USD";
export type ClienteEstado = "prospecto" | "activo" | "pausado" | "cerrado";
export type ProyectoTipo = "web" | "automatizacion" | "bot_ia" | "ads" | "consultoria" | "otro";
export type ProyectoEstado = "en_curso" | "en_revision" | "entregado" | "mantenimiento" | "cancelado";
export type CotizacionEstado = "borrador" | "enviada" | "aprobada" | "rechazada";
export type TareaPrioridad = "alta" | "media" | "baja";
export type TareaEstado = "pendiente" | "en_progreso" | "en_revision" | "hecha";
export type ReunionTipo = "venta" | "kickoff" | "seguimiento" | "entrega" | "interna";
export type ReunionEstado = "programada" | "realizada" | "cancelada";
export type MovimientoTipo = "ingreso" | "gasto";
export type CobroEstado = "pendiente" | "pagado";
export type DocumentoTipo = "contrato" | "brief" | "cotizacion" | "entregable" | "factura" | "otro";

export interface Profile {
  id: string;
  nombre: string;
  avatar_url: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  pais: string | null;
  estado: ClienteEstado;
  origen: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  nombre: string;
  tipo: ProyectoTipo;
  valor_total: number;
  moneda: Moneda;
  fee_mensual: number;
  estado: ProyectoEstado;
  fecha_inicio: string | null;
  fecha_entrega: string | null;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
}

export interface Quote {
  id: string;
  numero: string;
  client_id: string;
  project_id: string | null;
  items: QuoteItem[];
  total: number;
  moneda: Moneda;
  fee_mensual: number;
  condiciones: string | null;
  vigencia_dias: number;
  estado: CotizacionEstado;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  meeting_id: string | null;
  titulo: string;
  descripcion: string | null;
  responsable_id: string | null;
  prioridad: TareaPrioridad;
  estado: TareaEstado;
  fecha_limite: string | null;
  completed_at: string | null;
  created_by: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  titulo: string;
  tipo: ReunionTipo;
  client_id: string | null;
  project_id: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  link: string | null;
  participantes: string | null;
  agenda: string | null;
  notas: string | null;
  decisiones: string | null;
  estado: ReunionEstado;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  tipo: MovimientoTipo;
  monto: number;
  moneda: Moneda;
  categoria: string;
  project_id: string | null;
  receivable_id: string | null;
  descripcion: string | null;
  fecha: string;
  metodo_pago: string | null;
  soporte_url: string | null;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receivable {
  id: string;
  /** Opcional: un cobro puede ir ligado a un proyecto o solo a un nombre (`cliente`). */
  project_id: string | null;
  /** A quién se le cobra cuando no hay proyecto (texto libre). */
  cliente: string | null;
  concepto: string;
  monto: number;
  moneda: Moneda;
  fecha_vencimiento: string;
  estado: CobroEstado;
  pagado_en: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringExpense {
  id: string;
  nombre: string;
  monto: number;
  moneda: Moneda;
  dia_cobro: number;
  categoria: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentFile {
  id: string;
  client_id: string | null;
  project_id: string | null;
  nombre: string;
  tipo: DocumentoTipo;
  file_url: string;
  subido_por: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  tipo: MovimientoTipo;
  slug: string;
  nombre: string;
  color: string;
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface BrandSettings {
  id: number;
  nombre_empresa: string;
  nit: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  sitio_web: string | null;
  ciudad: string | null;
  logo_url: string | null;
  condiciones_default: string | null;
  updated_at: string;
}

/** Resultado estándar de las server actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };
