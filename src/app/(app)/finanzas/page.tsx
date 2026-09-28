import type { Metadata } from "next";

import type { Moneda, MovimientoTipo, RecurringExpense } from "@/types/database";
import { shiftMonth, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FinanceView, type FinanceTab } from "@/components/finance/finance-view";
import type { YearTransaction } from "@/components/finance/reports-tab";
import type {
  CategoryOption,
  FinanceProjectOption,
  ReceivableRow,
  TransactionRow,
} from "@/components/finance/types";

export const metadata: Metadata = { title: "Finanzas" };

const TABS: FinanceTab[] = ["movimientos", "por-cobrar", "recurrentes", "reportes"];
const TAB_ALIASES: Record<string, FinanceTab> = { cobros: "por-cobrar", "por_cobrar": "por-cobrar" };

function monthRange(month: string) {
  const start = `${month}-01`;
  const next = `${shiftMonth(month, 1)}-01`;
  return { start, next };
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; mes?: string; anio?: string }>;
}) {
  const params = await searchParams;
  const today = todayISO();
  const currentMonth = today.slice(0, 7);
  const currentYear = Number(today.slice(0, 4));

  const rawTab = params.tab ?? "movimientos";
  const tab: FinanceTab = TABS.includes(rawTab as FinanceTab) ? (rawTab as FinanceTab) : (TAB_ALIASES[rawTab] ?? "movimientos");
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.mes ?? "") && params.mes! <= currentMonth ? params.mes! : currentMonth;
  const yearParam = Number(params.anio);
  const year = Number.isInteger(yearParam) && yearParam >= 2000 && yearParam <= currentYear ? yearParam : currentYear;

  const { start, next } = monthRange(month);
  const prev = monthRange(shiftMonth(month, -1));
  const current = monthRange(currentMonth);

  const supabase = await createClient();
  const [monthRes, prevRes, receivablesRes, recurringRes, currentExpensesRes, yearRes, categoriesRes, projectsRes] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*, project:projects(id, nombre)")
        .gte("fecha", start)
        .lt("fecha", next)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("transactions").select("tipo, monto, moneda").gte("fecha", prev.start).lt("fecha", prev.next),
      supabase
        .from("receivables")
        .select("*, project:projects(id, nombre, client:clients(id, nombre, empresa))")
        .order("fecha_vencimiento"),
      supabase.from("recurring_expenses").select("*").order("dia_cobro"),
      supabase
        .from("transactions")
        .select("categoria, descripcion")
        .eq("tipo", "gasto")
        .gte("fecha", current.start)
        .lt("fecha", current.next),
      supabase
        .from("transactions")
        .select("id, tipo, monto, moneda, categoria, fecha, descripcion, metodo_pago, project:projects(nombre)")
        .gte("fecha", `${year}-01-01`)
        .lte("fecha", `${year}-12-31`),
      supabase.from("categories").select("id, tipo, slug, nombre, color, activo, orden").order("orden"),
      supabase
        .from("projects")
        .select("id, nombre, moneda, estado, client:clients(nombre, empresa)")
        .neq("estado", "cancelado")
        .order("nombre"),
    ]);

  if (monthRes.error) throw new Error(monthRes.error.message);

  // Un recurrente cuenta como "registrado este mes" si hay un gasto con su nombre y categoría en el mes actual.
  const recurring = (recurringRes.data ?? []) as RecurringExpense[];
  const currentExpenses = (currentExpensesRes.data ?? []) as { categoria: string; descripcion: string | null }[];
  const paidRecurring = recurring
    .filter((r) =>
      currentExpenses.some(
        (e) => e.categoria === r.categoria && (e.descripcion ?? "").trim().toLowerCase() === r.nombre.trim().toLowerCase(),
      ),
    )
    .map((r) => r.id);

  type ProjectRaw = { id: string; nombre: string; moneda: Moneda; client: { nombre: string; empresa: string | null } | null };
  const projects: FinanceProjectOption[] = ((projectsRes.data ?? []) as unknown as ProjectRaw[]).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    moneda: p.moneda,
    cliente: p.client ? p.client.empresa || p.client.nombre : null,
  }));

  return (
    <FinanceView
      tab={tab}
      month={month}
      currentMonth={currentMonth}
      year={year}
      currentYear={currentYear}
      transactions={(monthRes.data ?? []) as unknown as TransactionRow[]}
      previous={(prevRes.data ?? []) as { tipo: MovimientoTipo; monto: number; moneda: Moneda }[]}
      receivables={(receivablesRes.data ?? []) as unknown as ReceivableRow[]}
      recurring={recurring}
      paidRecurring={paidRecurring}
      yearTransactions={(yearRes.data ?? []) as unknown as YearTransaction[]}
      categories={(categoriesRes.data ?? []) as CategoryOption[]}
      projects={projects}
    />
  );
}
