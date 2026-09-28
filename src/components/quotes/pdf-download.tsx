"use client";

import type { BrandDoc, QuoteDocData } from "@/components/quotes/types";

/** Convierte la imagen del logo a data URL para incrustarla en el PDF sin depender de la red al renderizar. */
async function toDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar el logo");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Genera el PDF en el navegador. @react-pdf/renderer se carga solo cuando se necesita. */
export async function buildQuotePdf(doc: QuoteDocData, brand: BrandDoc) {
  const [{ pdf }, { QuotePdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/quotes/quote-pdf"),
  ]);
  const logoUrl = brand.logoUrl ? await toDataUrl(brand.logoUrl).catch(() => null) : null;
  return pdf(<QuotePdfDocument doc={doc} brand={{ ...brand, logoUrl }} />).toBlob();
}

export function quoteFileName(doc: QuoteDocData) {
  const client = (doc.client?.empresa || doc.client?.nombre || "cliente")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${doc.numero ?? "cotizacion"}-${client}.pdf`;
}

export async function downloadQuotePdf(doc: QuoteDocData, brand: BrandDoc) {
  const blob = await buildQuotePdf(doc, brand);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = quoteFileName(doc);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
