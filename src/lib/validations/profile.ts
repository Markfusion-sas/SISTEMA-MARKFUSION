import { z } from "zod";

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color en formato #RRGGBB")
  .transform((v) => v.toLowerCase());

export const profileSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(60, "Máximo 60 caracteres"),
  color: hexColor,
});

export type ProfileInput = z.input<typeof profileSchema>;

export const memberColorSchema = z.object({
  id: z.string().uuid(),
  color: hexColor,
});
