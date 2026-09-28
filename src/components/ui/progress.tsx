import { cn } from "@/lib/utils";

/** Barra de avance (0 a 100). */
function Progress({
  value,
  className,
  indicatorClassName,
  ...props
}: React.ComponentProps<"div"> & { value: number; indicatorClassName?: string }) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", indicatorClassName ?? "bg-brand-gradient")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Progress };
