import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { ClientsView, type ClientRow } from "@/components/clients/clients-view";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*, projects(id, estado, receivables(monto, moneda, estado, fecha_vencimiento))")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return <ClientsView clients={(data ?? []) as ClientRow[]} />;
}
