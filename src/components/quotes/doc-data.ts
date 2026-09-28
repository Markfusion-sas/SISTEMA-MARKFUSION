import type { Quote } from "@/types/database";
import { bogotaParts } from "@/lib/format";
import { quoteValidUntil } from "@/lib/quotes";
import type { QuoteClient, QuoteDocData } from "@/components/quotes/types";

/** Arma los datos del documento a partir de una cotización guardada. */
export function docFromQuote(quote: Quote, client: QuoteClient | null): QuoteDocData {
  return {
    numero: quote.numero,
    fecha: bogotaParts(quote.created_at).date,
    validaHasta: quoteValidUntil(quote.created_at, quote.vigencia_dias),
    moneda: quote.moneda,
    items: quote.items,
    fee_mensual: Number(quote.fee_mensual),
    condiciones: quote.condiciones,
    client,
  };
}
