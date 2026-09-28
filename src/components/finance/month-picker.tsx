"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { capitalize, formatDate, shiftMonth } from "@/lib/format";
import { Button } from "@/components/ui/button";

/** Selector de mes "‹ Septiembre de 2026 ›". `month` en formato YYYY-MM. */
export function MonthPicker({
  month,
  onChange,
  max,
}: {
  month: string;
  onChange: (month: string) => void;
  max?: string;
}) {
  const label = capitalize(formatDate(`${month}-15`, "monthYear"));
  const nextDisabled = max ? shiftMonth(month, 1) > max : false;

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-0.5 shadow-xs">
      <Button variant="ghost" size="icon-sm" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mes anterior">
        <ChevronLeft />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium">{label}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={nextDisabled}
        aria-label="Mes siguiente"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
