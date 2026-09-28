import type { CotizacionEstado, QuoteItem } from "@/types/database";
import { addDaysISO, bogotaParts, todayISO } from "@/lib/format";

export function itemSubtotal(item: Pick<QuoteItem, "cantidad" | "valor_unitario">) {
  return (Number(item.cantidad) || 0) * (Number(item.valor_unitario) || 0);
}

export function quoteTotal(items: Pick<QuoteItem, "cantidad" | "valor_unitario">[]) {
  return items.reduce((sum, item) => sum + itemSubtotal(item), 0);
}

/** Fecha hasta la que es válida la cotización ("YYYY-MM-DD"). */
export function quoteValidUntil(createdAt: string, vigenciaDias: number) {
  return addDaysISO(bogotaParts(createdAt).date, vigenciaDias);
}

/** Una cotización enviada cuya vigencia pasó se muestra como "vencida" (no se guarda). */
export function quoteStatusView(quote: { estado: CotizacionEstado; created_at: string; vigencia_dias: number }) {
  if (quote.estado === "enviada" && quoteValidUntil(quote.created_at, quote.vigencia_dias) < todayISO()) {
    return "vencida" as const;
  }
  return quote.estado;
}
