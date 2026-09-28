"use client";

import { useId } from "react";

import { useChartTheme } from "@/components/charts/chart-kit";

/**
 * Mini tendencia para las tarjetas de KPI: línea en gris de contexto y el
 * periodo actual resaltado con un punto en el color de acento.
 */
export function Sparkline({ values, label, height = 36 }: { values: number[]; label: string; height?: number }) {
  const { mounted, ink, series } = useChartTheme();
  const id = useId();

  if (!mounted || values.length < 2) return <div style={{ height }} aria-hidden />;

  const width = 120;
  const pad = 4;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);

  const points = values.map((v, i) => [x(i), y(v)] as const);
  const line = points.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${height - pad} L${x(0).toFixed(1)},${height - pad} Z`;
  const [lx, ly] = points[points.length - 1];
  const zeroY = y(0);

  return (
    <div className="relative w-full" style={{ height }}>
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="absolute inset-0 size-full overflow-visible"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ink.muted} stopOpacity="0.16" />
          <stop offset="1" stopColor={ink.muted} stopOpacity="0" />
        </linearGradient>
      </defs>
      {min < 0 && <line x1={pad} x2={width - pad} y1={zeroY} y2={zeroY} stroke={ink.grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      <path d={area} fill={`url(#spark-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={ink.muted}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.8}
      />
    </svg>
      {/* Punto del periodo actual: en HTML para que siga redondo aunque el SVG se estire */}
      <span
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${(lx / width) * 100}%`,
          top: ly,
          backgroundColor: series[0],
          boxShadow: `0 0 0 2px ${ink.surface}`,
        }}
        aria-hidden
      />
    </div>
  );
}
