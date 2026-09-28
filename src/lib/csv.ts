"use client";

type Cell = string | number | null | undefined;

/** Números con coma decimal para que Excel en español los reconozca. */
function formatCell(value: Cell) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Descarga un CSV separado por ";" (formato que Excel en español abre directo)
 * con BOM UTF-8 para que las tildes se vean bien.
 */
export function downloadCSV(filename: string, rows: Cell[][]) {
  const content = rows.map((row) => row.map(formatCell).join(";")).join("\r\n");
  const blob = new Blob(["﻿", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
