import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Métrica compacta para fichas de detalle. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "brand";
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-card", className)}>
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        {Icon && (
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-md",
              tone === "default" && "bg-muted text-muted-foreground",
              tone === "brand" && "bg-brand/10 text-brand",
              tone === "success" && "bg-success/10 text-success",
              tone === "warning" && "bg-warning/10 text-warning",
              tone === "danger" && "bg-destructive/10 text-destructive",
            )}
          >
            <Icon className="size-3.5" />
          </span>
        )}
        {label}
      </div>
      <div
        className={cn(
          "mt-2 truncate text-xl font-semibold tracking-tight tabular",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
