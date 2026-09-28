"use server";

import type { Moneda } from "@/types/database";
import { sortClientsForSelect } from "@/lib/clients";
import { addDaysISO, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export interface SearchIndex {
  clients: { id: string; nombre: string; empresa: string | null; ciudad: string | null; estado: string }[];
  projects: { id: string; nombre: string; estado: string; cliente: string | null }[];
  tasks: { id: string; titulo: string; estado: string; fecha_limite: string | null; proyecto: string | null }[];
  meetings: { id: string; titulo: string; fecha_inicio: string; estado: string }[];
}

type ClientRef = { nombre: string; empresa: string | null } | null;
const clientName = (c: ClientRef) => (c ? c.empresa || c.nombre : null);

/** Datos livianos para el buscador global (Ctrl/⌘ + K). */
export async function getSearchIndexAction(): Promise<SearchIndex> {
  const supabase = await createClient();
  const since = `${addDaysISO(todayISO(), -120)}T00:00:00-05:00`;

  const [clients, projects, tasks, meetings] = await Promise.all([
    supabase.from("clients").select("id, nombre, empresa, ciudad, estado").order("empresa").limit(500),
    supabase.from("projects").select("id, nombre, estado, client:clients(nombre, empresa)").order("nombre").limit(500),
    supabase
      .from("tasks")
      .select("id, titulo, estado, fecha_limite, project:projects(nombre)")
      .or(`estado.neq.hecha,completed_at.gte.${since}`)
      .order("updated_at", { ascending: false })
      .limit(400),
    supabase
      .from("meetings")
      .select("id, titulo, fecha_inicio, estado")
      .gte("fecha_inicio", since)
      .order("fecha_inicio", { ascending: false })
      .limit(300),
  ]);

  return {
    clients: (clients.data ?? []) as SearchIndex["clients"],
    projects: ((projects.data ?? []) as unknown as { id: string; nombre: string; estado: string; client: ClientRef }[]).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      estado: p.estado,
      cliente: clientName(p.client),
    })),
    tasks: (
      (tasks.data ?? []) as unknown as {
        id: string;
        titulo: string;
        estado: string;
        fecha_limite: string | null;
        project: { nombre: string } | null;
      }[]
    ).map((t) => ({ id: t.id, titulo: t.titulo, estado: t.estado, fecha_limite: t.fecha_limite, proyecto: t.project?.nombre ?? null })),
    meetings: (meetings.data ?? []) as SearchIndex["meetings"],
  };
}

export interface QuickCreateOptions {
  categories: { id: string; tipo: "ingreso" | "gasto"; slug: string; nombre: string; color: string; activo: boolean; orden: number }[];
  financeProjects: { id: string; nombre: string; moneda: Moneda; cliente: string | null }[];
  taskProjects: { id: string; nombre: string; cliente: string | null }[];
  meetingProjects: { id: string; nombre: string; client_id: string }[];
  clients: { id: string; nombre: string; empresa: string | null; estado: string }[];
  meetings: { id: string; titulo: string; fecha_inicio: string }[];
}

/** Opciones de los formularios de creación rápida (botón "+" y Ctrl/⌘ + K). */
export async function getQuickCreateOptionsAction(): Promise<QuickCreateOptions> {
  const supabase = await createClient();
  const since = `${addDaysISO(todayISO(), -45)}T00:00:00-05:00`;

  const [categories, projects, clients, meetings] = await Promise.all([
    supabase.from("categories").select("id, tipo, slug, nombre, color, activo, orden").order("orden"),
    supabase
      .from("projects")
      .select("id, nombre, moneda, client_id, client:clients(nombre, empresa)")
      .neq("estado", "cancelado")
      .order("nombre"),
    supabase.from("clients").select("id, nombre, empresa, estado"),
    supabase
      .from("meetings")
      .select("id, titulo, fecha_inicio")
      .gte("fecha_inicio", since)
      .neq("estado", "cancelada")
      .order("fecha_inicio", { ascending: false })
      .limit(60),
  ]);

  const rawProjects = (projects.data ?? []) as unknown as {
    id: string;
    nombre: string;
    moneda: Moneda;
    client_id: string;
    client: ClientRef;
  }[];

  return {
    categories: (categories.data ?? []) as QuickCreateOptions["categories"],
    financeProjects: rawProjects.map((p) => ({ id: p.id, nombre: p.nombre, moneda: p.moneda, cliente: clientName(p.client) })),
    taskProjects: rawProjects.map((p) => ({ id: p.id, nombre: p.nombre, cliente: clientName(p.client) })),
    meetingProjects: rawProjects.map((p) => ({ id: p.id, nombre: p.nombre, client_id: p.client_id })),
    clients: sortClientsForSelect((clients.data ?? []) as QuickCreateOptions["clients"]),
    meetings: (meetings.data ?? []) as QuickCreateOptions["meetings"],
  };
}
