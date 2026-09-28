import type { Metadata } from "next";

import { getBrand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import { QuotesView } from "@/components/quotes/quotes-view";
import type { QuoteRow } from "@/components/quotes/types";

export const metadata: Metadata = { title: "Cotizaciones" };

export default async function CotizacionesPage() {
  const supabase = await createClient();
  const [quotesRes, { brand, logoSignedUrl }] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "*, client:clients(id, nombre, empresa, email, telefono, ciudad, pais), project:projects!quotes_project_id_fkey(id, nombre)",
      )
      .order("created_at", { ascending: false }),
    getBrand(supabase),
  ]);

  if (quotesRes.error) throw new Error(quotesRes.error.message);

  return <QuotesView quotes={(quotesRes.data ?? []) as unknown as QuoteRow[]} brand={{ ...brand, logoUrl: logoSignedUrl }} />;
}
