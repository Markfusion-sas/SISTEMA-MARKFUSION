import { z } from "zod";

import { optionalText } from "@/lib/validations/common";

export const credentialSchema = z.object({
  plataforma: z.string().trim().min(1, "Escribe la plataforma").max(80, "Máximo 80 caracteres"),
  url: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
  usuario: z.string().trim().min(1, "Escribe el correo o usuario").max(160, "Máximo 160 caracteres"),
  /** Al crear es obligatoria; al editar, vacía = no cambiar la contraseña guardada. */
  password: z.string().max(500, "Máximo 500 caracteres"),
  client_id: z.string().uuid().nullable(),
  notas: optionalText(2000),
});

export type CredentialInput = z.infer<typeof credentialSchema>;

/** Agrega https:// si el enlace no trae protocolo ("canva.com" → "https://canva.com"). */
export function normalizeUrl(url: string | undefined | null) {
  const value = (url ?? "").trim();
  if (!value) return null;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}
