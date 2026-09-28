import type { Category, Moneda, MovimientoTipo, Receivable, RecurringExpense, Transaction } from "@/types/database";

export type TransactionRow = Transaction & { project: { id: string; nombre: string } | null };

export type ReceivableRow = Receivable & {
  project: { id: string; nombre: string; client: { id: string; nombre: string; empresa: string | null } | null } | null;
};

export type RecurringRow = RecurringExpense;

export type CategoryOption = Pick<Category, "id" | "tipo" | "slug" | "nombre" | "color" | "activo" | "orden">;

export interface FinanceProjectOption {
  id: string;
  nombre: string;
  moneda: Moneda;
  cliente: string | null;
}

/** Nombre y color de una categoría por su slug. */
export function categoryLookup(categories: CategoryOption[]) {
  const map = new Map(categories.map((c) => [`${c.tipo}:${c.slug}`, c]));
  return (tipo: MovimientoTipo, slug: string) => {
    const found = map.get(`${tipo}:${slug}`);
    return {
      nombre: found?.nombre ?? slug.replace(/_/g, " ").replace(/^\w/, (ch) => ch.toUpperCase()),
      color: found?.color ?? "#71717a",
    };
  };
}

export const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
