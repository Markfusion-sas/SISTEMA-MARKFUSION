"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight } from "lucide-react";

import { formatMoney } from "@/lib/format";
import {
  ChartEmpty,
  ChartLegend,
  SrTable,
  TooltipBox,
  TooltipRow,
  axisMoney,
  useChartTheme,
  type TooltipLike,
} from "@/components/charts/chart-kit";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface MonthPoint {
  key: string;
  label: string;
  ingresos: number;
  gastos: number;
}

const HEIGHT = 260;

/** Ingresos vs gastos de los últimos 6 meses (barras agrupadas, un solo eje). */
export function IncomeExpenseChart({ data }: { data: MonthPoint[] }) {
  const { mounted, series, ink } = useChartTheme();
  const colors = { ingresos: series[0], gastos: series[1] };
  const totals = data.reduce(
    (acc, d) => ({ ingresos: acc.ingresos + d.ingresos, gastos: acc.gastos + d.gastos }),
    { ingresos: 0, gastos: 0 },
  );
  const empty = totals.ingresos === 0 && totals.gastos === 0;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Ingresos vs gastos</CardTitle>
        <CardDescription>Últimos 6 meses · COP</CardDescription>
        <CardAction>
          <Link
            href="/finanzas?tab=reportes"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver reporte
            <ArrowUpRight className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartLegend
          items={[
            { key: "ingresos", label: "Ingresos", color: colors.ingresos, value: formatMoney(totals.ingresos, "COP", { compact: true }) },
            { key: "gastos", label: "Gastos", color: colors.gastos, value: formatMoney(totals.gastos, "COP", { compact: true }) },
          ]}
        />

        {!mounted ? (
          <Skeleton className="w-full" style={{ height: HEIGHT }} />
        ) : empty ? (
          <ChartEmpty height={HEIGHT}>Aún no hay movimientos en los últimos 6 meses.</ChartEmpty>
        ) : (
          <div style={{ height: HEIGHT }} aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={ink.grid} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: ink.grid }} tick={{ fill: ink.axis, fontSize: 12 }} tickMargin={8} />
                <YAxis width={58} tickLine={false} axisLine={false} tick={{ fill: ink.axis, fontSize: 11 }} tickFormatter={axisMoney} />
                <Tooltip
                  cursor={{ fill: ink.cursor }}
                  content={(props) => <MonthTooltip active={props.active} payload={props.payload} label={props.label} colors={colors} />}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill={colors.ingresos} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="gastos" name="Gastos" fill={colors.gastos} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <SrTable
          caption="Ingresos y gastos por mes en pesos colombianos"
          headers={["Mes", "Ingresos", "Gastos", "Utilidad"]}
          rows={data.map((d) => [d.label, formatMoney(d.ingresos), formatMoney(d.gastos), formatMoney(d.ingresos - d.gastos)])}
        />
      </CardContent>
    </Card>
  );
}

function MonthTooltip({ active, payload, label, colors }: TooltipLike & { colors: { ingresos: string; gastos: string } }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as MonthPoint;
  const utilidad = point.ingresos - point.gastos;
  return (
    <TooltipBox title={label}>
      <TooltipRow color={colors.ingresos} label="Ingresos" value={formatMoney(point.ingresos)} />
      <TooltipRow color={colors.gastos} label="Gastos" value={formatMoney(point.gastos)} />
      <div className="border-t pt-1.5">
        <TooltipRow label="Utilidad" value={<span className={utilidad < 0 ? "text-destructive" : ""}>{formatMoney(utilidad)}</span>} strong />
      </div>
    </TooltipBox>
  );
}
