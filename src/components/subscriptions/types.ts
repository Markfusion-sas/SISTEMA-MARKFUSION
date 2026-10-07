import type { Subscription, SubscriptionPayment } from "@/types/database";

export type SubscriptionRow = Subscription & {
  client: { id: string; nombre: string; empresa: string | null } | null;
  project: { id: string; nombre: string } | null;
};

export type PaymentRow = Pick<
  SubscriptionPayment,
  "id" | "subscription_id" | "periodo" | "monto" | "moneda" | "fecha_pago" | "metodo_pago"
>;

/** A quién se le cobra: el cliente registrado o el nombre escrito. */
export function subscriptionWho(s: Pick<SubscriptionRow, "client" | "cliente">) {
  return s.client ? s.client.empresa || s.client.nombre : (s.cliente ?? "—");
}
