"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "light", label: "Claro", icon: Sun },
] as const;

export function Appearance() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = mounted ? theme : "dark";

  return (
    <div className="grid max-w-md grid-cols-2 gap-3">
      {THEMES.map(({ value, label, icon: Icon }) => {
        const selected = current === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTheme(value);
              toast.success(`Modo ${label.toLowerCase()} activado`);
            }}
            className={cn(
              "group overflow-hidden rounded-xl border text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
              selected ? "border-brand ring-1 ring-brand" : "hover:border-foreground/20",
            )}
            aria-pressed={selected}
          >
            <div className={cn("space-y-1.5 p-3", value === "dark" ? "bg-[#0b0b0f]" : "bg-[#f4f4f6]")}>
              <div className={cn("h-2 w-12 rounded-full", value === "dark" ? "bg-white/20" : "bg-black/15")} />
              <div className={cn("h-2 w-20 rounded-full", value === "dark" ? "bg-white/10" : "bg-black/10")} />
              <div className="flex gap-1.5 pt-1">
                <div className="h-6 w-6 rounded-md bg-brand" />
                <div className={cn("h-6 flex-1 rounded-md", value === "dark" ? "bg-white/[0.06]" : "bg-white")} />
              </div>
            </div>
            <div className="flex items-center gap-2 border-t px-3 py-2 text-sm font-medium">
              <Icon className="size-4 text-muted-foreground" />
              {label}
              {selected && <Check className="ml-auto size-4 text-brand" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
