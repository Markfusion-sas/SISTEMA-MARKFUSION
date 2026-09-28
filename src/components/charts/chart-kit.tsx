"use client";

import { useTheme } from "next-themes";

import { CHART_INK, NEUTRAL, SERIES_DARK, SERIES_LIGHT, STATUS, themedColor } from "@/lib/chart-palette";
import { formatMoney } from "@/lib/format";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

/** Colores de las gráficas según el tema activo (el modo oscuro tiene sus propios pasos). */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const dark = !mounted || resolvedTheme !== "light";
  return {
    mounted,
    dark,
    series: dark ? SERIES_DARK : SERIES_LIGHT,
    ink: dark ? CHART_INK.dark : CHART_INK.light,
    neutral: dark ? NEUTRAL.dark : NEUTRAL.light,
    status: STATUS,
    /** Color de una entidad (p. ej. categoría) ajustado al tema. */
    color: (hex: string) => themedColor(hex, dark),
  };
}

/** Lo mínimo que usan los tooltips propios (independiente de los genéricos de Recharts). */
export interface TooltipLike {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown; value?: unknown; dataKey?: unknown }>;
  label?: string | number;
}

/** Eje Y en dinero compacto: "$1,5 M". */
export const axisMoney = (v: number) => formatMoney(v, "COP", { compact: true });

/** Caja de tooltip con el estilo de la app. */
export function TooltipBox({ title, children, className }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-44 rounded-lg border bg-popover px-3 py-2.5 text-xs shadow-float", className)}>
      {title && <div className="mb-2 font-medium text-foreground">{title}</div>}
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

/** Fila de tooltip: muestra de color + nombre (texto neutro) + valor. */
export function TooltipRow({
  color,
  label,
  value,
  shape = "square",
  strong = false,
}: {
  color?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  shape?: "square" | "line";
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground">
        {color &&
          (shape === "line" ? (
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
          ) : (
            <span className="size-2 rounded-[2px]" style={{ backgroundColor: color }} />
          ))}
        {label}
      </span>
      <span className={cn("text-foreground tabular", strong ? "font-semibold" : "font-medium")}>{value}</span>
    </div>
  );
}

/** Leyenda (siempre presente con 2 o más series). El texto va en tinta neutra; el color lo lleva la muestra. */
export function ChartLegend({
  items,
  className,
}: {
  items: { key: string; label: string; color: string; value?: React.ReactNode; shape?: "square" | "line" }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-x-5 gap-y-2", className)}>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2 text-sm">
          {item.shape === "line" ? (
            <span className="h-[3px] w-3.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
          ) : (
            <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} aria-hidden />
          )}
          <span className="text-muted-foreground">{item.label}</span>
          {item.value !== undefined && <span className="font-semibold">{item.value}</span>}
        </div>
      ))}
    </div>
  );
}

/** Tabla solo para lectores de pantalla: toda gráfica tiene su equivalente accesible. */
export function SrTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Estado vacío de gráfica, con la misma altura que ocuparía la gráfica. */
export function ChartEmpty({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground"
      style={{ height }}
    >
      {children}
    </div>
  );
}
