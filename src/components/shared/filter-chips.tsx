"use client";

import { cn } from "@/lib/utils";

export interface FilterChip<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Filtros tipo "pastilla" con contador. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: FilterChip<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pb-1 sm:pb-0", className)} role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "border-foreground/15 bg-foreground text-background"
                : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn("tabular text-xs", active ? "text-background/70" : "text-muted-foreground/70")}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
