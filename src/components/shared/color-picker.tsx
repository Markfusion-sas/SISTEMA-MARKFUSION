"use client";

import { Check } from "lucide-react";

import { USER_COLORS } from "@/lib/constants";
import { cn, readableTextColor } from "@/lib/utils";

/** Selector de color: paleta sugerida + color libre. */
export function ColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  const normalized = value.toLowerCase();
  const isCustom = !USER_COLORS.includes(normalized as (typeof USER_COLORS)[number]);

  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Color">
      {USER_COLORS.map((color) => {
        const selected = normalized === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            disabled={disabled}
            onClick={() => onChange(color)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              selected && "ring-2 ring-foreground/70",
            )}
            style={{ backgroundColor: color }}
          >
            {selected && <Check className="size-3.5" style={{ color: readableTextColor(color) }} strokeWidth={3} />}
          </button>
        );
      })}
      <label
        className={cn(
          "relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-foreground/30 ring-offset-2 ring-offset-background transition-transform hover:scale-110",
          isCustom && "border-solid ring-2 ring-foreground/70",
        )}
        style={isCustom ? { backgroundColor: normalized } : undefined}
        title="Color personalizado"
      >
        {!isCustom && <span className="text-xs text-muted-foreground">+</span>}
        <input
          type="color"
          value={normalized}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Color personalizado"
        />
      </label>
    </div>
  );
}
