import type { Metadata } from "next";

import { getBrand } from "@/lib/brand";
import { sortClientsForSelect } from "@/lib/clients";
import { createClient } from "@/lib/supabase/server";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import type { QuoteClient } from "@/components/quotes/types";

export const metadata: Metadata = { title: "Nueva cotización" };

export default async function NuevaCotizacionPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const supabase = await createClient();
  const [clientsRes, { brand, logoSignedUrl }] = await Promise.all([
    supabase.from("clients").select("id, nombre, empresa, email, telefono, ciudad, pais, estado"),
    getBrand(supabase),
  ]);

  const clients = sortClientsForSelect((clientsRes.data ?? []) as QuoteClient[]);

  return (
    <QuoteEditor
      quote={null}
      project={null}
      clients={clients}
      brand={{ ...brand, logoUrl: logoSignedUrl }}
      defaultClientId={clients.some((c) => c.id === cliente) ? cliente : undefined}
    />
  );
}
