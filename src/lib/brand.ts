import type { SupabaseClient } from "@supabase/supabase-js";

import type { BrandSettings } from "@/types/database";

export const DEFAULT_BRAND: BrandSettings = {
  id: 1,
  nombre_empresa: "MarkFusion",
  nit: null,
  telefono: null,
  email: null,
  direccion: null,
  sitio_web: "markfusion.com.co",
  ciudad: "Colombia",
  logo_url: null,
  condiciones_default: "Anticipo del 50% para iniciar y 50% contra entrega. Precios no incluyen IVA.",
  updated_at: new Date(0).toISOString(),
};

/** Datos de la marca + URL firmada del logo (1 hora) para la vista previa y el PDF. */
export async function getBrand(supabase: SupabaseClient) {
  const { data } = await supabase.from("brand_settings").select("*").eq("id", 1).maybeSingle();
  const brand = (data as BrandSettings | null) ?? DEFAULT_BRAND;

  let logoSignedUrl: string | null = null;
  if (brand.logo_url) {
    const { data: signed } = await supabase.storage.from("marca").createSignedUrl(brand.logo_url, 3600);
    logoSignedUrl = signed?.signedUrl ?? null;
  }

  return { brand, logoSignedUrl };
}
