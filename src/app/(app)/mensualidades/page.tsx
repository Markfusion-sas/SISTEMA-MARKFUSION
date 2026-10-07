import type { Metadata } from "next";

import { sortClientsForSelect } from "@/lib/clients";
import { createClient } from "@/lib/supabase/server";
import type { CategoryOption } from "@/components/finance/types";
import type { SubscriptionClientOption } from "@/components/subscriptions/subscription-form-dialog";
import { SubscriptionsView } from "@/components/subscriptions/subscriptions-view";
import type { PaymentRow, SubscriptionRow } from "@/components/subscriptions/types";

export const metadata: Metadata = { title: "Mensualidades" };

export default async function MensualidadesPage() {
  const supabase = await createClient();
  const [subsRes, paymentsRes, clientsRes, projectsRes, categoriesRes] = await Promise.all([
    supabase.from("subscriptions").select("*, client:clients(id, nombre, empresa), project:projects(id, nombre)"),
    supabase
      .from("subscription_payments")
      .select("id, subscription_id, periodo, monto, moneda, fecha_pago, metodo_pago")
      .order("periodo", { ascending: false }),
    supabase.from("clients").select("id, nombre, empresa, estado"),
    supabase
      .from("projects")
      .select("id, nombre, client:clients(nombre, empresa)")
      .neq("estado", "cancelado")
      .order("nombre"),
    supabase.from("categories").select("id, tipo, slug, nombre, color, activo, orden").order("orden"),
  ]);

  if (subsRes.error) {
    // La tabla aún no existe: falta correr la migración de mensualidades.
    if (subsRes.error.code === "42P01" || subsRes.error.message.includes("subscriptions")) {
      throw new Error(
        "Falta crear las tablas de Mensualidades: corre supabase/migrations/20261006000000_mensualidades.sql en el SQL Editor de Supabase.",
      );
    }
    throw new Error(subsRes.error.message);
  }

  type ProjectRaw = { id: string; nombre: string; client: { nombre: string; empresa: string | null } | null };

  return (
    <SubscriptionsView
      subscriptions={(subsRes.data ?? []) as unknown as SubscriptionRow[]}
      payments={(paymentsRes.data ?? []) as PaymentRow[]}
      clients={sortClientsForSelect((clientsRes.data ?? []) as SubscriptionClientOption[])}
      projects={((projectsRes.data ?? []) as unknown as ProjectRaw[]).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        cliente: p.client ? p.client.empresa || p.client.nombre : null,
      }))}
      categories={(categoriesRes.data ?? []) as CategoryOption[]}
    />
  );
}
