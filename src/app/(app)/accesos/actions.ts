"use server";

import type { ActionResult } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { decryptSecret, encryptSecret, isCryptoConfigured } from "@/lib/crypto";
import { credentialSchema, normalizeUrl, type CredentialInput } from "@/lib/validations/credential";

const NO_KEY =
  "Falta configurar la llave de cifrado (CREDENTIALS_ENCRYPTION_KEY) en Vercel. Sin ella no se pueden guardar ni ver contraseñas.";

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function createCredentialAction(input: CredentialInput): Promise<ActionResult> {
  if (!isCryptoConfigured()) return { ok: false, error: NO_KEY };
  const parsed = credentialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  if (!parsed.data.password) return { ok: false, error: "Escribe la contraseña" };

  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const { password, ...rest } = parsed.data;
  const { error } = await supabase.from("credentials").insert({
    ...rest,
    url: normalizeUrl(rest.url),
    notas: rest.notas?.trim() || null,
    password_enc: encryptSecret(password),
  });
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo guardar el acceso") };

  revalidateApp();
  return { ok: true };
}

export async function updateCredentialAction(id: string, input: CredentialInput): Promise<ActionResult> {
  const parsed = credentialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  if (parsed.data.password && !isCryptoConfigured()) return { ok: false, error: NO_KEY };

  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const { password, ...rest } = parsed.data;
  const { error } = await supabase
    .from("credentials")
    .update({
      ...rest,
      url: normalizeUrl(rest.url),
      notas: rest.notas?.trim() || null,
      updated_by: userId,
      // Contraseña vacía al editar = se conserva la guardada.
      ...(password ? { password_enc: encryptSecret(password) } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar el acceso") };

  revalidateApp();
  return { ok: true };
}

export async function deleteCredentialAction(id: string): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const { error } = await supabase.from("credentials").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar el acceso") };

  revalidateApp();
  return { ok: true };
}

/**
 * Descifra y devuelve la contraseña de un acceso. Solo funciona con sesión iniciada:
 * sin sesión, las reglas de la base (RLS) no dejan leer el registro.
 */
export async function revealCredentialAction(id: string): Promise<ActionResult<{ password: string }>> {
  if (!isCryptoConfigured()) return { ok: false, error: NO_KEY };

  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const { data } = await supabase.from("credentials").select("password_enc").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "El acceso ya no existe" };

  try {
    return { ok: true, data: { password: decryptSecret(data.password_enc as string) } };
  } catch {
    return {
      ok: false,
      error: "No se pudo descifrar la contraseña. Revisa que la llave de cifrado sea la misma con la que se guardó.",
    };
  }
}
