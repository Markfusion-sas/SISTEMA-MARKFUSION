"use client";

import { useState } from "react";

import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SrTable, useChartTheme } from "@/components/charts/chart-kit";

export interface CategoryValue {
  key: string;
  nombre: string;
  color: string;
  value: number;
}

/**
 * Barras horizontales por categoría, de mayor a menor. Cada barra lleva el color
 * de su categoría (el mismo en toda la app) y siempre muestra monto y porcentaje.
 * Más de `max` categorías se agrupan en "Otras".
 */
export function CategoryBars({
  items,
  max = 6,
  caption,
  emptyText = "Sin datos para mostrar.",
}: {
  items: CategoryValue[];
  max?: number;
  caption: string;
  emptyText?: string;
}) {
  const { color, neutral } = useChartTheme();
  const [hovered, setHovered] = useState<string | null>(null);

  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, max - (sorted.length > max ? 1 : 0));
  const rest = sorted.slice(head.length);
  const rows = rest.length
    ? [...head, { key: "__otras", nombre: `Otras (${rest.length})`, color: neutral, value: rest.reduce((s, r) => s + r.value, 0) }]
    : head;

  const total = rows.reduce((s, r) => s + r.value, 0);
  const top = rows[0]?.value ?? 0;

  if (!rows.length) {
    return <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div>
      <ul className="space-y-3">
        {rows.map((row) => {
          const pct = total ? row.value / total : 0;
          const fill = row.key === "__otras" ? neutral : color(row.color);
          return (
            <li
              key={row.key}
              onMouseEnter={() => setHovered(row.key)}
              onMouseLeave={() => setHovered(null)}
              className={cn("transition-opacity", hovered && hovered !== row.key && "opacity-45")}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: fill }} aria-hidden />
                  <span className="truncate text-muted-foreground">{row.nombre}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="font-semibold tabular">{formatMoney(row.value, "COP", { compact: true })}</span>
                  <span className="w-11 text-right text-xs text-muted-foreground tabular">{formatPercent(pct)}</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${top ? Math.max(2, (row.value / top) * 100) : 0}%`, backgroundColor: fill }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <SrTable
        caption={caption}
        headers={["Categoría", "Monto", "Porcentaje"]}
        rows={rows.map((r) => [r.nombre, formatMoney(r.value), total ? formatPercent(r.value / total) : "0 %"])}
      />
    </div>
  );
}
