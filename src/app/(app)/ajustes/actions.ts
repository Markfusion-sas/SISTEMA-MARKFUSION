"use server";

import type { ActionResult } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { emptyToNull } from "@/lib/validations/common";
import { categorySchema, slugify, type CategoryInput } from "@/lib/validations/finance";
import { memberColorSchema, profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { brandSchema, type BrandInput } from "@/lib/validations/quote";

// ---------------------------------------------------------------------------
// Datos de la marca (PDF de cotizaciones)
// ---------------------------------------------------------------------------

export async function updateBrandAction(input: BrandInput): Promise<ActionResult> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_settings")
    .upsert({ id: 1, ...emptyToNull(parsed.data) }, { onConflict: "id" });
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudieron guardar los datos de la marca") };

  revalidateApp();
  return { ok: true };
}

/** Guarda la ruta del logo recién subido al bucket "marca" y borra el anterior. `path = null` quita el logo. */
export async function setBrandLogoAction(path: string | null): Promise<ActionResult> {
  if (path !== null && !/^logo\/[\w.-]+$/.test(path)) return { ok: false, error: "Ruta de logo no válida" };

  const supabase = await createClient();
  const { data: current } = await supabase.from("brand_settings").select("logo_url").eq("id", 1).maybeSingle();

  const { error } = await supabase.from("brand_settings").upsert({ id: 1, logo_url: path }, { onConflict: "id" });
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo guardar el logo") };

  if (current?.logo_url && current.logo_url !== path) {
    await supabase.storage.from("marca").remove([current.logo_url as string]);
  }

  revalidateApp();
  return { ok: true };
}

export async function updateMyProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, error: "No se pudo guardar el perfil" };

  revalidateApp();
  return { ok: true };
}

export async function updateMemberColor(id: string, color: string): Promise<ActionResult> {
  const parsed = memberColorSchema.safeParse({ id, color });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Color no válido" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ color: parsed.data.color }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: "No se pudo actualizar el color" };

  revalidateApp();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Categorías de movimientos
// ---------------------------------------------------------------------------

export async function createCategoryAction(input: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const slug = slugify(parsed.data.nombre);
  if (!slug) return { ok: false, error: "El nombre debe tener letras o números" };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("categories")
    .select("orden")
    .eq("tipo", parsed.data.tipo)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, slug, orden: (last ? Number(last.orden) : 0) + 1 });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Ya existe una categoría con ese nombre" : dbErrorMessage(error, "No se pudo crear la categoría"),
    };
  }

  revalidateApp();
  return { ok: true };
}

/** Cambia nombre y color. El slug no cambia para no romper los movimientos existentes. */
export async function updateCategoryAction(id: string, input: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ nombre: parsed.data.nombre, color: parsed.data.color })
    .eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar la categoría") };

  revalidateApp();
  return { ok: true };
}

export async function toggleCategoryAction(id: string, activo: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar la categoría") };

  revalidateApp();
  return { ok: true };
}

/** Solo se elimina si ningún movimiento ni gasto recurrente la usa; si no, se sugiere desactivarla. */
export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: category } = await supabase.from("categories").select("tipo, slug").eq("id", id).maybeSingle();
  if (!category) return { ok: false, error: "La categoría ya no existe" };

  const [{ count: txCount }, { count: recCount }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("tipo", category.tipo)
      .eq("categoria", category.slug),
    category.tipo === "gasto"
      ? supabase.from("recurring_expenses").select("id", { count: "exact", head: true }).eq("categoria", category.slug)
      : Promise.resolve({ count: 0 }),
  ]);

  const uses = (txCount ?? 0) + (recCount ?? 0);
  if (uses > 0) {
    return {
      ok: false,
      error: `La usan ${uses} ${uses === 1 ? "registro" : "registros"}. Desactívala para ocultarla sin perder el historial.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar la categoría") };

  revalidateApp();
  return { ok: true };
}
