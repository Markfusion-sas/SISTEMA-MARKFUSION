import type { Task, TareaEstado } from "@/types/database";

export type TaskRow = Task & {
  project: { id: string; nombre: string; client: { nombre: string; empresa: string | null } | null } | null;
  meeting: { id: string; titulo: string } | null;
};

export interface ProjectOption {
  id: string;
  nombre: string;
  cliente: string | null;
}

export interface MeetingOption {
  id: string;
  titulo: string;
  fecha_inicio: string;
}

export const COLUMNS: { estado: TareaEstado; label: string; dot: string }[] = [
  { estado: "pendiente", label: "Pendiente", dot: "bg-muted-foreground/60" },
  { estado: "en_progreso", label: "En progreso", dot: "bg-brand" },
  { estado: "en_revision", label: "En revisión", dot: "bg-warning" },
  { estado: "hecha", label: "Hecha", dot: "bg-success" },
];

export const PRIORITY_DOT: Record<Task["prioridad"], string> = {
  alta: "bg-destructive",
  media: "bg-warning",
  baja: "bg-muted-foreground/50",
};

/** Orden intermedio entre dos vecinos (orden fraccional del kanban). */
export function orderBetween(prev: number | undefined, next: number | undefined) {
  if (prev === undefined && next === undefined) return 1000;
  if (prev === undefined) return (next as number) - 1000;
  if (next === undefined) return prev + 1000;
  return (prev + next) / 2;
}
