import { z } from "zod";

export const documentSchema = z
  .object({
    nombre: z.string().trim().min(1, "Escribe un nombre").max(160, "Máximo 160 caracteres"),
    tipo: z.enum(["contrato", "brief", "cotizacion", "entregable", "factura", "otro"]),
    client_id: z.string().uuid().nullable(),
    project_id: z.string().uuid().nullable(),
    file_url: z.string().min(1),
  })
  .refine((v) => v.client_id || v.project_id, { message: "El documento debe ir ligado a un cliente o proyecto" });

export type DocumentInput = z.infer<typeof documentSchema>;
