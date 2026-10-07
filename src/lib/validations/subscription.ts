import { z } from "zod";

import { monedaSchema, optionalText } from "@/lib/validations/common";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha");
const positiveMoney = z
  .number({ invalid_type_error: "Escribe el monto" })
  .positive("El monto debe ser mayor a 0")
  .max(999_999_999_999, "Monto demasiado alto");

export const subscriptionSchema = z
  .object({
    client_id: z.string().uuid().nullable(),
    /** Lo que se escribe en "Cliente": si coincide con un cliente registrado se liga a él. */
    cliente: z.string().trim().max(160, "Máximo 160 caracteres"),
    project_id: z.string().uuid().nullable(),
    servicio: z.string().trim().min(2, "Escribe el servicio").max(160, "Máximo 160 caracteres"),
    monto: positiveMoney,
    moneda: monedaSchema,
    dia_cobro: z.number({ invalid_type_error: "Día no válido" }).int().min(1, "Entre 1 y 31").max(31, "Entre 1 y 31"),
    fecha_inicio: isoDate,
    activo: z.boolean(),
    notas: optionalText(2000),
  })
  .refine((v) => v.client_id || v.cliente.length > 0, { message: "Escribe el cliente", path: ["cliente"] });

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export const subscriptionPaySchema = z.object({
  /** Mes que se paga, "YYYY-MM". */
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes no válido"),
  fecha_pago: isoDate,
  monto: positiveMoney,
  categoria: z.string().min(1, "Elige una categoría"),
  metodo_pago: optionalText(60),
});

export type SubscriptionPayInput = z.infer<typeof subscriptionPaySchema>;
