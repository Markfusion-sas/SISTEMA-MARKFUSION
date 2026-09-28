"use server";

import type { ActionResult } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { documentSchema, type DocumentInput } from "@/lib/validations/document";

/** Registra un documento cuyo archivo ya se subió al bucket "documentos". */
export async function createDocumentAction(input: DocumentInput): Promise<ActionResult> {
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert(parsed.data);
  if (error) {
    await supabase.storage.from("documentos").remove([parsed.data.file_url]);
    return { ok: false, error: dbErrorMessage(error, "No se pudo guardar el documento") };
  }

  revalidateApp();
  return { ok: true };
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: doc, error: findError } = await supabase.from("documents").select("file_url").eq("id", id).single();
  if (findError || !doc) return { ok: false, error: "El documento ya no existe" };

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar el documento") };

  await supabase.storage.from("documentos").remove([doc.file_url as string]);

  revalidateApp();
  return { ok: true };
}

/** URL firmada de descarga (válida 10 minutos). */
export async function getDocumentUrlAction(id: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();

  const { data: doc } = await supabase.from("documents").select("file_url, nombre").eq("id", id).single();
  if (!doc) return { ok: false, error: "El documento ya no existe" };

  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.file_url as string, 600);
  if (error || !data) return { ok: false, error: "No se pudo generar el enlace de descarga" };

  return { ok: true, data: { url: data.signedUrl } };
}
