import type { SupabaseClient } from "@supabase/supabase-js";

import { sortClientsForSelect } from "@/lib/clients";
import type { MeetingClientOption, MeetingProjectOption } from "@/components/meetings/meeting-form-dialog";

/** Clientes (todos, cerrados al final) y proyectos para los selectores del formulario de reuniones. */
export async function getMeetingOptions(supabase: SupabaseClient) {
  const [clientsRes, projectsRes] = await Promise.all([
    supabase.from("clients").select("id, nombre, empresa, estado"),
    supabase.from("projects").select("id, nombre, client_id").neq("estado", "cancelado").order("nombre"),
  ]);
  return {
    clients: sortClientsForSelect((clientsRes.data ?? []) as MeetingClientOption[]),
    projects: (projectsRes.data ?? []) as MeetingProjectOption[],
  };
}
