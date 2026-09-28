import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Estado vacío con ilustración simple: el ícono del módulo dentro de
 * anillos concéntricos sobre una cuadrícula que se desvanece.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed text-center",
        compact ? "gap-3 px-6 py-10" : "gap-4 px-6 py-16 sm:py-20",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]"
        aria-hidden
      />
      <div className="relative" aria-hidden>
        <div className="absolute inset-0 -m-6 rounded-full bg-brand/15 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-full border border-dashed border-foreground/10">
          <div className="flex size-14 items-center justify-center rounded-full border border-foreground/10 bg-background/60">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lg shadow-brand/25">
              <Icon className="size-5" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>
      <div className="relative max-w-sm space-y-1.5">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="relative mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
