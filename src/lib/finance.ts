import type { CobroEstado, Moneda } from "@/types/database";
import { formatMoney, todayISO } from "@/lib/format";

export type Totals = Partial<Record<Moneda, number>>;

/** Suma montos agrupando por moneda (nunca se mezclan COP y USD). */
export function sumByCurrency<T extends { monto: number | string; moneda: Moneda }>(rows: T[]): Totals {
  return rows.reduce<Totals>((acc, row) => {
    acc[row.moneda] = (acc[row.moneda] ?? 0) + Number(row.monto);
    return acc;
  }, {});
}

/** "$1.500.000 · US$300". Si no hay montos devuelve "$0". */
export function formatTotals(totals: Totals, opts: { compact?: boolean } = {}) {
  const parts = (["COP", "USD"] as Moneda[])
    .filter((m) => totals[m] !== undefined && totals[m] !== 0)
    .map((m) => formatMoney(totals[m], m, opts));
  return parts.length ? parts.join(" · ") : formatMoney(0, "COP");
}

export type CobroEstadoVista = CobroEstado | "vencido";

/**
 * Un cobro pendiente con fecha pasada se muestra como "vencido" (no se guarda en la base).
 * Sin fecha de vencimiento nunca se vence.
 */
export function receivableStatus(
  r: { estado: CobroEstado; fecha_vencimiento: string | null },
  today: string = todayISO(),
): CobroEstadoVista {
  if (r.estado === "pendiente" && r.fecha_vencimiento && r.fecha_vencimiento < today) return "vencido";
  return r.estado;
}

/** Ordena por vencimiento dejando al final los cobros sin fecha. */
export function compareDueDates(a: string | null, b: string | null) {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}
