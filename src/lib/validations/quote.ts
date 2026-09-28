import { z } from "zod";

import { monedaSchema, moneySchema, optionalDate, optionalText } from "@/lib/validations/common";

export const quoteItemSchema = z.object({
  descripcion: z.string().trim().min(1, "Describe el ítem").max(300, "Máximo 300 caracteres"),
  cantidad: z
    .number({ invalid_type_error: "Cantidad no válida" })
    .positive("Debe ser mayor a 0")
    .max(100_000, "Cantidad demasiado alta"),
  valor_unitario: moneySchema,
});

export const quoteSchema = z.object({
  client_id: z.string().uuid("Elige el cliente"),
  moneda: monedaSchema,
  fee_mensual: moneySchema,
  vigencia_dias: z
    .number({ invalid_type_error: "Días no válidos" })
    .int("Usa días enteros")
    .min(1, "Mínimo 1 día")
    .max(365, "Máximo 365 días"),
  condiciones: optionalText(4000),
  estado: z.enum(["borrador", "enviada", "aprobada", "rechazada"]),
  items: z.array(quoteItemSchema).min(1, "Agrega al menos un ítem").max(60, "Máximo 60 ítems"),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

export const convertSchema = z
  .object({
    nombre: z.string().trim().min(2, "Escribe el nombre del proyecto").max(140),
    tipo: z.enum(["web", "automatizacion", "bot_ia", "ads", "consultoria", "otro"]),
    valor_total: moneySchema,
    fee_mensual: moneySchema,
    fecha_inicio: optionalDate,
    fecha_entrega: optionalDate,
    descripcion: optionalText(4000),
    cobros: z
      .array(
        z.object({
          concepto: z.string().trim().min(2, "Escribe el concepto").max(160),
          monto: z.number().positive("El monto debe ser mayor a 0"),
          fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha"),
        }),
      )
      .max(24, "Máximo 24 cobros"),
  })
  .refine((v) => !v.fecha_inicio || !v.fecha_entrega || v.fecha_entrega >= v.fecha_inicio, {
    message: "La entrega no puede ser antes del inicio",
    path: ["fecha_entrega"],
  });

export type ConvertInput = z.infer<typeof convertSchema>;

export const brandSchema = z.object({
  nombre_empresa: z.string().trim().min(2, "Escribe el nombre").max(120),
  nit: optionalText(40),
  telefono: optionalText(40),
  email: z.string().trim().email("Correo no válido").max(160).optional().or(z.literal("")),
  direccion: optionalText(200),
  ciudad: optionalText(80),
  sitio_web: optionalText(120),
  condiciones_default: optionalText(4000),
});

export type BrandInput = z.infer<typeof brandSchema>;
