import { z } from "zod";

import { monedaSchema, optionalText } from "@/lib/validations/common";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha");
const positiveMoney = z
  .number({ invalid_type_error: "Escribe el monto" })
  .positive("El monto debe ser mayor a 0")
  .max(999_999_999_999, "Monto demasiado alto");

export const transactionSchema = z.object({
  tipo: z.enum(["ingreso", "gasto"]),
  monto: positiveMoney,
  moneda: monedaSchema,
  categoria: z.string().min(1, "Elige una categoría"),
  project_id: z.string().uuid().nullable(),
  descripcion: optionalText(300),
  fecha: isoDate,
  metodo_pago: optionalText(60),
  soporte_url: z.string().max(500).nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const receivableSchema = z
  .object({
    /** Proyecto opcional: se completa solo si lo escrito coincide con un proyecto existente. */
    project_id: z.string().uuid().nullable(),
    /** A quién se le cobra, en texto libre (se puede escribir o pegar). */
    cliente: z.string().trim().max(160, "Máximo 160 caracteres"),
    concepto: z.string().trim().min(2, "Escribe el concepto").max(160, "Máximo 160 caracteres"),
    monto: positiveMoney,
    moneda: monedaSchema,
    /** Opcional: vacío = sin fecha acordada (se guarda como null). */
    fecha_vencimiento: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Fecha no válida"),
  })
  .refine((v) => v.project_id || v.cliente.length > 0, {
    message: "Escribe a quién le cobras",
    path: ["cliente"],
  });

export type ReceivableInput = z.infer<typeof receivableSchema>;

export const markPaidSchema = z.object({
  fecha: isoDate,
  categoria: z.string().min(1, "Elige una categoría"),
  metodo_pago: optionalText(60),
  soporte_url: z.string().max(500).nullable(),
});

export type MarkPaidInput = z.infer<typeof markPaidSchema>;

export const recurringSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre").max(120, "Máximo 120 caracteres"),
  monto: positiveMoney,
  moneda: monedaSchema,
  dia_cobro: z.number({ invalid_type_error: "Día no válido" }).int().min(1, "Entre 1 y 31").max(31, "Entre 1 y 31"),
  categoria: z.string().min(1, "Elige una categoría"),
  activo: z.boolean(),
});

export type RecurringInput = z.infer<typeof recurringSchema>;

export const categorySchema = z.object({
  tipo: z.enum(["ingreso", "gasto"]),
  nombre: z.string().trim().min(2, "Escribe el nombre").max(60, "Máximo 60 caracteres"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color no válido")
    .transform((v) => v.toLowerCase()),
});

export type CategoryInput = z.input<typeof categorySchema>;

/** "Herramientas & Software" → "herramientas_software" */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}
