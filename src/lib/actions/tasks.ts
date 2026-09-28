"use server";

import type { ActionResult, TareaEstado } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { emptyToNull } from "@/lib/validations/common";
import { TASK_ESTADOS, moveTaskSchema, taskSchema, type TaskInput } from "@/lib/validations/task";

/** Orden para dejar una tarea al principio de su columna. */
async function topOrder(supabase: Awaited<ReturnType<typeof createClient>>, estado: TareaEstado) {
  const { data } = await supabase
    .from("tasks")
    .select("orden")
    .eq("estado", estado)
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.orden) - 1000 : 1000;
}

export async function createTaskAction(input: TaskInput): Promise<ActionResult<{ id: string }>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const orden = await topOrder(supabase, parsed.data.estado);
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...emptyToNull(parsed.data), orden })
    .select("id")
    .single();
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo crear la tarea") };

  revalidateApp();
  return { ok: true, data: { id: data.id as string } };
}

export async function updateTaskAction(id: string, input: TaskInput): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data: current } = await supabase.from("tasks").select("estado").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "La tarea ya no existe" };

  const values: Record<string, unknown> = emptyToNull(parsed.data);
  // Si cambia de columna, entra de primera en la nueva.
  if (current.estado !== parsed.data.estado) values.orden = await topOrder(supabase, parsed.data.estado);

  const { error } = await supabase.from("tasks").update(values).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar la tarea") };

  revalidateApp();
  return { ok: true };
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar la tarea") };

  revalidateApp();
  return { ok: true };
}

/** Mueve una tarea en el kanban (columna + posición). */
export async function moveTaskAction(id: string, estado: TareaEstado, orden: number): Promise<ActionResult> {
  const parsed = moveTaskSchema.safeParse({ id, estado, orden });
  if (!parsed.success) return { ok: false, error: "Movimiento no válido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ estado: parsed.data.estado, orden: parsed.data.orden })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo mover la tarea") };

  revalidateApp();
  return { ok: true };
}

/** Cambia solo el estado (lista, Mi día). */
export async function setTaskStatusAction(id: string, estado: TareaEstado): Promise<ActionResult> {
  if (!TASK_ESTADOS.includes(estado)) return { ok: false, error: "Estado no válido" };

  const supabase = await createClient();
  const orden = await topOrder(supabase, estado);
  const { error } = await supabase.from("tasks").update({ estado, orden }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar la tarea") };

  revalidateApp();
  return { ok: true };
}

/** Cambia la fecha límite (arrastrar en el calendario). */
export async function setTaskDueDateAction(id: string, fecha: string): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "Fecha no válida" };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ fecha_limite: fecha }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo cambiar la fecha") };

  revalidateApp();
  return { ok: true };
}

/** Marca una tarea como hecha o la devuelve a pendiente. */
export async function toggleTaskDoneAction(id: string, done: boolean): Promise<ActionResult> {
  return setTaskStatusAction(id, done ? "hecha" : "pendiente");
}
