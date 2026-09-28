import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Iniciales para avatares: "Juan Jose" → "JJ", "Jerónimo" → "JE". */
export function initials(nombre: string | null | undefined) {
  const parts = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Devuelve el primer nombre para saludos. */
export function firstName(nombre: string | null | undefined) {
  return (nombre ?? "").trim().split(/\s+/)[0] ?? "";
}

/** Texto legible sobre un color de fondo hex. */
export function readableTextColor(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0b0b0f" : "#ffffff";
}
