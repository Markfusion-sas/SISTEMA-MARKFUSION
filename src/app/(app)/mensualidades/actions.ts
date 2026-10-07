"use server";

import type { ActionResult } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { capitalize, formatDate } from "@/lib/format";
import {
  subscriptionPaySchema,
  subscriptionSchema,
  type SubscriptionInput,
  type SubscriptionPayInput,
} from "@/lib/validations/subscription";

function toRow(data: SubscriptionInput) {
  return {
    client_id: data.client_id,
    // Si está ligada a un cliente registrado, no se guarda el texto libre.
    cliente: data.client_id ? null : data.cliente.trim() || null,
    project_id: data.project_id,
    servicio: data.servicio.trim(),
    monto: data.monto,
    moneda: data.moneda,
    dia_cobro: data.dia_cobro,
    fecha_inicio: data.fecha_inicio,
    activo: data.activo,
    notas: data.notas?.trim() || null,
  };
}

export async function createSubscriptionAction(input: SubscriptionInput): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").insert(toRow(parsed.data));
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo crear la mensualidad") };

  revalidateApp();
  return { ok: true };
}

export async function updateSubscriptionAction(id: string, input: SubscriptionInput): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").update(toRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar la mensualidad") };

  revalidateApp();
  return { ok: true };
}

export async function toggleSubscriptionAction(id: string, activo: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar la mensualidad") };

  revalidateApp();
  return { ok: true };
}

/** Elimina la mensualidad y su historial de pagos. Los ingresos ya registrados en Finanzas se conservan. */
export async function deleteSubscriptionAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar la mensualidad") };

  revalidateApp();
  return { ok: true };
}

/** Marca un mes como pagado: registra el ingreso en Finanzas y el pago del mes. */
export async function paySubscriptionMonthAction(id: string, input: SubscriptionPayInput): Promise<ActionResult> {
  const parsed = subscriptionPaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, servicio, moneda, project_id, cliente, client:clients(nombre, empresa)")
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, error: "La mensualidad ya no existe" };

  const periodo = `${parsed.data.mes}-01`;
  const { data: existing } = await supabase
    .from("subscription_payments")
    .select("id")
    .eq("subscription_id", id)
    .eq("periodo", periodo)
    .maybeSingle();
  if (existing) return { ok: false, error: "Ese mes ya está marcado como pagado" };

  const client = sub.client as unknown as { nombre: string; empresa: string | null } | null;
  const quien = client ? client.empresa || client.nombre : (sub.cliente as string | null);
  const mesLabel = capitalize(formatDate(`${periodo.slice(0, 7)}-15`, "monthYear"));

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      tipo: "ingreso",
      monto: parsed.data.monto,
      moneda: sub.moneda,
      categoria: parsed.data.categoria,
      project_id: sub.project_id,
      descripcion: ["Mensualidad", sub.servicio, quien, mesLabel].filter(Boolean).join(" · "),
      fecha: parsed.data.fecha_pago,
      metodo_pago: parsed.data.metodo_pago?.trim() || null,
    })
    .select("id")
    .single();
  if (txError || !tx) return { ok: false, error: dbErrorMessage(txError, "No se pudo registrar el ingreso") };

  const { error } = await supabase.from("subscription_payments").insert({
    subscription_id: id,
    periodo,
    monto: parsed.data.monto,
    moneda: sub.moneda,
    fecha_pago: parsed.data.fecha_pago,
    metodo_pago: parsed.data.metodo_pago?.trim() || null,
    transaction_id: tx.id,
  });
  if (error) {
    await supabase.from("transactions").delete().eq("id", tx.id);
    return { ok: false, error: dbErrorMessage(error, "No se pudo marcar el mes como pagado") };
  }

  revalidateApp();
  return { ok: true };
}

/** Deshace el pago de un mes: elimina el ingreso (y con él, el pago del mes). */
export async function undoSubscriptionPaymentAction(paymentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("subscription_payments")
    .select("id, transaction_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { ok: false, error: "Ese pago ya no existe" };

  const { error } = payment.transaction_id
    ? await supabase.from("transactions").delete().eq("id", payment.transaction_id)
    : await supabase.from("subscription_payments").delete().eq("id", paymentId);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo deshacer el pago") };

  // Por si el ingreso no tenía el vínculo en cascada, se asegura que el pago desaparezca.
  await supabase.from("subscription_payments").delete().eq("id", paymentId);

  revalidateApp();
  return { ok: true };
}
