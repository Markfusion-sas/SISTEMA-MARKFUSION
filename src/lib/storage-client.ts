"use client";

import { createClient } from "@/lib/supabase/client";

export const SOPORTE_MAX_BYTES = 10 * 1024 * 1024;
export const SOPORTE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

/**
 * Sube un soporte (foto o PDF) al bucket privado "soportes" y devuelve su ruta.
 * La ruta se guarda en la base y se abre luego con una URL firmada.
 */
export async function uploadSoporte(file: File, fecha: string) {
  if (file.size > SOPORTE_MAX_BYTES) throw new Error("El soporte supera los 10 MB");
  const [year, month] = fecha.split("-");
  const path = `${year}/${month}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("soportes")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error("No se pudo subir el soporte. Revisa el formato (foto o PDF) y tu conexión.");
  return path;
}

/** Elimina un soporte recién subido cuando falla el guardado del registro. */
export async function discardSoporte(path: string) {
  const supabase = createClient();
  await supabase.storage.from("soportes").remove([path]);
}
