import type { Metadata } from "next";

import type { Meeting, Moneda, Project, Receivable, RecurringExpense } from "@/types/database";
import { addDaysISO, bogotaFloating, formatMoney, todayISO } from "@/lib/format";
import { getMeetingOptions } from "@/lib/meeting-options";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import type { CalendarItem } from "@/components/calendar/types";
import type { MeetingOption, ProjectOption, TaskRow } from "@/components/tasks/types";

export const metadata: Metadata = { title: "Calendario" };

/** Fecha del cobro recurrente en un mes (si el día no existe, el último día del mes). */
function recurringDate(year: number, month: number, day: number) {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const d = Math.min(day, last);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default async function CalendarioPage() {
  const supabase = await createClient();
  const today = todayISO();
  const from = addDaysISO(today, -190);
  const to = addDaysISO(today, 400);

  const [meetingsRes, projectsRes, tasksRes, receivablesRes, recurringRes, options, teamRes, meetingOptionsRes] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, titulo, tipo, estado, fecha_inicio, fecha_fin, client:clients(nombre, empresa)")
      .gte("fecha_inicio", `${from}T00:00:00-05:00`)
      .lte("fecha_inicio", `${to}T23:59:59-05:00`),
    supabase
      .from("projects")
      .select("id, nombre, estado, fecha_entrega, client:clients(nombre, empresa)")
      .not("fecha_entrega", "is", null)
      .neq("estado", "cancelado"),
    supabase
      .from("tasks")
      .select("*, project:projects(id, nombre, client:clients(nombre, empresa)), meeting:meetings(id, titulo)")
      .not("fecha_limite", "is", null)
      .neq("estado", "hecha"),
    supabase
      .from("receivables")
      .select("id, concepto, cliente, monto, moneda, fecha_vencimiento, project:projects(id, nombre)")
      .eq("estado", "pendiente"),
    supabase.from("recurring_expenses").select("*").eq("activo", true),
    getMeetingOptions(supabase),
    supabase.from("profiles").select("id, color"),
    supabase
      .from("meetings")
      .select("id, titulo, fecha_inicio")
      .gte("fecha_inicio", `${addDaysISO(today, -45)}T00:00:00-05:00`)
      .neq("estado", "cancelada")
      .order("fecha_inicio", { ascending: false })
      .limit(60),
  ]);

  const colorOf = new Map((teamRes.data ?? []).map((p) => [p.id as string, p.color as string]));

  const items: CalendarItem[] = [];
  const clientName = (c: { nombre: string; empresa: string | null } | null) => (c ? c.empresa || c.nombre : undefined);

  type MeetingRaw = Pick<Meeting, "id" | "titulo" | "tipo" | "estado" | "fecha_inicio" | "fecha_fin"> & {
    client: { nombre: string; empresa: string | null } | null;
  };
  for (const m of (meetingsRes.data ?? []) as unknown as MeetingRaw[]) {
    if (m.estado === "cancelada") continue;
    items.push({
      id: `meeting-${m.id}`,
      type: "meeting",
      refId: m.id,
      title: m.titulo,
      start: bogotaFloating(m.fecha_inicio),
      end: m.fecha_fin ? bogotaFloating(m.fecha_fin) : undefined,
      allDay: false,
      href: `/reuniones/${m.id}`,
      subtitle: clientName(m.client),
      editable: m.estado === "programada",
      muted: m.estado === "realizada",
    });
  }

  type ProjectRaw = Pick<Project, "id" | "nombre" | "estado" | "fecha_entrega"> & {
    client: { nombre: string; empresa: string | null } | null;
  };
  for (const p of (projectsRes.data ?? []) as unknown as ProjectRaw[]) {
    if (!p.fecha_entrega) continue;
    items.push({
      id: `delivery-${p.id}`,
      type: "delivery",
      refId: p.id,
      title: `Entrega · ${p.nombre}`,
      start: p.fecha_entrega,
      allDay: true,
      href: `/proyectos/${p.id}`,
      subtitle: clientName(p.client),
      muted: p.estado === "entregado",
    });
  }

  const tasks = (tasksRes.data ?? []) as unknown as TaskRow[];
  for (const t of tasks) {
    if (!t.fecha_limite) continue;
    items.push({
      id: `task-${t.id}`,
      type: "task",
      refId: t.id,
      title: t.titulo,
      start: t.fecha_limite,
      allDay: true,
      subtitle: t.project?.nombre ?? "Interna",
      color: t.responsable_id ? colorOf.get(t.responsable_id) : undefined,
      editable: true,
    });
  }

  type ReceivableRaw = Pick<Receivable, "id" | "concepto" | "cliente" | "monto" | "moneda" | "fecha_vencimiento"> & {
    project: { id: string; nombre: string } | null;
  };
  for (const r of (receivablesRes.data ?? []) as unknown as ReceivableRaw[]) {
    items.push({
      id: `receivable-${r.id}`,
      type: "receivable",
      refId: r.id,
      title: `Cobro · ${formatMoney(r.monto, r.moneda as Moneda)}`,
      start: r.fecha_vencimiento,
      allDay: true,
      href: r.project ? `/proyectos/${r.project.id}` : "/finanzas?tab=por-cobrar",
      subtitle: [r.concepto, r.project?.nombre ?? r.cliente].filter(Boolean).join(" · "),
      muted: false,
    });
  }

  const [ty, tm] = today.split("-").map(Number);
  for (const e of (recurringRes.data ?? []) as RecurringExpense[]) {
    for (let offset = -6; offset <= 13; offset++) {
      const base = new Date(Date.UTC(ty, tm - 1 + offset, 1));
      const date = recurringDate(base.getUTCFullYear(), base.getUTCMonth(), e.dia_cobro);
      items.push({
        id: `recurring-${e.id}-${date}`,
        type: "recurring",
        refId: e.id,
        title: `${e.nombre} · ${formatMoney(e.monto, e.moneda)}`,
        start: date,
        allDay: true,
        href: "/finanzas?tab=recurrentes",
        subtitle: "Gasto recurrente",
        muted: date < today,
      });
    }
  }

  type ProjectOptionRaw = { id: string; nombre: string; client_id: string };
  const taskProjects: ProjectOption[] = (options.projects as ProjectOptionRaw[]).map((p) => {
    const client = options.clients.find((c) => c.id === p.client_id);
    return { id: p.id, nombre: p.nombre, cliente: client ? client.empresa || client.nombre : null };
  });

  return (
    <CalendarView
      items={items}
      tasks={tasks}
      clients={options.clients}
      projects={options.projects}
      taskProjects={taskProjects}
      taskMeetings={(meetingOptionsRes.data ?? []) as MeetingOption[]}
    />
  );
}
