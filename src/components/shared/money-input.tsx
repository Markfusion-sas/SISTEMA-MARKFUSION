"use client";

import * as React from "react";

import type { Moneda } from "@/types/database";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/**
 * Campo de dinero: muestra "1.500.000" mientras se escribe y entrega un número.
 */
export function MoneyInput({
  value,
  onChange,
  moneda = "COP",
  className,
  ...props
}: {
  value: number | null | undefined;
  onChange: (value: number) => void;
  moneda?: Moneda;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  const display = value ? fmt.format(value) : "";

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        {moneda === "USD" ? "US$" : "$"}
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
          onChange(digits ? Number(digits) : 0);
        }}
        className={cn(
          "flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-3 text-sm shadow-xs tabular transition-[color,box-shadow,border-color] outline-none dark:bg-input/20",
          moneda === "USD" ? "pl-11" : "pl-7",
          "placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        placeholder="0"
        {...props}
      />
    </div>
  );
}
