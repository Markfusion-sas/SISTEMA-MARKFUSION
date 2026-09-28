import { z } from "zod";

import { optionalDate, optionalText } from "@/lib/validations/common";

export const TASK_ESTADOS = ["pendiente", "en_progreso", "en_revision", "hecha"] as const;
export const TASK_PRIORIDADES = ["alta", "media", "baja"] as const;

const optionalUuid = z.string().uuid().nullable();

export const taskSchema = z.object({
  titulo: z.string().trim().min(2, "Escribe la tarea").max(200, "Máximo 200 caracteres"),
  descripcion: optionalText(4000),
  responsable_id: optionalUuid,
  project_id: optionalUuid,
  meeting_id: optionalUuid,
  prioridad: z.enum(TASK_PRIORIDADES),
  estado: z.enum(TASK_ESTADOS),
  fecha_limite: optionalDate,
});

export type TaskInput = z.infer<typeof taskSchema>;

export const moveTaskSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(TASK_ESTADOS),
  orden: z.number().finite(),
});
