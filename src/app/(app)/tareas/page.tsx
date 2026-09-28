import type { Metadata } from "next";

import { addDaysISO, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { TasksView, type TaskViewMode } from "@/components/tasks/tasks-view";
import type { MeetingOption, ProjectOption, TaskRow } from "@/components/tasks/types";

export const metadata: Metadata = { title: "Tareas" };

const VIEWS: TaskViewMode[] = ["kanban", "lista", "mi-dia"];

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  const initialView = VIEWS.includes(vista as TaskViewMode) ? (vista as TaskViewMode) : "kanban";

  const supabase = await createClient();
  const today = todayISO();
  // Las tareas hechas hace más de 45 días no se cargan para mantener el tablero liviano.
  const doneSince = `${addDaysISO(today, -45)}T00:00:00-05:00`;
  const meetingsSince = `${addDaysISO(today, -45)}T00:00:00-05:00`;

  const [tasksRes, projectsRes, meetingsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, project:projects(id, nombre, client:clients(nombre, empresa)), meeting:meetings(id, titulo)")
      .or(`estado.neq.hecha,completed_at.gte.${doneSince}`)
      .order("orden", { ascending: true }),
    supabase
      .from("projects")
      .select("id, nombre, estado, client:clients(nombre, empresa)")
      .not("estado", "in", "(cancelado)")
      .order("nombre"),
    supabase
      .from("meetings")
      .select("id, titulo, fecha_inicio")
      .gte("fecha_inicio", meetingsSince)
      .neq("estado", "cancelada")
      .order("fecha_inicio", { ascending: false })
      .limit(60),
  ]);

  if (tasksRes.error) throw new Error(tasksRes.error.message);

  type ProjectRaw = { id: string; nombre: string; client: { nombre: string; empresa: string | null } | null };
  const projects: ProjectOption[] = ((projectsRes.data ?? []) as unknown as ProjectRaw[]).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    cliente: p.client ? p.client.empresa || p.client.nombre : null,
  }));

  return (
    <TasksView
      initialTasks={(tasksRes.data ?? []) as unknown as TaskRow[]}
      projects={projects}
      meetings={(meetingsRes.data ?? []) as MeetingOption[]}
      initialView={initialView}
    />
  );
}
