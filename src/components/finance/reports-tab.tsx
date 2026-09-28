"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, TrendingDown, TrendingUp, Trophy, Wallet } from "lucide-react";
import { toast } from "sonner";

import type { Moneda, MovimientoTipo } from "@/types/database";
import { downloadCSV } from "@/lib/csv";
import { formatMoney, formatPercent, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MONTHS_SHORT, categoryLookup, type CategoryOption } from "@/components/finance/types";
import { PLChart, type PLPoint } from "@/components/charts/pl-chart";
import { StackedCategoryChart, type StackSeries } from "@/components/charts/stacked-category-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface YearTransaction {
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

type Matrix = Map<string, number[]>;

function emptyRow() {
  return Array.from({ length: 12 }, () => 0);
}

export function ReportsTab({
  transactions,
  year,
  currentYear,
  onYearChange,
  categories,
}: {
  transactions: YearTransaction[];
  year: number;
  currentYear: number;
  onYearChange: (year: number) => void;
  categories: CategoryOption[];
}) {
  const hasUsd = transactions.some((t) => t.moneda === "USD");
  const [moneda, setMoneda] = useState<Moneda>("COP");
  const lookup = useMemo(() => categoryLookup(categories), [categories]);
  const currentMonthIndex = year === currentYear ? Number(todayISO().slice(5, 7)) - 1 : year < currentYear ? 11 : -1;

  const report = useMemo(() => {
    const rows = transactions.filter((t) => t.moneda === moneda);
    const byCategory: Record<MovimientoTipo, Matrix> = { ingreso: new Map(), gasto: new Map() };
    const totals = { ingreso: emptyRow(), gasto: emptyRow() };

    for (const t of rows) {
      const month = Number(t.fecha.slice(5, 7)) - 1;
      const matrix = byCategory[t.tipo];
      if (!matrix.has(t.categoria)) matrix.set(t.categoria, emptyRow());
      matrix.get(t.categoria)![month] += Number(t.monto);
      totals[t.tipo][month] += Number(t.monto);
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
      yearIngresos: sum(totals.ingreso),
      yearGastos: sum(totals.gasto),
      yearUtilidad: sum(utilidad),
      best: rows.length ? { index: bestIndex, value: utilidad[bestIndex] } : null,
      count: rows.length,
      sum,
    };
  }, [transactions, moneda, categories]);

  const maxAbs = Math.max(1, ...report.totals.ingreso, ...report.totals.gasto);
  const monthsShown = Math.max(0, currentMonthIndex + 1);

  const plData: PLPoint[] = MONTHS_SHORT.slice(0, monthsShown).map((label, i) => ({
    label,
    ingresos: report.totals.ingreso[i],
    gastos: report.totals.gasto[i],
    utilidad: report.utilidad[i],
  }));

  // Series del apilado: las 5 categorías de gasto más grandes del año + "Otras".
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
    const data = MONTHS_SHORT.slice(0, monthsShown).map((label, i) => {
      const row: { label: string } & Record<string, number | string> = { label };
      for (const c of main) row[c.slug] = report.byCategory.gasto.get(c.slug)![i];
      if (others.length) row.__otras = others.reduce((s, c) => s + report.byCategory.gasto.get(c.slug)![i], 0);
      return row;
    });
    return { series, data };
  }, [report, lookup, monthsShown]);

  const exportPL = () => {
    const header = ["Concepto", ...MONTHS_SHORT, "Total"];
    const line = (label: string, values: number[]) => [label, ...values, report.sum(values)];
    const rows = [
      [`P&L ${year} · ${moneda}`],
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
    downloadCSV(`markfusion-pyg-${year}-${moneda.toLowerCase()}`, rows);
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
    downloadCSV(`markfusion-movimientos-${year}`, rows);
    toast.success(`${transactions.length} movimientos exportados a CSV`);
  };

  const cell = (value: number, i: number, opts: { strong?: boolean; signed?: boolean } = {}) => {
    const future = i > currentMonthIndex;
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-0.5 shadow-xs">
            <Button variant="ghost" size="icon-sm" onClick={() => onYearChange(year - 1)} aria-label="Año anterior">
              <ChevronLeft />
            </Button>
            <span className="min-w-16 text-center text-sm font-semibold tabular">{year}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onYearChange(year + 1)}
              disabled={year >= currentYear}
              aria-label="Año siguiente"
            >
              <ChevronRight />
            </Button>
          </div>
          {hasUsd && (
            <div className="inline-flex rounded-lg bg-muted p-[3px]">
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
        <StatCard label={`Ingresos ${year}`} icon={TrendingUp} tone="success" value={formatMoney(report.yearIngresos, moneda)} />
        <StatCard label={`Gastos ${year}`} icon={TrendingDown} value={formatMoney(report.yearGastos, moneda)} />
        <StatCard
          label={`Utilidad ${year}`}
          icon={Wallet}
          tone={report.yearUtilidad < 0 ? "danger" : "brand"}
          value={formatMoney(report.yearUtilidad, moneda)}
          hint={report.yearIngresos ? `Margen ${formatPercent(report.yearUtilidad / report.yearIngresos)}` : undefined}
        />
        <StatCard
          label="Mejor mes"
          icon={Trophy}
          value={report.best ? MONTHS_LONG[report.best.index] : "—"}
          hint={report.best ? `Utilidad ${formatMoney(report.best.value, moneda)}` : "Sin datos"}
        />
      </div>

      {report.count === 0 ? (
        <EmptyState
          compact
          icon={FileSpreadsheet}
          title={`Sin movimientos en ${moneda} durante ${year}`}
          description="Cuando registres ingresos y gastos, aquí verás el estado de resultados mes a mes."
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
                    Sin gastos en {year}.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumen mensual */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>P&amp;L mensual</CardTitle>
              <CardDescription>Ingresos, gastos y utilidad de cada mes en {moneda}.</CardDescription>
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
                    {MONTHS_LONG.map((label, i) => {
                      if (i > currentMonthIndex) return null;
                      const ing = report.totals.ingreso[i];
                      const gas = report.totals.gasto[i];
                      const util = report.utilidad[i];
                      return (
                        <tr key={label} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-5 py-2.5 font-medium">{label}</td>
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
                      <td className="px-5 py-2.5">Total {year}</td>
                      <td className="px-3 py-2.5 text-right text-success tabular">{formatMoney(report.yearIngresos, moneda)}</td>
                      <td className="px-3 py-2.5 text-right tabular">{formatMoney(report.yearGastos, moneda)}</td>
                      <td className={cn("px-3 py-2.5 text-right tabular", report.yearUtilidad < 0 && "text-destructive")}>
                        {formatMoney(report.yearUtilidad, moneda)}
                      </td>
                      <td className="hidden px-3 py-2.5 text-right text-muted-foreground tabular sm:table-cell">
                        {report.yearIngresos ? formatPercent(report.yearUtilidad / report.yearIngresos) : "—"}
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
                <table className="w-full min-w-[1100px] text-[13px]">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="sticky left-0 z-10 bg-card px-5 py-2 text-left font-medium">Concepto</th>
                      {MONTHS_SHORT.map((m) => (
                        <th key={m} className="px-3 py-2 text-right font-medium">
                          {m}
                        </th>
                      ))}
                      <th className="px-5 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["ingreso", "gasto"] as const).map((tipo) => (
                      <Fragment key={tipo}>
                        <tr className="bg-muted/30">
                          <td colSpan={14} className="sticky left-0 px-5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
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
                            {formatMoney(tipo === "ingreso" ? report.yearIngresos : report.yearGastos, moneda)}
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                    <tr className="bg-brand/5">
                      <td className="sticky left-0 z-10 bg-card px-5 py-2.5 font-semibold">Utilidad</td>
                      {report.utilidad.map((v, i) => cell(v, i, { strong: true, signed: true }))}
                      <td className={cn("px-5 py-2.5 text-right font-semibold tabular", report.yearUtilidad < 0 && "text-destructive")}>
                        {formatMoney(report.yearUtilidad, moneda)}
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
