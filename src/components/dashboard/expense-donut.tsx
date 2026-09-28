"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

import { themedColor } from "@/lib/chart-palette";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartTheme, type TooltipLike } from "@/components/charts/chart-kit";

export interface CategorySlice {
  slug: string;
  nombre: string;
  color: string;
  value: number;
}

const SIZE = 184;

/** Gastos del mes por categoría (dona, máximo 6 segmentos; el resto va a "Otros"). */
export function ExpenseDonut({ slices, monthLabel }: { slices: CategorySlice[]; monthLabel: string }) {
  const { mounted, dark, ink } = useChartTheme();
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((s, c) => s + c.value, 0);
  const data = slices.map((s) => ({ ...s, fill: themedColor(s.color, dark) }));
  const focused = data.find((d) => d.slug === active) ?? null;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Gastos por categoría</CardTitle>
        <CardDescription>{monthLabel} · COP</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            <PieIcon className="size-5" />
            Sin gastos registrados este mes.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
            <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
              {!mounted ? (
                <Skeleton className="size-full rounded-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="value"
                      nameKey="nombre"
                      innerRadius="66%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      stroke={ink.surface}
                      strokeWidth={2}
                      cornerRadius={4}
                      onMouseEnter={(_, index) => setActive(data[index]?.slug ?? null)}
                      onMouseLeave={() => setActive(null)}
                      isAnimationActive
                    >
                      {data.map((d) => (
                        <Cell key={d.slug} fill={d.fill} opacity={active && active !== d.slug ? 0.35 : 1} />
                      ))}
                    </Pie>
                    <Tooltip content={(props) => <DonutTooltip active={props.active} payload={props.payload} total={total} />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] text-muted-foreground">{focused ? focused.nombre : "Total"}</span>
                <span className="text-lg font-semibold tracking-tight">
                  {formatMoney(focused ? focused.value : total, "COP", { compact: true })}
                </span>
                {focused && <span className="text-[11px] text-muted-foreground">{formatPercent(focused.value / total)}</span>}
              </div>
            </div>

            {/* Leyenda con valores: identidad nunca solo por color */}
            <ul className="w-full min-w-0 space-y-1">
              {data.map((d) => (
                <li
                  key={d.slug}
                  onMouseEnter={() => setActive(d.slug)}
                  onMouseLeave={() => setActive(null)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active === d.slug && "bg-muted/60",
                  )}
                >
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: d.fill }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.nombre}</span>
                  <span className="font-medium tabular">{formatMoney(d.value, "COP", { compact: true })}</span>
                  <span className="w-11 text-right text-xs text-muted-foreground tabular">{formatPercent(d.value / total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <table className="sr-only">
          <caption>Gastos del mes por categoría</caption>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Monto</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.slug}>
                <td>{s.nombre}</td>
                <td>{formatMoney(s.value)}</td>
                <td>{total ? formatPercent(s.value / total) : "0 %"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function DonutTooltip({ active, payload, total }: TooltipLike & { total: number }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload as CategorySlice & { fill: string };
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-float">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <span className="size-2 rounded-[2px]" style={{ backgroundColor: slice.fill }} />
        {slice.nombre}
      </div>
      <div className="mt-1 text-muted-foreground">
        <span className="font-medium text-foreground tabular">{formatMoney(slice.value)}</span> ·{" "}
        {formatPercent(slice.value / total)}
      </div>
    </div>
  );
}
