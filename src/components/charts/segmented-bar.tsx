"use client";

import type { Moneda } from "@/types/database";
import { formatMoney, formatPercent } from "@/lib/format";
import { useChartTheme } from "@/components/charts/chart-kit";

/**
 * Medidor del cobro de un proyecto: cobrado, pendiente programado y sin programar
 * sobre el valor total. Los dos tramos usan pasos del mismo azul (más oscuro = ya
 * cobrado) y el resto es la pista neutra.
 */
export function SegmentedBar({
  cobrado,
  programado,
  total,
  moneda,
}: {
  cobrado: number;
  programado: number;
  total: number;
  moneda: Moneda;
}) {
  const { series, dark } = useChartTheme();
  const base = Math.max(total, cobrado + programado, 1);
  const sinProgramar = Math.max(0, total - cobrado - programado);
  const colors = { cobrado: series[0], programado: dark ? "#1c5cab" : "#86b6ef" };

  const segments = [
    { key: "cobrado", label: "Cobrado", value: cobrado, color: colors.cobrado },
    { key: "programado", label: "Por cobrar", value: programado, color: colors.programado },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-3">
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-foreground/[0.07]"
        role="img"
        aria-label={`Cobrado ${formatMoney(cobrado, moneda)}, por cobrar ${formatMoney(programado, moneda)}, sin programar ${formatMoney(sinProgramar, moneda)} de ${formatMoney(total, moneda)}`}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full transition-[width] duration-700 ease-out"
            style={{ width: `${(s.value / base) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: ${formatMoney(s.value, moneda)}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: "Cobrado", value: cobrado, color: colors.cobrado },
          { label: "Por cobrar", value: programado, color: colors.programado },
          { label: "Sin programar", value: sinProgramar, color: undefined },
        ].map((item) => (
          <div key={item.label} className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className={item.color ? "size-2 shrink-0 rounded-[2px]" : "size-2 shrink-0 rounded-[2px] bg-foreground/15"}
                style={item.color ? { backgroundColor: item.color } : undefined}
              />
              {item.label}
            </div>
            <div className="font-semibold tabular">{formatMoney(item.value, moneda, { compact: true })}</div>
            <div className="text-muted-foreground tabular">{total ? formatPercent(item.value / total) : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
