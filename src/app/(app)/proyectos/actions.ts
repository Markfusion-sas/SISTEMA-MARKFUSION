"use server";

import type { ActionResult, ProyectoEstado } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { emptyToNull } from "@/lib/validations/common";
import { projectSchema, type ProjectInput } from "@/lib/validations/project";

const ESTADOS: ProyectoEstado[] = ["en_curso", "en_revision", "entregado", "mantenimiento", "cancelado"];

export async function createProjectAction(input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").insert(emptyToNull(parsed.data)).select("id").single();
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo crear el proyecto") };

  // Un cliente con proyecto nuevo deja de ser prospecto.
  await supabase.from("clients").update({ estado: "activo" }).eq("id", parsed.data.client_id).eq("estado", "prospecto");

  revalidateApp();
  return { ok: true, data: { id: data.id as string } };
}

export async function updateProjectAction(id: string, input: ProjectInput): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").update(emptyToNull(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar el proyecto") };

  revalidateApp();
  return { ok: true };
}

export async function updateProjectStatusAction(id: string, estado: ProyectoEstado): Promise<ActionResult> {
  if (!ESTADOS.includes(estado)) return { ok: false, error: "Estado no válido" };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ estado }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo cambiar el estado") };

  revalidateApp();
  return { ok: true };
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Tareas, cobros y documentos se borran en cascada; los archivos de Storage se eliminan aquí.
  const { data: docs } = await supabase.from("documents").select("file_url").eq("project_id", id);
  const paths = (docs ?? []).map((d) => d.file_url as string).filter(Boolean);
  if (paths.length) await supabase.storage.from("documentos").remove(paths);

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar el proyecto") };

  revalidateApp();
  return { ok: true };
}
