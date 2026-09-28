"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export interface PLPoint {
  label: string;
  ingresos: number;
  gastos: number;
  utilidad: number;
}

const HEIGHT = 300;

/**
 * P&L mes a mes: barras de ingresos y gastos + línea de utilidad.
 * Las tres series están en la misma unidad (dinero), así que comparten un solo eje.
 */
export function PLChart({ data, moneda }: { data: PLPoint[]; moneda: Moneda }) {
  const { mounted, series, ink } = useChartTheme();
  const colors = { ingresos: series[0], gastos: series[1], utilidad: series[2] };
  const hasNegative = data.some((d) => d.utilidad < 0);

  return (
    <div className="space-y-4">
      <ChartLegend
        items={[
          { key: "ingresos", label: "Ingresos", color: colors.ingresos },
          { key: "gastos", label: "Gastos", color: colors.gastos },
          { key: "utilidad", label: "Utilidad", color: colors.utilidad, shape: "line" },
        ]}
      />
      {!mounted ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <div style={{ height: HEIGHT }} aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} barGap={2} barCategoryGap="26%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={ink.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: ink.grid }} tick={{ fill: ink.axis, fontSize: 12 }} tickMargin={8} />
              <YAxis
                width={62}
                tickLine={false}
                axisLine={false}
                tick={{ fill: ink.axis, fontSize: 11 }}
                tickFormatter={(v: number) => formatMoney(v, moneda, { compact: true })}
              />
              {hasNegative && <ReferenceLine y={0} stroke={ink.axis} strokeWidth={1} />}
              <Tooltip
                cursor={{ fill: ink.cursor }}
                content={(props) => (
                  <PLTooltip active={props.active} payload={props.payload} label={props.label} colors={colors} moneda={moneda} />
                )}
              />
              <Bar dataKey="ingresos" fill={colors.ingresos} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="gastos" fill={colors.gastos} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Line
                type="monotone"
                dataKey="utilidad"
                stroke={colors.utilidad}
                strokeWidth={2}
                strokeLinecap="round"
                dot={{ r: 4, fill: colors.utilidad, stroke: ink.surface, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: colors.utilidad, stroke: ink.surface, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <SrTable
        caption={`Estado de resultados mensual en ${moneda}`}
        headers={["Mes", "Ingresos", "Gastos", "Utilidad"]}
        rows={data.map((d) => [d.label, formatMoney(d.ingresos, moneda), formatMoney(d.gastos, moneda), formatMoney(d.utilidad, moneda)])}
      />
    </div>
  );
}

function PLTooltip({
  active,
  payload,
  label,
  colors,
  moneda,
}: TooltipLike & { colors: Record<"ingresos" | "gastos" | "utilidad", string>; moneda: Moneda }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PLPoint;
  return (
    <TooltipBox title={label}>
      <TooltipRow color={colors.ingresos} label="Ingresos" value={formatMoney(p.ingresos, moneda)} />
      <TooltipRow color={colors.gastos} label="Gastos" value={formatMoney(p.gastos, moneda)} />
      <div className="border-t pt-1.5">
        <TooltipRow
          color={colors.utilidad}
          shape="line"
          label="Utilidad"
          value={<span className={p.utilidad < 0 ? "text-destructive" : ""}>{formatMoney(p.utilidad, moneda)}</span>}
          strong
        />
        {p.ingresos > 0 && (
          <div className="mt-1 text-right text-[11px] text-muted-foreground">Margen {formatPercent(p.utilidad / p.ingresos)}</div>
        )}
      </div>
    </TooltipBox>
  );
}
