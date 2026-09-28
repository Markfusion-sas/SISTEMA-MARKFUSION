import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Escribe tu correo").email("Correo no válido"),
  password: z.string().min(6, "La contraseña tiene al menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
