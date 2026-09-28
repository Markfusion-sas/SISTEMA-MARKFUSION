import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { ProjectRow } from "@/components/projects/project-card";
import type { ClientOption } from "@/components/projects/project-form-dialog";
import { ProjectsView } from "@/components/projects/projects-view";

export const metadata: Metadata = { title: "Proyectos" };

export default async function ProyectosPage() {
  const supabase = await createClient();

  const [projectsRes, clientsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*, client:clients(id, nombre, empresa), tasks(estado)")
      .order("fecha_entrega", { ascending: true, nullsFirst: false }),
    supabase.from("clients").select("id, nombre, empresa").neq("estado", "cerrado").order("empresa"),
  ]);

  if (projectsRes.error) throw new Error(projectsRes.error.message);

  return (
    <ProjectsView
      projects={(projectsRes.data ?? []) as ProjectRow[]}
      clients={(clientsRes.data ?? []) as ClientOption[]}
    />
  );
}
