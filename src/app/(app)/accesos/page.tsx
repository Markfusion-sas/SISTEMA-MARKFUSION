import type { Metadata } from "next";

import { sortClientsForSelect } from "@/lib/clients";
import { isCryptoConfigured } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { CredentialsView } from "@/components/credentials/credentials-view";
import type { CredentialRow } from "@/components/credentials/types";

export const metadata: Metadata = { title: "Accesos" };

export default async function AccesosPage() {
  const supabase = await createClient();
  const [credentialsRes, clientsRes] = await Promise.all([
    // La contraseña cifrada (password_enc) nunca se envía al navegador.
    supabase
      .from("credentials")
      .select("id, plataforma, url, usuario, client_id, notas, created_by, updated_by, created_at, updated_at, client:clients(id, nombre, empresa)")
      .order("plataforma"),
    supabase.from("clients").select("id, nombre, empresa, estado"),
  ]);

  if (credentialsRes.error) throw new Error(credentialsRes.error.message);

  return (
    <CredentialsView
      credentials={(credentialsRes.data ?? []) as unknown as CredentialRow[]}
      clients={sortClientsForSelect((clientsRes.data ?? []) as { id: string; nombre: string; empresa: string | null; estado: string }[])}
      cryptoReady={isCryptoConfigured()}
    />
  );
}
