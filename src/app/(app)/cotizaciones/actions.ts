"use server";

import type { ActionResult, CotizacionEstado } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, revalidateApp } from "@/lib/actions/revalidate";
import { emptyToNull } from "@/lib/validations/common";
import { convertSchema, quoteSchema, type ConvertInput, type QuoteInput } from "@/lib/validations/quote";

function toRow(data: QuoteInput) {
  return {
    ...data,
    condiciones: data.condiciones?.trim() ? data.condiciones.trim() : null,
    items: data.items.map((i) => ({
      descripcion: i.descripcion.trim(),
      cantidad: i.cantidad,
      valor_unitario: i.valor_unitario,
    })),
  };
}

export async function createQuoteAction(input: QuoteInput): Promise<ActionResult<{ id: string; numero: string }>> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  // El número MF-AAAA-MMDD y el total los calcula la base de datos.
  const { data, error } = await supabase.from("quotes").insert(toRow(parsed.data)).select("id, numero").single();
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo crear la cotización") };

  revalidateApp();
  return { ok: true, data: { id: data.id as string, numero: data.numero as string } };
}

export async function updateQuoteAction(id: string, input: QuoteInput): Promise<ActionResult> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update(toRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo guardar la cotización") };

  revalidateApp();
  return { ok: true };
}

export async function setQuoteStatusAction(id: string, estado: CotizacionEstado): Promise<ActionResult> {
  if (!["borrador", "enviada", "aprobada", "rechazada"].includes(estado)) return { ok: false, error: "Estado no válido" };

  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update({ estado }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo cambiar el estado") };

  revalidateApp();
  return { ok: true };
}

export async function duplicateQuoteAction(id: string): Promise<ActionResult<{ id: string; numero: string }>> {
  const supabase = await createClient();
  const { data: original } = await supabase
    .from("quotes")
    .select("client_id, items, moneda, fee_mensual, condiciones, vigencia_dias")
    .eq("id", id)
    .maybeSingle();
  if (!original) return { ok: false, error: "La cotización ya no existe" };

  const { data, error } = await supabase
    .from("quotes")
    .insert({ ...original, estado: "borrador" })
    .select("id, numero")
    .single();
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo duplicar la cotización") };

  revalidateApp();
  return { ok: true, data: { id: data.id as string, numero: data.numero as string } };
}

export async function deleteQuoteAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error, "No se pudo eliminar la cotización") };

  revalidateApp();
  return { ok: true };
}

/**
 * Convierte una cotización aprobada en proyecto: crea el proyecto, sus cuentas
 * por cobrar y liga la cotización. Si algo falla, deshace lo creado.
 */
export async function convertQuoteToProjectAction(
  quoteId: string,
  input: ConvertInput,
): Promise<ActionResult<{ projectId: string }>> {
  const parsed = convertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };

  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, client_id, moneda, estado, project_id")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) return { ok: false, error: "La cotización ya no existe" };
  if (quote.estado !== "aprobada") return { ok: false, error: "Solo se convierten cotizaciones aprobadas" };
  if (quote.project_id) return { ok: false, error: "Esta cotización ya se convirtió en proyecto" };

  const { cobros, ...projectData } = parsed.data;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      ...emptyToNull(projectData),
      client_id: quote.client_id,
      moneda: quote.moneda,
      estado: "en_curso",
    })
    .select("id")
    .single();
  if (projectError || !project) return { ok: false, error: dbErrorMessage(projectError, "No se pudo crear el proyecto") };

  if (cobros.length) {
    const { error: receivablesError } = await supabase.from("receivables").insert(
      cobros.map((c) => ({
        project_id: project.id,
        concepto: c.concepto,
        monto: c.monto,
        moneda: quote.moneda,
        fecha_vencimiento: c.fecha_vencimiento,
      })),
    );
    if (receivablesError) {
      await supabase.from("projects").delete().eq("id", project.id);
      return { ok: false, error: dbErrorMessage(receivablesError, "No se pudieron crear las cuentas por cobrar") };
    }
  }

  await supabase.from("quotes").update({ project_id: project.id }).eq("id", quoteId);
  await supabase.from("clients").update({ estado: "activo" }).eq("id", quote.client_id).in("estado", ["prospecto", "pausado"]);

  revalidateApp();
  return { ok: true, data: { projectId: project.id as string } };
}
