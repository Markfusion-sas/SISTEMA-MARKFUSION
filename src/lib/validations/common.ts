import { z } from "zod";

/** Texto opcional: el formulario puede enviar "" y la acción lo guarda como null. */
export const optionalText = (max = 500) => z.string().trim().max(max, `Máximo ${max} caracteres`).optional();

/** Fecha opcional "YYYY-MM-DD" o vacío. */
export const optionalDate = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Fecha no válida")
  .optional();

export const monedaSchema = z.enum(["COP", "USD"]);

export const moneySchema = z
  .number({ invalid_type_error: "Escribe un valor" })
  .min(0, "No puede ser negativo")
  .max(999_999_999_999, "Valor demasiado alto");

/** Convierte "" en null para guardar campos opcionales. */
export function emptyToNull<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? null : value]),
  ) as { [K in keyof T]: T[K] extends string | undefined ? string | null : T[K] };
}
