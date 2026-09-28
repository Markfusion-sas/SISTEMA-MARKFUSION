"use client";

import { AlarmClock, CalendarClock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { diffDaysISO, formatMoney } from "@/lib/format";
import { SrTable, TooltipBox, TooltipRow, axisMoney, useChartTheme, type TooltipLike } from "@/components/charts/chart-kit";
import { Skeleton } from "@/components/ui/skeleton";

interface Bucket {
  key: string;
  label: string;
  detail: string;
  overdue: boolean;
  value: number;
  count: number;
}

const HEIGHT = 220;

/**
 * Antigüedad de la cartera: cuánto está vencido y cuánto viene en los próximos días.
 * Lo vencido usa colores de estado (con ícono y texto); lo que viene, el azul de serie.
 */
export function AgingChart({
  receivables,
  today,
}: {
  receivables: { monto: number; fecha_vencimiento: string }[];
  today: string;
}) {
  const { mounted, ink, series, status } = useChartTheme();

  const buckets: Bucket[] = [
    { key: "v30", label: "Vencido +30", detail: "Vencido hace más de 30 días", overdue: true, value: 0, count: 0 },
    { key: "v1", label: "Vencido 1–30", detail: "Vencido hace 1 a 30 días", overdue: true, value: 0, count: 0 },
    { key: "p30", label: "Próx. 30 días", detail: "Vence hoy o en los próximos 30 días", overdue: false, value: 0, count: 0 },
    { key: "p60", label: "31–60 días", detail: "Vence en 31 a 60 días", overdue: false, value: 0, count: 0 },
    { key: "p61", label: "+60 días", detail: "Vence en más de 60 días", overdue: false, value: 0, count: 0 },
  ];

  for (const r of receivables) {
    const diff = diffDaysISO(today, r.fecha_vencimiento);
    const bucket = diff < -30 ? buckets[0] : diff < 0 ? buckets[1] : diff <= 30 ? buckets[2] : diff <= 60 ? buckets[3] : buckets[4];
    bucket.value += Number(r.monto);
    bucket.count += 1;
  }

  const fillOf = (b: Bucket) => (b.key === "v30" ? status.critical : b.key === "v1" ? status.serious : series[0]);
  const overdueTotal = buckets.filter((b) => b.overdue).reduce((s, b) => s + b.value, 0);
  const upcomingTotal = buckets.filter((b) => !b.overdue).reduce((s, b) => s + b.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <AlarmClock className="size-4" style={{ color: status.critical }} aria-hidden />
          <span className="text-muted-foreground">Vencido</span>
          <span className="font-semibold">{formatMoney(overdueTotal, "COP", { compact: true })}</span>
        </span>
        <span className="flex items-center gap-2">
          <CalendarClock className="size-4" style={{ color: series[0] }} aria-hidden />
          <span className="text-muted-foreground">Por vencer</span>
          <span className="font-semibold">{formatMoney(upcomingTotal, "COP", { compact: true })}</span>
        </span>
      </div>

      {!mounted ? (
        <Skeleton className="w-full" style={{ height: HEIGHT }} />
      ) : (
        <div style={{ height: HEIGHT }} aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} barCategoryGap="32%" margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={ink.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: ink.grid }} tick={{ fill: ink.axis, fontSize: 11 }} tickMargin={8} interval={0} />
              <YAxis width={58} tickLine={false} axisLine={false} tick={{ fill: ink.axis, fontSize: 11 }} tickFormatter={axisMoney} />
              <Tooltip
                cursor={{ fill: ink.cursor }}
                content={(props) => <AgingTooltip active={props.active} payload={props.payload} fillOf={fillOf} />}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {buckets.map((b) => (
                  <Cell key={b.key} fill={fillOf(b)} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: unknown) => (Number(v) > 0 ? formatMoney(Number(v), "COP", { compact: true }) : "")}
                  style={{ fill: ink.text, fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <SrTable
        caption="Antigüedad de las cuentas por cobrar"
        headers={["Tramo", "Monto", "Cobros"]}
        rows={buckets.map((b) => [b.detail, formatMoney(b.value), b.count])}
      />
    </div>
  );
}

function AgingTooltip({ active, payload, fillOf }: TooltipLike & { fillOf: (b: Bucket) => string }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload as Bucket;
  return (
    <TooltipBox title={b.detail}>
      <TooltipRow color={fillOf(b)} label={`${b.count} ${b.count === 1 ? "cobro" : "cobros"}`} value={formatMoney(b.value)} strong />
    </TooltipBox>
  );
}
