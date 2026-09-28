export type CalendarEventType = "meeting" | "delivery" | "task" | "receivable" | "recurring";

/** Evento serializable que arma el servidor para el calendario. */
export interface CalendarItem {
  id: string;
  type: CalendarEventType;
  refId: string;
  title: string;
  /** Hora de pared de Bogotá sin zona ("YYYY-MM-DDTHH:mm:00") o fecha "YYYY-MM-DD" si es de día completo. */
  start: string;
  end?: string;
  allDay: boolean;
  /** Link de destino al hacer clic (reuniones, proyectos, finanzas). Las tareas abren su formulario. */
  href?: string;
  subtitle?: string;
  color?: string;
  editable?: boolean;
  muted?: boolean;
}

export const EVENT_TYPES: { type: CalendarEventType; label: string; cssVar: string }[] = [
  { type: "meeting", label: "Reuniones", cssVar: "var(--event-meeting)" },
  { type: "delivery", label: "Entregas", cssVar: "var(--event-delivery)" },
  { type: "task", label: "Tareas", cssVar: "var(--event-task)" },
  { type: "receivable", label: "Cobros", cssVar: "var(--event-receivable)" },
  { type: "recurring", label: "Gastos recurrentes", cssVar: "var(--event-recurring)" },
];
