import type { BrandSettings, Client, Moneda, Quote, QuoteItem } from "@/types/database";

export type QuoteClient = Pick<Client, "id" | "nombre" | "empresa" | "email" | "telefono" | "ciudad" | "pais">;

export type QuoteRow = Quote & {
  client: QuoteClient | null;
  project: { id: string; nombre: string } | null;
};

/** Todo lo que necesita el documento (vista previa y PDF). */
export interface QuoteDocData {
  numero: string | null;
  fecha: string;
  validaHasta: string;
  moneda: Moneda;
  items: QuoteItem[];
  fee_mensual: number;
  condiciones: string | null;
  client: QuoteClient | null;
}

export type BrandDoc = BrandSettings & { logoUrl: string | null };

/** Colores fijos del documento impreso (no dependen del tema claro/oscuro). */
export const DOC_COLORS = {
  brand: "#6d5ef0",
  brand2: "#2cb8d8",
  text: "#15151c",
  muted: "#6b6b78",
  border: "#e6e6ec",
  soft: "#f6f6f9",
};
