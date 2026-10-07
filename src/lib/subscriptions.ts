import type { Subscription, SubscriptionPayment } from "@/types/database";
import { shiftMonth, todayISO } from "@/lib/format";

/** Último día de un mes "YYYY-MM". */
export function lastDayOfMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Fecha de cobro de la mensualidad en un mes (si el día no existe, el último del mes). */
export function dueDateInMonth(diaCobro: number, month: string) {
  return `${month}-${String(Math.min(diaCobro, lastDayOfMonth(month))).padStart(2, "0")}`;
}

/** ¿La mensualidad aplica en ese mes? (ya había empezado). */
export function appliesInMonth(s: Pick<Subscription, "fecha_inicio">, month: string) {
  return s.fecha_inicio.slice(0, 7) <= month;
}

export type MonthStatus = "pagada" | "pendiente" | "vencida" | "no_aplica";

export function monthStatus(
  s: Pick<Subscription, "id" | "fecha_inicio" | "dia_cobro">,
  month: string,
  paidKeys: Set<string>,
  today: string = todayISO(),
): MonthStatus {
  if (!appliesInMonth(s, month)) return "no_aplica";
  if (paidKeys.has(paymentKey(s.id, month))) return "pagada";
  return dueDateInMonth(s.dia_cobro, month) < today ? "vencida" : "pendiente";
}

export function paymentKey(subscriptionId: string, month: string) {
  return `${subscriptionId}:${month}`;
}

export function paidKeySet(payments: Pick<SubscriptionPayment, "subscription_id" | "periodo">[]) {
  return new Set(payments.map((p) => paymentKey(p.subscription_id, p.periodo.slice(0, 7))));
}

/**
 * Meses atrasados (sin pagar y con fecha de cobro ya pasada) de una mensualidad activa,
 * mirando como máximo `lookback` meses hacia atrás desde el mes actual.
 */
export function overdueMonths(
  s: Pick<Subscription, "id" | "fecha_inicio" | "dia_cobro">,
  paidKeys: Set<string>,
  today: string = todayISO(),
  lookback = 12,
) {
  const current = today.slice(0, 7);
  const months: string[] = [];
  for (let i = lookback - 1; i >= 0; i--) {
    const month = shiftMonth(current, -i);
    if (monthStatus(s, month, paidKeys, today) === "vencida") months.push(month);
  }
  return months;
}
