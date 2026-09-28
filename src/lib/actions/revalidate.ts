import { revalidatePath } from "next/cache";

/**
 * Los módulos están muy conectados (un pago afecta cliente, proyecto y dashboard),
 * así que tras cada escritura se invalida todo el árbol de la app.
 */
export function revalidateApp() {
  revalidatePath("/", "layout");
}

/** Traduce los errores más comunes de Postgres a mensajes en español. */
export function dbErrorMessage(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback;
  if (error.code === "23503") return "No se puede eliminar porque tiene registros asociados.";
  if (error.code === "23505") return "Ya existe un registro con ese valor.";
  if (error.code === "23514") return "Algún dato no cumple las reglas de la base de datos.";
  if (error.code === "42501") return "No tienes permiso para esta acción. Vuelve a iniciar sesión.";
  return fallback;
}
