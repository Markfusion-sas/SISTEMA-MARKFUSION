import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { Quote } from "@/types/database";
import { getBrand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import type { QuoteClient } from "@/components/quotes/types";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Cotización" };
  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("numero").eq("id", id).maybeSingle();
  return { title: data?.numero ?? "Cotización" };
}

export default async function CotizacionPage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [quoteRes, clientsRes, { brand, logoSignedUrl }] = await Promise.all([
    supabase
      .from("quotes")
      .select("*, project:projects!quotes_project_id_fkey(id, nombre)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("clients").select("id, nombre, empresa, email, telefono, ciudad, pais").order("empresa"),
    getBrand(supabase),
  ]);

  if (!quoteRes.data) notFound();
  const { project, ...quote } = quoteRes.data as Quote & { project: { id: string; nombre: string } | null };

  return (
    <QuoteEditor
      key={quote.updated_at}
      quote={quote as Quote}
      project={project}
      clients={(clientsRes.data ?? []) as QuoteClient[]}
      brand={{ ...brand, logoUrl: logoSignedUrl }}
    />
  );
}
