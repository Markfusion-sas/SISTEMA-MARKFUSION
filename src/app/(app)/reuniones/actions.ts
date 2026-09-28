"use server";

import type { ActionResult, ReunionEstado } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { bogotaISO } from "@/lib/format";
import { emptyToNull } from "@/lib/validations/common";
import { meetingNotesSchema, meetingSchema, type MeetingInput, type MeetingNotesInput } from "@/lib/validations/meeting";

function toRow(data: MeetingInput) {
  const { fecha, hora_inicio, hora_fin, ...rest } = data;
  return {
    ...emptyToNull(rest),
    fecha_inicio: bogotaISO(fecha, hora_inicio),
    fecha_fin: hora_fin ? bogotaISO(fecha, hora_fin) : null,
  };
}

export async function createMeetingAction(input: MeetingInput): Promise<ActionResult<{ id: string }>> {
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("meetings").insert(toRow(parsed.data)).select("id").single();
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo crear la reunión") };

  revalidateApp();
  return { ok: true, data: { id: data.id as string } };
}

export async function updateMeetingAction(id: string, input: MeetingInput): Promise<ActionResult> {
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").update(toRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar la reunión") };

  revalidateApp();
  return { ok: true };
}

export async function deleteMeetingAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // Las tareas creadas en la reunión se conservan (meeting_id queda en null).
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar la reunión") };

  revalidateApp();
  return { ok: true };
}

export async function setMeetingStatusAction(id: string, estado: ReunionEstado): Promise<ActionResult> {
  if (!["programada", "realizada", "cancelada"].includes(estado)) return { ok: false, error: "Estado no válido" };

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").update({ estado }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo cambiar el estado") };

  revalidateApp();
  return { ok: true };
}

export async function saveMeetingNotesAction(id: string, input: MeetingNotesInput): Promise<ActionResult> {
  const parsed = meetingNotesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").update(emptyToNull(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudieron guardar las notas") };

  revalidateApp();
  return { ok: true };
}

/** Reprogramar desde el calendario (arrastrar o estirar). Recibe instantes ISO con offset. */
export async function rescheduleMeetingAction(id: string, startISO: string, endISO: string | null): Promise<ActionResult> {
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : null;
  if (Number.isNaN(start.getTime()) || (end && (Number.isNaN(end.getTime()) || end < start))) {
    return { ok: false, error: "Horario no válido" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ fecha_inicio: start.toISOString(), fecha_fin: end ? end.toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo reprogramar la reunión") };

  revalidateApp();
  return { ok: true };
}
