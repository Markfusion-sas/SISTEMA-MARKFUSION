import type { ClienteEstado } from "@/types/database";

type ClientLike = { nombre: string; empresa: string | null; estado?: ClienteEstado | string | null };

/**
 * Orden para los selectores de cliente: todos los clientes (también los cerrados,
 * que pueden volver a contratar), alfabéticos por empresa o nombre, y los cerrados al final.
 */
export function sortClientsForSelect<T extends ClientLike>(clients: T[]) {
  const name = (c: T) => (c.empresa || c.nombre).trim();
  return [...clients].sort((a, b) => {
    const closed = Number(a.estado === "cerrado") - Number(b.estado === "cerrado");
    return closed || name(a).localeCompare(name(b), "es", { sensitivity: "base" });
  });
}

/** Texto de un cliente en un selector: "Empresa · Contacto", marcando los cerrados. */
export function clientOptionLabel(c: ClientLike) {
  const base = c.empresa ? `${c.empresa} · ${c.nombre}` : c.nombre;
  return c.estado === "cerrado" ? `${base} (cerrado)` : base;
}
