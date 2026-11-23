"use client";

import { Fragment, useMemo, useState } from "react";
import { CalendarRange, Download, FileSpreadsheet, TrendingDown, TrendingUp, Trophy, Wallet } from "lucide-react";
import { toast } from "sonner";

import type { Moneda, MovimientoTipo } from "@/types/database";
import { downloadCSV } from "@/lib/csv";
import { addDaysISO, formatDate, formatMoney, formatPercent, shiftMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MONTHS_SHORT, categoryLookup, type CategoryOption } from "@/components/finance/types";
import { PLChart, type PLPoint } from "@/components/charts/pl-chart";
import { StackedCategoryChart, type StackSeries } from "@/components/charts/stacked-category-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ReportTransaction {
  id: string;
  tipo: MovimientoTipo;
  monto: number;
  moneda: Moneda;
  categoria: string;
  fecha: string;
  descripcion: string | null;
  metodo_pago: string | null;
  project: { nombre: string } | null;
}

const MONTHS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const CUSTOM = "personalizado";

/** Rangos rápidos, calculados a partir de hoy. */
function rangePresets(today: string) {
  const year = Number(today.slice(0, 4));
  const month = today.slice(0, 7);
  const prevMonth = shiftMonth(month, -1);
  return [
    { value: "este-mes", label: "Este mes", from: `${month}-01`, to: today },
    { value: "mes-pasado", label: "Mes pasado", from: `${prevMonth}-01`, to: addDaysISO(`${month}-01`, -1) },
    { value: "ultimos-3", label: "Últimos 3 meses", from: `${shiftMonth(month, -2)}-01`, to: today },
    { value: "ultimos-6", label: "Últimos 6 meses", from: `${shiftMonth(month, -5)}-01`, to: today },
    { value: "ultimos-12", label: "Últimos 12 meses", from: `${shiftMonth(month, -11)}-01`, to: today },
    { value: "este-anio", label: "Este año", from: `${year}-01-01`, to: today },
    { value: "anio-pasado", label: "Año pasado", from: `${year - 1}-01-01`, to: `${year - 1}-12-31` },
  ];
}

interface Bucket {
  key: string; // "YYYY-MM"
  short: string;
  long: string;
  future: boolean;
}

/** Un bucket por cada mes que toca el rango; si cruza años, la etiqueta lleva el año. */
function buildBuckets(from: string, to: string, today: string): Bucket[] {
  const multiYear = from.slice(0, 4) !== to.slice(0, 4);
  const currentMonth = today.slice(0, 7);
  const buckets: Bucket[] = [];
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = shiftMonth(m, 1)) {
    const i = Number(m.slice(5, 7)) - 1;
    const yy = m.slice(2, 4);
    buckets.push({
      key: m,
      short: multiYear ? `${MONTHS_SHORT[i]} ${yy}` : MONTHS_SHORT[i],
      long: multiYear ? `${MONTHS_LONG[i]} ${m.slice(0, 4)}` : MONTHS_LONG[i],
      future: m > currentMonth,
    });
  }
  return buckets;
}

const isValidDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= "2000-01-01";

type Matrix = Map<string, number[]>;

export function ReportsTab({
  transactions,
  from,
  to,
  today,
  onRangeChange,
  categories,
}: {
  transactions: ReportTransaction[];
  from: string;
  to: string;
  today: string;
  onRangeChange: (from: string, to: string) => void;
  categories: CategoryOption[];
}) {
  const hasUsd = transactions.some((t) => t.moneda === "USD");
  const [moneda, setMoneda] = useState<Moneda>("COP");
  const lookup = useMemo(() => categoryLookup(categories), [categories]);

  const presets = useMemo(() => rangePresets(today), [today]);
  const activePreset = presets.find((p) => p.from === from && p.to === to)?.value ?? CUSTOM;
  const periodLabel = from === to ? formatDate(from, "medium") : `${formatDate(from, "medium")} – ${formatDate(to, "medium")}`;
  const fileSuffix = `${from}_a_${to}`;

  const buckets = useMemo(() => buildBuckets(from, to, today), [from, to, today]);

  const report = useMemo(() => {
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    const zeros = () => buckets.map(() => 0);
    const rows = transactions.filter((t) => t.moneda === moneda);
    const byCategory: Record<MovimientoTipo, Matrix> = { ingreso: new Map(), gasto: new Map() };
    const totals = { ingreso: zeros(), gasto: zeros() };

    for (const t of rows) {
      const i = index.get(t.fecha.slice(0, 7));
      if (i === undefined) continue;
      const matrix = byCategory[t.tipo];
      if (!matrix.has(t.categoria)) matrix.set(t.categoria, zeros());
      matrix.get(t.categoria)![i] += Number(t.monto);
      totals[t.tipo][i] += Number(t.monto);
    }

    const order = (tipo: MovimientoTipo) => (slug: string) =>
      categories.find((c) => c.tipo === tipo && c.slug === slug)?.orden ?? 999;
    const sortedKeys = (tipo: MovimientoTipo) =>
      [...byCategory[tipo].keys()].sort((a, b) => order(tipo)(a) - order(tipo)(b));

    const utilidad = totals.ingreso.map((v, i) => v - totals.gasto[i]);
    const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
    const bestIndex = utilidad.reduce((best, v, i) => (v > utilidad[best] ? i : best), 0);

    return {
      byCategory,
      totals,
      utilidad,
      ingresoKeys: sortedKeys("ingreso"),
      gastoKeys: sortedKeys("gasto"),
      totalIngresos: sum(totals.ingreso),
      totalGastos: sum(totals.gasto),
      totalUtilidad: sum(utilidad),
      best: rows.length ? { index: bestIndex, value: utilidad[bestIndex] } : null,
      count: rows.length,
      sum,
    };
  }, [transactions, moneda, categories, buckets]);

  // Meses que se dibujan en gráficas y en el resumen: se omiten los meses futuros sin movimientos.
  const visible = useMemo(
    () =>
      buckets
        .map((b, i) => ({ ...b, i }))
        .filter((b) => !b.future || report.totals.ingreso[b.i] || report.totals.gasto[b.i]),
    [buckets, report],
  );

  const maxAbs = Math.max(1, ...report.totals.ingreso, ...report.totals.gasto);

  const plData: PLPoint[] = visible.map((b) => ({
    label: b.short,
    ingresos: report.totals.ingreso[b.i],
    gastos: report.totals.gasto[b.i],
    utilidad: report.utilidad[b.i],
  }));

  // Series del apilado: las 5 categorías de gasto más grandes del periodo + "Otras".
  const stack = useMemo(() => {
    const ranked = report.gastoKeys
      .map((slug) => ({ slug, total: report.sum(report.byCategory.gasto.get(slug)!) }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
    const main = ranked.slice(0, ranked.length > 6 ? 5 : 6);
    const others = ranked.slice(main.length);
    const series: StackSeries[] = [
      ...main.map((c) => ({ key: c.slug, nombre: lookup("gasto", c.slug).nombre, color: lookup("gasto", c.slug).color })),
      ...(others.length ? [{ key: "__otras", nombre: "Otras", color: "#8a8a94" }] : []),
    ];
    const data = visible.map((b) => {
      const row: { label: string } & Record<string, number | string> = { label: b.short };
      for (const c of main) row[c.slug] = report.byCategory.gasto.get(c.slug)![b.i];
      if (others.length) row.__otras = others.reduce((s, c) => s + report.byCategory.gasto.get(c.slug)![b.i], 0);
      return row;
    });
    return { series, data };
  }, [report, lookup, visible]);

  const exportPL = () => {
    const header = ["Concepto", ...buckets.map((b) => b.short), "Total"];
    const line = (label: string, values: number[]) => [label, ...values, report.sum(values)];
    const rows = [
      [`P&L ${from} a ${to} · ${moneda}`],
      [],
      header,
      ["INGRESOS"],
      ...report.ingresoKeys.map((k) => line(`  ${lookup("ingreso", k).nombre}`, report.byCategory.ingreso.get(k)!)),
      line("Total ingresos", report.totals.ingreso),
      [],
      ["GASTOS"],
      ...report.gastoKeys.map((k) => line(`  ${lookup("gasto", k).nombre}`, report.byCategory.gasto.get(k)!)),
      line("Total gastos", report.totals.gasto),
      [],
      line("UTILIDAD", report.utilidad),
    ];
    downloadCSV(`markfusion-pyg-${fileSuffix}-${moneda.toLowerCase()}`, rows);
    toast.success("P&L exportado a CSV");
  };

  const exportMovements = () => {
    const rows = [
      ["Fecha", "Tipo", "Categoría", "Descripción", "Proyecto", "Método de pago", "Moneda", "Monto"],
      ...[...transactions]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((t) => [
          t.fecha,
          t.tipo === "ingreso" ? "Ingreso" : "Gasto",
          lookup(t.tipo, t.categoria).nombre,
          t.descripcion ?? "",
          t.project?.nombre ?? "General",
          t.metodo_pago ?? "",
          t.moneda,
          Number(t.monto),
        ]),
    ];
    downloadCSV(`markfusion-movimientos-${fileSuffix}`, rows);
    toast.success(`${transactions.length} movimientos exportados a CSV`);
  };

  // Si una fecha queda al otro lado de la otra, ambas se igualan para que el rango siga siendo válido.
  const changeFrom = (value: string) => {
    if (isValidDate(value)) onRangeChange(value, value > to ? value : to);
  };
  const changeTo = (value: string) => {
    if (isValidDate(value)) onRangeChange(value < from ? value : from, value);
  };

  const cell = (value: number, i: number, opts: { strong?: boolean; signed?: boolean } = {}) => {
    const future = buckets[i].future;
    return (
      <td
        key={i}
        className={cn(
          "px-3 py-2 text-right whitespace-nowrap tabular",
          future && "text-muted-foreground/40",
          opts.strong && "font-semibold",
          opts.signed && value < 0 && "text-destructive",
        )}
      >
        {future && value === 0 ? "—" : value === 0 ? <span className="text-muted-foreground/60">0</span> : formatMoney(value, moneda, { compact: true })}
      </td>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Periodo</span>
            <Select
              value={activePreset}
              onValueChange={(v) => {
                const preset = presets.find((p) => p.value === v);
                if (preset) onRangeChange(preset.from, preset.to);
              }}
            >
              <SelectTrigger className="w-48">
                <CalendarRange />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM} disabled>
                  Personalizado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Desde</span>
            <Input
              type="date"
              className="w-40"
              value={from}
              min="2000-01-01"
              max={to}
              onChange={(e) => changeFrom(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">Hasta</span>
            <Input type="date" className="w-40" value={to} min={from} onChange={(e) => changeTo(e.target.value)} />
          </label>
          {hasUsd && (
            <div className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px]">
              {(["COP", "USD"] as Moneda[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoneda(m)}
                  className={cn(
                    "h-7 rounded-md px-3 text-[13px] font-medium",
                    moneda === m ? "bg-background shadow-sm dark:bg-input/40" : "text-muted-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportMovements} disabled={!transactions.length}>
            <FileSpreadsheet />
            Movimientos CSV
          </Button>
          <Button onClick={exportPL} disabled={!report.count}>
            <Download />
            P&amp;L CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos del periodo"
          icon={TrendingUp}
          tone="success"
          value={formatMoney(report.totalIngresos, moneda)}
          hint={periodLabel}
        />
        <StatCard label="Gastos del periodo" icon={TrendingDown} value={formatMoney(report.totalGastos, moneda)} hint={periodLabel} />
        <StatCard
          label="Utilidad del periodo"
          icon={Wallet}
          tone={report.totalUtilidad < 0 ? "danger" : "brand"}
          value={formatMoney(report.totalUtilidad, moneda)}
          hint={report.totalIngresos ? `Margen ${formatPercent(report.totalUtilidad / report.totalIngresos)}` : undefined}
        />
        <StatCard
          label="Mejor mes"
          icon={Trophy}
          value={report.best ? buckets[report.best.index].long : "—"}
          hint={report.best ? `Utilidad ${formatMoney(report.best.value, moneda)}` : "Sin datos"}
        />
      </div>

      {report.count === 0 ? (
        <EmptyState
          compact
          icon={FileSpreadsheet}
          title={`Sin movimientos en ${moneda} en este periodo`}
          description={`No hay ingresos ni gastos registrados entre ${periodLabel}. Elige otro rango de fechas.`}
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="gap-4">
              <CardHeader>
                <CardTitle>Resultado mes a mes</CardTitle>
                <CardDescription>Ingresos y gastos en barras; la línea es la utilidad · {moneda}</CardDescription>
              </CardHeader>
              <CardContent>
                <PLChart data={plData} moneda={moneda} />
              </CardContent>
            </Card>
            <Card className="gap-4">
              <CardHeader>
                <CardTitle>¿En qué se va el gasto?</CardTitle>
                <CardDescription>Gastos por categoría cada mes · {moneda}</CardDescription>
              </CardHeader>
              <CardContent>
                {stack.series.length ? (
                  <StackedCategoryChart data={stack.data} series={stack.series} moneda={moneda} />
                ) : (
                  <p className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                    Sin gastos en este periodo.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumen mensual */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>P&amp;L mensual</CardTitle>
              <CardDescription>
                Ingresos, gastos y utilidad de cada mes en {moneda} · {periodLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-5 py-2 text-left font-medium">Mes</th>
                      <th className="px-3 py-2 text-right font-medium">Ingresos</th>
                      <th className="px-3 py-2 text-right font-medium">Gastos</th>
                      <th className="px-3 py-2 text-right font-medium">Utilidad</th>
                      <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Margen</th>
                      <th className="hidden w-48 px-5 py-2 font-medium md:table-cell" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((b) => {
                      const ing = report.totals.ingreso[b.i];
                      const gas = report.totals.gasto[b.i];
                      const util = report.utilidad[b.i];
                      return (
                        <tr key={b.key} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-5 py-2.5 font-medium">{b.long}</td>
                          <td className="px-3 py-2.5 text-right text-success tabular">{formatMoney(ing, moneda)}</td>
                          <td className="px-3 py-2.5 text-right tabular">{formatMoney(gas, moneda)}</td>
                          <td className={cn("px-3 py-2.5 text-right font-semibold tabular", util < 0 && "text-destructive")}>
                            {formatMoney(util, moneda)}
                          </td>
                          <td className="hidden px-3 py-2.5 text-right text-muted-foreground tabular sm:table-cell">
                            {ing ? formatPercent(util / ing) : "—"}
                          </td>
                          <td className="hidden px-5 py-2.5 md:table-cell">
                            <div className="space-y-1" aria-hidden>
                              <div className="h-1.5 rounded-full bg-success/80" style={{ width: `${(ing / maxAbs) * 100}%` }} />
                              <div className="h-1.5 rounded-full bg-foreground/25" style={{ width: `${(gas / maxAbs) * 100}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td className="px-5 py-2.5">Total del periodo</td>
                      <td className="px-3 py-2.5 text-right text-success tabular">{formatMoney(report.totalIngresos, moneda)}</td>
                      <td className="px-3 py-2.5 text-right tabular">{formatMoney(report.totalGastos, moneda)}</td>
                      <td className={cn("px-3 py-2.5 text-right tabular", report.totalUtilidad < 0 && "text-destructive")}>
                        {formatMoney(report.totalUtilidad, moneda)}
                      </td>
                      <td className="hidden px-3 py-2.5 text-right text-muted-foreground tabular sm:table-cell">
                        {report.totalIngresos ? formatPercent(report.totalUtilidad / report.totalIngresos) : "—"}
                      </td>
                      <td className="hidden md:table-cell" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detalle por categoría */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Detalle por categoría</CardTitle>
              <CardDescription>Estado de resultados por categoría y mes.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" onClick={exportPL}>
                  <Download />
                  CSV
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]" style={{ minWidth: 260 + buckets.length * 70 }}>
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="sticky left-0 z-10 bg-card px-5 py-2 text-left font-medium">Concepto</th>
                      {buckets.map((b) => (
                        <th key={b.key} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                          {b.short}
                        </th>
                      ))}
                      <th className="px-5 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["ingreso", "gasto"] as const).map((tipo) => (
                      <Fragment key={tipo}>
                        <tr className="bg-muted/30">
                          <td
                            colSpan={buckets.length + 2}
                            className="sticky left-0 px-5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                          >
                            {tipo === "ingreso" ? "Ingresos" : "Gastos"}
                          </td>
                        </tr>
                        {(tipo === "ingreso" ? report.ingresoKeys : report.gastoKeys).map((slug) => {
                          const values = report.byCategory[tipo].get(slug)!;
                          const cat = lookup(tipo, slug);
                          return (
                            <tr key={slug} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="sticky left-0 z-10 bg-card px-5 py-2 whitespace-nowrap">
                                <span className="inline-flex items-center gap-2">
                                  <span className="size-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                  {cat.nombre}
                                </span>
                              </td>
                              {values.map((v, i) => cell(v, i))}
                              <td className="px-5 py-2 text-right font-medium tabular">{formatMoney(report.sum(values), moneda)}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-b">
                          <td className="sticky left-0 z-10 bg-card px-5 py-2 font-semibold">
                            Total {tipo === "ingreso" ? "ingresos" : "gastos"}
                          </td>
                          {report.totals[tipo].map((v, i) => cell(v, i, { strong: true }))}
                          <td className="px-5 py-2 text-right font-semibold tabular">
                            {formatMoney(tipo === "ingreso" ? report.totalIngresos : report.totalGastos, moneda)}
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                    <tr className="bg-brand/5">
                      <td className="sticky left-0 z-10 bg-card px-5 py-2.5 font-semibold">Utilidad</td>
                      {report.utilidad.map((v, i) => cell(v, i, { strong: true, signed: true }))}
                      <td className={cn("px-5 py-2.5 text-right font-semibold tabular", report.totalUtilidad < 0 && "text-destructive")}>
                        {formatMoney(report.totalUtilidad, moneda)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
