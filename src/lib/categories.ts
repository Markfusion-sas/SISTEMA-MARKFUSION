import type { SupabaseClient } from "@supabase/supabase-js";

import type { Category, MovimientoTipo } from "@/types/database";

/** Carga las categorías y devuelve una función slug → nombre legible. */
export async function getCategoryLabeler(supabase: SupabaseClient) {
  const { data } = await supabase.from("categories").select("tipo, slug, nombre");
  const rows = (data ?? []) as Pick<Category, "tipo" | "slug" | "nombre">[];
  const map = new Map(rows.map((c) => [`${c.tipo}:${c.slug}`, c.nombre]));

  return (slug: string, tipo: MovimientoTipo) =>
    map.get(`${tipo}:${slug}`) ?? slug.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
