import { z } from "zod";

import { optionalText } from "@/lib/validations/common";

const time = z.string().regex(/^\d{2}:\d{2}$/, "Hora no válida");

export const meetingSchema = z
  .object({
    titulo: z.string().trim().min(2, "Escribe el título").max(160, "Máximo 160 caracteres"),
    tipo: z.enum(["venta", "kickoff", "seguimiento", "entrega", "interna"]),
    estado: z.enum(["programada", "realizada", "cancelada"]),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha"),
    hora_inicio: time,
    hora_fin: time.or(z.literal("")),
    client_id: z.string().uuid().nullable(),
    project_id: z.string().uuid().nullable(),
    link: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Pega un enlace completo (https://…)")
      .optional(),
    participantes: optionalText(500),
    agenda: optionalText(8000),
  })
  .refine((v) => !v.hora_fin || v.hora_fin > v.hora_inicio, {
    message: "La hora de fin debe ser después del inicio",
    path: ["hora_fin"],
  });

export type MeetingInput = z.infer<typeof meetingSchema>;

export const meetingNotesSchema = z.object({
  agenda: optionalText(8000),
  notas: optionalText(20000),
  decisiones: optionalText(8000),
});

export type MeetingNotesInput = z.infer<typeof meetingNotesSchema>;
