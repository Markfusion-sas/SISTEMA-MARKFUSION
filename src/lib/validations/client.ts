import { z } from "zod";

import { optionalText } from "@/lib/validations/common";

export const clientSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre del contacto").max(120, "Máximo 120 caracteres"),
  empresa: optionalText(120),
  telefono: optionalText(40),
  email: z.string().trim().email("Correo no válido").max(160).optional().or(z.literal("")),
  ciudad: optionalText(80),
  pais: optionalText(80),
  estado: z.enum(["prospecto", "activo", "pausado", "cerrado"]),
  origen: optionalText(80),
  notas: optionalText(4000),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const CLIENT_DEFAULTS: ClientInput = {
  nombre: "",
  empresa: "",
  telefono: "",
  email: "",
  ciudad: "",
  pais: "Colombia",
  estado: "prospecto",
  origen: "",
  notas: "",
};
