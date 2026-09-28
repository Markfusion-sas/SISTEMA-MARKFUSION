import type { Project } from "@/types/database";
import { diffDaysISO, formatDate, formatRelativeDay, todayISO } from "@/lib/format";

/** Avance del proyecto: tareas hechas sobre el total. */
export function projectProgress(tasks: { estado: string }[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.estado === "hecha").length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Texto y tono de la fecha de entrega. */
export function deliveryInfo(project: Pick<Project, "fecha_entrega" | "estado">) {
  if (!project.fecha_entrega) return { label: "Sin fecha de entrega", tone: "muted" as const };
  if (["entregado", "cancelado"].includes(project.estado)) {
    return { label: `Entrega ${formatDate(project.fecha_entrega, "medium")}`, tone: "muted" as const };
  }
  const diff = diffDaysISO(todayISO(), project.fecha_entrega);
  if (diff < 0) {
    const days = Math.abs(diff);
    return { label: `Entrega vencida hace ${days} ${days === 1 ? "día" : "días"}`, tone: "danger" as const };
  }
  if (diff <= 7) return { label: `Entrega ${formatRelativeDay(project.fecha_entrega).toLowerCase()}`, tone: "warning" as const };
  return { label: `Entrega ${formatDate(project.fecha_entrega, "medium")}`, tone: "muted" as const };
}
