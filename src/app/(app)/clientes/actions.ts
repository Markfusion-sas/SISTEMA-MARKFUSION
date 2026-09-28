"use server";

import type { ActionResult } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import { emptyToNull } from "@/lib/validations/common";

export async function createClientAction(input: ClientInput): Promise<ActionResult<{ id: string }>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").insert(emptyToNull(parsed.data)).select("id").single();
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo crear el cliente") };

  revalidateApp();
  return { ok: true, data: { id: data.id as string } };
}

export async function updateClientAction(id: string, input: ClientInput): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(emptyToNull(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar el cliente") };

  revalidateApp();
  return { ok: true };
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).eq("client_id", id);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Este cliente tiene ${count} ${count === 1 ? "proyecto" : "proyectos"}. Elimínalos o cámbialos de cliente primero.`,
    };
  }

  // Los documentos se borran en cascada; primero se eliminan sus archivos de Storage.
  const { data: docs } = await supabase.from("documents").select("file_url").eq("client_id", id);
  const paths = (docs ?? []).map((d) => d.file_url as string).filter(Boolean);
  if (paths.length) await supabase.storage.from("documentos").remove(paths);

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar el cliente") };

  revalidateApp();
  return { ok: true };
}
