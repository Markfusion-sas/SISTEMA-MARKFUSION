"use server";

import type { ActionResult } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { emptyToNull } from "@/lib/validations/common";
import {
  markPaidSchema,
  receivableSchema,
  recurringSchema,
  transactionSchema,
  type MarkPaidInput,
  type ReceivableInput,
  type RecurringInput,
  type TransactionInput,
} from "@/lib/validations/finance";
import { todayISO } from "@/lib/format";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function removeSoporte(supabase: Supabase, path: string | null | undefined) {
  if (path) await supabase.storage.from("soportes").remove([path]);
}

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

export async function createTransactionAction(input: TransactionInput): Promise<ActionResult<{ id: string }>> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").insert(emptyToNull(parsed.data)).select("id").single();
  if (error) {
    await removeSoporte(supabase, parsed.data.soporte_url);
    return { ok: false, error: dbErrorMessage(error, "No se pudo registrar el movimiento") };
  }

  revalidateApp();
  return { ok: true, data: { id: data.id as string } };
}

export async function updateTransactionAction(id: string, input: TransactionInput): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data: current } = await supabase.from("transactions").select("soporte_url").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "El movimiento ya no existe" };

  const { error } = await supabase.from("transactions").update(emptyToNull(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar el movimiento") };

  // Si se cambió o quitó el soporte, se borra el archivo anterior.
  if (current.soporte_url && current.soporte_url !== parsed.data.soporte_url) {
    await removeSoporte(supabase, current.soporte_url as string);
  }

  revalidateApp();
  return { ok: true };
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("transactions")
    .select("soporte_url, receivable_id")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { ok: false, error: "El movimiento ya no existe" };

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar el movimiento") };

  await removeSoporte(supabase, current.soporte_url as string | null);
  // Si era el pago de un cobro, el cobro vuelve a quedar pendiente.
  if (current.receivable_id) {
    await supabase.from("receivables").update({ estado: "pendiente", pagado_en: null }).eq("id", current.receivable_id);
  }

  revalidateApp();
  return { ok: true };
}

/** URL firmada (10 minutos) para ver el soporte de un movimiento. */
export async function getSoporteUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("soportes").createSignedUrl(path, 600);
  if (error || !data) return { ok: false, error: "No se pudo abrir el soporte" };
  return { ok: true, data: { url: data.signedUrl } };
}

// ---------------------------------------------------------------------------
// Cuentas por cobrar
// ---------------------------------------------------------------------------

export async function createReceivableAction(input: ReceivableInput): Promise<ActionResult> {
  const parsed = receivableSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("receivables").insert(emptyToNull(parsed.data));
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo crear el cobro") };

  revalidateApp();
  return { ok: true };
}

export async function updateReceivableAction(id: string, input: ReceivableInput): Promise<ActionResult> {
  const parsed = receivableSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("receivables").update(emptyToNull(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar el cobro") };

  revalidateApp();
  return { ok: true };
}

export async function deleteReceivableAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("receivables").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar el cobro") };

  revalidateApp();
  return { ok: true };
}

/** Marca el cobro como pagado y registra el ingreso correspondiente. */
export async function markReceivablePaidAction(id: string, input: MarkPaidInput): Promise<ActionResult> {
  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data: receivable } = await supabase
    .from("receivables")
    .select("id, project_id, cliente, concepto, monto, moneda, estado, project:projects(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!receivable) return { ok: false, error: "El cobro ya no existe" };
  if (receivable.estado === "pagado") return { ok: false, error: "Este cobro ya está pagado" };

  const project = receivable.project as unknown as { nombre: string } | null;

  const { error: txError } = await supabase.from("transactions").insert({
    tipo: "ingreso",
    monto: receivable.monto,
    moneda: receivable.moneda,
    categoria: parsed.data.categoria,
    project_id: receivable.project_id,
    receivable_id: receivable.id,
    descripcion: [receivable.concepto, project?.nombre ?? receivable.cliente].filter(Boolean).join(" · "),
    fecha: parsed.data.fecha,
    metodo_pago: parsed.data.metodo_pago || null,
    soporte_url: parsed.data.soporte_url,
  });
  if (txError) {
    await removeSoporte(supabase, parsed.data.soporte_url);
    return { ok: false, error: dbErrorMessage(txError, "No se pudo registrar el ingreso") };
  }

  const { error } = await supabase
    .from("receivables")
    .update({ estado: "pagado", pagado_en: parsed.data.fecha })
    .eq("id", id);
  if (error) {
    await supabase.from("transactions").delete().eq("receivable_id", id);
    return { ok: false, error: dbErrorMessage(error, "No se pudo marcar como pagado") };
  }

  revalidateApp();
  return { ok: true };
}

/** Deshace el pago: el cobro vuelve a pendiente y se elimina el ingreso que se había registrado. */
export async function undoReceivablePaymentAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: txs } = await supabase.from("transactions").select("id, soporte_url").eq("receivable_id", id);
  const { error } = await supabase.from("receivables").update({ estado: "pendiente", pagado_en: null }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo deshacer el pago") };

  if (txs?.length) {
    await supabase.from("transactions").delete().in("id", txs.map((t) => t.id));
    const paths = txs.map((t) => t.soporte_url as string | null).filter((p): p is string => Boolean(p));
    if (paths.length) await supabase.storage.from("soportes").remove(paths);
  }

  revalidateApp();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Gastos recurrentes
// ---------------------------------------------------------------------------

export async function createRecurringAction(input: RecurringInput): Promise<ActionResult> {
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").insert(parsed.data);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo crear el gasto recurrente") };

  revalidateApp();
  return { ok: true };
}

export async function updateRecurringAction(id: string, input: RecurringInput): Promise<ActionResult> {
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar el gasto recurrente") };

  revalidateApp();
  return { ok: true };
}

export async function toggleRecurringAction(id: string, activo: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo actualizar") };

  revalidateApp();
  return { ok: true };
}

export async function deleteRecurringAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar el gasto recurrente") };

  revalidateApp();
  return { ok: true };
}

/** Registra el gasto del mes de un recurrente (queda como movimiento normal). */
export async function registerRecurringPaymentAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: rec } = await supabase.from("recurring_expenses").select("*").eq("id", id).maybeSingle();
  if (!rec) return { ok: false, error: "El gasto recurrente ya no existe" };

  const { error } = await supabase.from("transactions").insert({
    tipo: "gasto",
    monto: rec.monto,
    moneda: rec.moneda,
    categoria: rec.categoria,
    descripcion: rec.nombre,
    fecha: todayISO(),
  });
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo registrar el gasto") };

  revalidateApp();
  return { ok: true };
}
