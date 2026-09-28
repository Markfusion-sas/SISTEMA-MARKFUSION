import type { Metadata } from "next";
import { CircleDollarSign, Receipt, TrendingDown, Wallet } from "lucide-react";

import type { Category, Moneda, MovimientoTipo, RecurringExpense } from "@/types/database";
import { getSession } from "@/lib/auth";
import { capitalize, formatDate, formatMoney, greeting, shiftMonth, todayISO } from "@/lib/format";
import { firstName } from "@/lib/utils";
import { ExpenseDonut, type CategorySlice } from "@/components/dashboard/expense-donut";
import { IncomeExpenseChart, type MonthPoint } from "@/components/dashboard/income-expense-chart";
import {
  KpiCard,
  RecurringThisMonth,
  TasksByPerson,
  UpcomingMeetings,
  UpcomingReceivables,
  endOfWeek,
  type DashboardMeeting,
  type DashboardReceivable,
  type DashboardRecurring,
  type DashboardTask,
} from "@/components/dashboard/widgets";
import { PageHeader } from "@/components/shared/page-header";
import { Stagger, StaggerItem } from "@/components/shared/page-transition";

export const metadata: Metadata = { title: "Dashboard" };

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MAX_SLICES = 5;

type Tx = { tipo: MovimientoTipo; monto: number; moneda: Moneda; categoria: string; fecha: string; descripcion: string | null };

function variation(current: number, previous: number) {
  if (!previous) return null;
  return (current - previous) / Math.abs(previous);
}

function recurringDate(month: string, day: number) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const { profile, team, supabase } = await getSession();

  const today = todayISO();
  const month = today.slice(0, 7);
  const prevMonth = shiftMonth(month, -1);
  const firstMonth = shiftMonth(month, -5);
  const nextMonthStart = `${shiftMonth(month, 1)}-01`;
  const prevMonthEnd = `${prevMonth}-${String(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 0)).getUTCDate()).padStart(2, "0")}`;
  const weekEnd = endOfWeek(today);

  const [txRes, receivablesRes, tasksRes, meetingsRes, recurringRes, categoriesRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("tipo, monto, moneda, categoria, fecha, descripcion")
      .gte("fecha", `${firstMonth}-01`)
      .lt("fecha", nextMonthStart),
    supabase
      .from("receivables")
      .select("id, concepto, cliente, monto, moneda, estado, fecha_vencimiento, pagado_en, project:projects(id, nombre, client:clients(nombre, empresa))")
      .order("fecha_vencimiento"),
    supabase
      .from("tasks")
      .select("id, titulo, prioridad, fecha_limite, responsable_id, project:projects(nombre)")
      .neq("estado", "hecha")
      .not("fecha_limite", "is", null)
      .lte("fecha_limite", weekEnd)
      .order("fecha_limite"),
    supabase
      .from("meetings")
      .select("id, titulo, tipo, fecha_inicio, fecha_fin, link, client:clients(nombre, empresa)")
      .eq("estado", "programada")
      .gte("fecha_inicio", `${today}T00:00:00-05:00`)
      .order("fecha_inicio")
      .limit(7),
    supabase.from("recurring_expenses").select("*").eq("activo", true).order("dia_cobro"),
    supabase.from("categories").select("tipo, slug, nombre, color, orden"),
  ]);

  const txs = (txRes.data ?? []) as Tx[];
  const cop = txs.filter((t) => t.moneda === "COP");
  const usd = txs.filter((t) => t.moneda === "USD");
  const sum = (rows: Tx[], tipo: MovimientoTipo, m: string) =>
    rows.filter((t) => t.tipo === tipo && t.fecha.startsWith(m)).reduce((s, t) => s + Number(t.monto), 0);

  // KPIs del mes (COP; lo que haya en USD se muestra como nota)
  const ingresos = sum(cop, "ingreso", month);
  const gastos = sum(cop, "gasto", month);
  const utilidad = ingresos - gastos;
  const prevIngresos = sum(cop, "ingreso", prevMonth);
  const prevGastos = sum(cop, "gasto", prevMonth);
  const prevUtilidad = prevIngresos - prevGastos;
  const usdIngresos = sum(usd, "ingreso", month);

  // Por cobrar: saldo pendiente hoy vs el que había al cierre del mes anterior
  type RecRaw = Omit<DashboardReceivable, "project"> & {
    pagado_en: string | null;
    project: { id: string; nombre: string; client: { nombre: string; empresa: string | null } | null } | null;
  };
  const receivables = (receivablesRes.data ?? []) as unknown as RecRaw[];
  const pendingCop = receivables.filter((r) => r.estado === "pendiente" && r.moneda === "COP");
  const porCobrar = pendingCop.reduce((s, r) => s + Number(r.monto), 0);
  const prevPorCobrar = receivables
    .filter((r) => r.moneda === "COP" && (r.estado === "pendiente" || (r.pagado_en !== null && r.pagado_en > prevMonthEnd)))
    .reduce((s, r) => s + Number(r.monto), 0);
  const overdueCount = pendingCop.filter((r) => r.fecha_vencimiento < today).length;

  // Saldo por cobrar al cierre de cada uno de los últimos 6 meses (el actual, a hoy).
  const pendingAt = (date: string) =>
    receivables
      .filter((r) => r.moneda === "COP" && (r.estado === "pendiente" || (r.pagado_en !== null && r.pagado_en > date)))
      .reduce((s, r) => s + Number(r.monto), 0);
  const porCobrarTrend = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(firstMonth, i);
    if (m === month) return porCobrar;
    const [yy, mm] = m.split("-").map(Number);
    return pendingAt(`${m}-${String(new Date(Date.UTC(yy, mm, 0)).getUTCDate()).padStart(2, "0")}`);
  });

  // Ingresos vs gastos (6 meses)
  const chart: MonthPoint[] = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(firstMonth, i);
    return { key: m, label: MONTHS_SHORT[Number(m.slice(5, 7)) - 1], ingresos: sum(cop, "ingreso", m), gastos: sum(cop, "gasto", m) };
  });

  // Gastos del mes por categoría (máximo 6 segmentos: top 5 + "Otros")
  const categories = (categoriesRes.data ?? []) as Pick<Category, "tipo" | "slug" | "nombre" | "color" | "orden">[];
  const byCategory = new Map<string, number>();
  for (const t of cop.filter((t) => t.tipo === "gasto" && t.fecha.startsWith(month))) {
    byCategory.set(t.categoria, (byCategory.get(t.categoria) ?? 0) + Number(t.monto));
  }
  const ranked = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const slices: CategorySlice[] = ranked.slice(0, MAX_SLICES).map(([slug, value]) => {
    const cat = categories.find((c) => c.tipo === "gasto" && c.slug === slug);
    return { slug, nombre: cat?.nombre ?? slug, color: cat?.color ?? "#8a8a94", value };
  });
  const rest = ranked.slice(MAX_SLICES).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) slices.push({ slug: "__otros", nombre: "Otras categorías", color: "#8a8a94", value: rest });

  // Tareas vencidas y de esta semana
  const tasks: DashboardTask[] = (
    (tasksRes.data ?? []) as unknown as (Omit<DashboardTask, "proyecto"> & { project: { nombre: string } | null })[]
  ).map((t) => ({ ...t, proyecto: t.project?.nombre ?? null }));

  // Reuniones de hoy y próximas
  const meetings: DashboardMeeting[] = (
    (meetingsRes.data ?? []) as unknown as (Omit<DashboardMeeting, "cliente"> & {
      client: { nombre: string; empresa: string | null } | null;
    })[]
  ).map((m) => ({ ...m, cliente: m.client ? m.client.empresa || m.client.nombre : null }));

  // Próximos cobros: vencidos primero y luego los que vienen
  const upcoming: DashboardReceivable[] = receivables
    .filter((r) => r.estado === "pendiente")
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      concepto: r.concepto,
      monto: r.monto,
      moneda: r.moneda,
      estado: r.estado,
      fecha_vencimiento: r.fecha_vencimiento,
      cliente: r.cliente,
      project: r.project
        ? { id: r.project.id, nombre: r.project.nombre, cliente: r.project.client ? r.project.client.empresa || r.project.client.nombre : null }
        : null,
    }));

  // Gastos recurrentes del mes (registrado = hay un gasto del mes con su nombre y categoría)
  const monthExpenses = txs.filter((t) => t.tipo === "gasto" && t.fecha.startsWith(month));
  const recurring: DashboardRecurring[] = ((recurringRes.data ?? []) as RecurringExpense[]).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    monto: Number(r.monto),
    moneda: r.moneda,
    fecha: recurringDate(month, r.dia_cobro),
    pagado: monthExpenses.some(
      (e) => e.categoria === r.categoria && (e.descripcion ?? "").trim().toLowerCase() === r.nombre.trim().toLowerCase(),
    ),
  }));

  const monthLabel = capitalize(formatDate(`${month}-15`, "monthYear").replace(/ de \d{4}$/, ""));
  const prevLabel = formatDate(`${prevMonth}-15`, "monthYear").replace(/ de \d{4}$/, "");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={capitalize(formatDate(new Date(), "full"))}
        title={`${greeting()}, ${firstName(profile.nombre)}`}
        description={`Así va ${monthLabel.toLowerCase()} en MarkFusion.`}
      />

      <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <KpiCard
            label="Ingresos del mes"
            icon={CircleDollarSign}
            value={formatMoney(ingresos)}
            delta={variation(ingresos, prevIngresos)}
            previousLabel={prevLabel}
            hint={usdIngresos ? `+ ${formatMoney(usdIngresos, "USD")}` : undefined}
            href="/finanzas"
            trend={chart.map((p) => p.ingresos)}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Gastos del mes"
            icon={TrendingDown}
            value={formatMoney(gastos)}
            delta={variation(gastos, prevGastos)}
            previousLabel={prevLabel}
            invert
            href="/finanzas"
            trend={chart.map((p) => p.gastos)}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Utilidad"
            icon={Wallet}
            value={formatMoney(utilidad)}
            delta={variation(utilidad, prevUtilidad)}
            previousLabel={prevLabel}
            hint={ingresos > 0 ? `margen ${Math.round((utilidad / ingresos) * 100)} %` : undefined}
            href="/finanzas?tab=reportes"
            trend={chart.map((p) => p.ingresos - p.gastos)}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Por cobrar"
            icon={Receipt}
            value={formatMoney(porCobrar)}
            delta={variation(porCobrar, prevPorCobrar)}
            previousLabel={`cierre de ${prevLabel}`}
            invert
            hint={overdueCount ? `${overdueCount} vencidos` : undefined}
            href="/finanzas?tab=por-cobrar"
            trend={porCobrarTrend}
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeExpenseChart data={chart} />
        </div>
        <ExpenseDonut slices={slices} monthLabel={monthLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TasksByPerson tasks={tasks} team={team} today={today} />
        </div>
        <UpcomingMeetings meetings={meetings} today={today} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingReceivables receivables={upcoming} today={today} />
        <RecurringThisMonth items={recurring} monthLabel={monthLabel} today={today} />
      </div>
    </div>
  );
}
