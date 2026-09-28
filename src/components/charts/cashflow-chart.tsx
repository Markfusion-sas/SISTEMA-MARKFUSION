"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Moneda, MovimientoTipo } from "@/types/database";
import { capitalize, formatDate, formatMoney } from "@/lib/format";
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
import { Skeleton } from "@/components/ui/skeleton";

interface Point {
  day: number;
  date: string;
  ingresos: number;
  gastos: number;
}

const HEIGHT = 240;

/**
 * Flujo del mes: ingresos y gastos acumulados día a día.
 * Muestra hasta hoy si es el mes en curso; el mes completo si ya pasó.
 */
export function CashflowChart({
  transactions,
  month,
  today,
}: {
  transactions: { tipo: MovimientoTipo; monto: number; moneda: Moneda; fecha: string }[];
  month: string;
  today: string;
}) {
  const { mounted, series, ink } = useChartTheme();
  const colors = { ingresos: series[0], gastos: series[1] };

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const until = today.startsWith(month) ? Number(today.slice(8, 10)) : lastDay;

  const daily = new Map<number, { ingresos: number; gastos: number }>();
  for (const t of transactions) {
    if (t.moneda !== "COP" || !t.fecha.startsWith(month)) continue;
    const day = Number(t.fecha.slice(8, 10));
    const entry = daily.get(day) ?? { ingresos: 0, gastos: 0 };
    if (t.tipo === "ingreso") entry.ingresos += Number(t.monto);
    else entry.gastos += Number(t.monto);
    daily.set(day, entry);
  }

  let accIngresos = 0;
  let accGastos = 0;
  const data: Point[] = Array.from({ length: until }, (_, i) => {
    const day = i + 1;
    const entry = daily.get(day);
    accIngresos += entry?.ingresos ?? 0;
    accGastos += entry?.gastos ?? 0;
    return { day, date: `${month}-${String(day).padStart(2, "0")}`, ingresos: accIngresos, gastos: accGastos };
  });

  const balance = accIngresos - accGastos;
  const empty = accIngresos === 0 && accGastos === 0;

  return (
    <div className="space-y-4">
      <ChartLegend
        items={[
          { key: "ingresos", label: "Ingresos acumulados", color: colors.ingresos, value: formatMoney(accIngresos, "COP", { compact: true }), shape: "line" },
          { key: "gastos", label: "Gastos acumulados", color: colors.gastos, value: formatMoney(accGastos, "COP", { compact: true }), shape: "line" },
        ]}
      />
      <p className="-mt-2 text-xs text-muted-foreground">
        Balance del periodo:{" "}
        <span className={balance < 0 ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
          {formatMoney(balance, "COP", { signed: true })}
        </span>
        {balance >= 0 ? " · los ingresos van por encima de los gastos" : " · los gastos superan a los ingresos"}
      </p>

      {!mounted ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : empty ? (
        <ChartEmpty height={HEIGHT}>Registra ingresos o gastos para ver el flujo del mes.</ChartEmpty>
      ) : (
        <div style={{ height: HEIGHT }} aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={ink.grid} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: ink.grid }}
                tick={{ fill: ink.axis, fontSize: 11 }}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis width={58} tickLine={false} axisLine={false} tick={{ fill: ink.axis, fontSize: 11 }} tickFormatter={axisMoney} />
              <Tooltip
                cursor={{ stroke: ink.axis, strokeWidth: 1 }}
                content={(props) => <FlowTooltip active={props.active} payload={props.payload} colors={colors} />}
              />
              {(["ingresos", "gastos"] as const).map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[key]}
                  strokeWidth={2}
                  fill={colors[key]}
                  fillOpacity={0.1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4, fill: colors[key], stroke: ink.surface, strokeWidth: 2 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <SrTable
        caption="Ingresos y gastos acumulados por día"
        headers={["Día", "Ingresos acumulados", "Gastos acumulados"]}
        rows={data.filter((d) => daily.has(d.day)).map((d) => [formatDate(d.date, "month"), formatMoney(d.ingresos), formatMoney(d.gastos)])}
      />
    </div>
  );
}

function FlowTooltip({ active, payload, colors }: TooltipLike & { colors: { ingresos: string; gastos: string } }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <TooltipBox title={capitalize(formatDate(p.date, "weekday"))}>
      <TooltipRow color={colors.ingresos} shape="line" label="Ingresos" value={formatMoney(p.ingresos)} />
      <TooltipRow color={colors.gastos} shape="line" label="Gastos" value={formatMoney(p.gastos)} />
      <div className="border-t pt-1.5">
        <TooltipRow
          label="Balance"
          value={<span className={p.ingresos - p.gastos < 0 ? "text-destructive" : ""}>{formatMoney(p.ingresos - p.gastos)}</span>}
          strong
        />
      </div>
    </TooltipBox>
  );
}
