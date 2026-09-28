"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Moneda } from "@/types/database";
import { formatMoney, formatPercent } from "@/lib/format";
import {
  ChartLegend,
  SrTable,
  TooltipBox,
  TooltipRow,
  useChartTheme,
  type TooltipLike,
} from "@/components/charts/chart-kit";
import { Skeleton } from "@/components/ui/skeleton";

export interface StackSeries {
  key: string;
  nombre: string;
  color: string;
}

const HEIGHT = 280;

/**
 * Gastos por categoría mes a mes (barras apiladas: parte del todo en el tiempo).
 * Máximo 6 series; el resto se agrupa en "Otras" antes de llegar aquí.
 */
export function StackedCategoryChart({
  data,
  series: seriesDef,
  moneda,
}: {
  data: ({ label: string } & Record<string, number | string>)[];
  series: StackSeries[];
  moneda: Moneda;
}) {
  const { mounted, ink, color } = useChartTheme();
  const colored = seriesDef.map((s) => ({ ...s, fill: color(s.color) }));
  const totals = colored.map((s) => ({ ...s, total: data.reduce((acc, d) => acc + Number(d[s.key] ?? 0), 0) }));

  return (
    <div className="space-y-4">
      <ChartLegend
        items={totals.map((s) => ({
          key: s.key,
          label: s.nombre,
          color: s.fill,
          value: formatMoney(s.total, moneda, { compact: true }),
        }))}
      />
      {!mounted ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <div style={{ height: HEIGHT }} aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={ink.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: ink.grid }} tick={{ fill: ink.axis, fontSize: 12 }} tickMargin={8} />
              <YAxis
                width={62}
                tickLine={false}
                axisLine={false}
                tick={{ fill: ink.axis, fontSize: 11 }}
                tickFormatter={(v: number) => formatMoney(v, moneda, { compact: true })}
              />
              <Tooltip
                cursor={{ fill: ink.cursor }}
                content={(props) => (
                  <StackTooltip active={props.active} payload={props.payload} label={props.label} series={colored} moneda={moneda} />
                )}
              />
              {colored.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="gastos"
                  fill={s.fill}
                  stroke={ink.surface}
                  strokeWidth={2}
                  maxBarSize={28}
                  radius={i === colored.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <SrTable
        caption={`Gastos por categoría y mes en ${moneda}`}
        headers={["Mes", ...seriesDef.map((s) => s.nombre)]}
        rows={data.map((d) => [String(d.label), ...seriesDef.map((s) => formatMoney(Number(d[s.key] ?? 0), moneda))])}
      />
    </div>
  );
}

function StackTooltip({
  active,
  payload,
  label,
  series,
  moneda,
}: TooltipLike & { series: (StackSeries & { fill: string })[]; moneda: Moneda }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Record<string, number>;
  const total = series.reduce((s, x) => s + Number(row[x.key] ?? 0), 0);
  const visible = [...series].reverse().filter((s) => Number(row[s.key] ?? 0) > 0);
  return (
    <TooltipBox title={label}>
      {visible.map((s) => (
        <TooltipRow
          key={s.key}
          color={s.fill}
          label={s.nombre}
          value={
            <>
              {formatMoney(row[s.key], moneda)}
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{formatPercent(row[s.key] / total)}</span>
            </>
          }
        />
      ))}
      <div className="border-t pt-1.5">
        <TooltipRow label="Total gastos" value={formatMoney(total, moneda)} strong />
      </div>
    </TooltipBox>
  );
}
