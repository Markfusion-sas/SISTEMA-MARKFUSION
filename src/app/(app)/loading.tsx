import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border bg-card p-5 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
