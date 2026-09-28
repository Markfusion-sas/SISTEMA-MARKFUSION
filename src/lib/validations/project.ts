import { z } from "zod";

import { monedaSchema, moneySchema, optionalDate, optionalText } from "@/lib/validations/common";

export const projectSchema = z
  .object({
    client_id: z.string().uuid("Elige un cliente"),
    nombre: z.string().trim().min(2, "Escribe el nombre del proyecto").max(140, "Máximo 140 caracteres"),
    tipo: z.enum(["web", "automatizacion", "bot_ia", "ads", "consultoria", "otro"]),
    estado: z.enum(["en_curso", "en_revision", "entregado", "mantenimiento", "cancelado"]),
    moneda: monedaSchema,
    valor_total: moneySchema,
    fee_mensual: moneySchema,
    fecha_inicio: optionalDate,
    fecha_entrega: optionalDate,
    descripcion: optionalText(4000),
  })
  .refine((v) => !v.fecha_inicio || !v.fecha_entrega || v.fecha_entrega >= v.fecha_inicio, {
    message: "La entrega no puede ser antes del inicio",
    path: ["fecha_entrega"],
  });

export type ProjectInput = z.infer<typeof projectSchema>;
