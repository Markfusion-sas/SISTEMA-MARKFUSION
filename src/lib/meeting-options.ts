import type { SupabaseClient } from "@supabase/supabase-js";

import type { MeetingClientOption, MeetingProjectOption } from "@/components/meetings/meeting-form-dialog";

/** Clientes y proyectos para los selectores del formulario de reuniones. */
export async function getMeetingOptions(supabase: SupabaseClient) {
  const [clientsRes, projectsRes] = await Promise.all([
    supabase.from("clients").select("id, nombre, empresa").neq("estado", "cerrado").order("empresa"),
    supabase.from("projects").select("id, nombre, client_id").neq("estado", "cancelado").order("nombre"),
  ]);
  return {
    clients: (clientsRes.data ?? []) as MeetingClientOption[],
    projects: (projectsRes.data ?? []) as MeetingProjectOption[],
  };
}
