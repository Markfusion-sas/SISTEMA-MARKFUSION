import Link from "next/link";
import { Video } from "lucide-react";

import type { Meeting } from "@/types/database";
import { REUNION_ESTADOS, REUNION_TIPOS } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";

export type MeetingItem = Pick<Meeting, "id" | "titulo" | "tipo" | "estado" | "fecha_inicio" | "fecha_fin" | "link">;

/** Lista cronológica de reuniones (próximas primero, luego las pasadas). */
export function MeetingList({ meetings }: { meetings: MeetingItem[] }) {
  if (meetings.length === 0) {
    return (
      <EmptyState
        compact
        icon={Video}
        title="Sin reuniones"
        description="Las reuniones ligadas aparecerán aquí con su fecha y estado."
      />
    );
  }

  const now = new Date().toISOString();
  const upcoming = meetings.filter((m) => m.fecha_inicio >= now).sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  const past = meetings.filter((m) => m.fecha_inicio < now).sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));

  return (
    <div className="space-y-5">
      {[
        { label: "Próximas", items: upcoming },
        { label: "Anteriores", items: past },
      ]
        .filter((g) => g.items.length)
        .map((group) => (
          <div key={group.label} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">{group.label}</h4>
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {group.items.map((m) => (
                <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                  <div
                    className={cn(
                      "flex w-12 shrink-0 flex-col items-center rounded-lg border py-1 text-center",
                      group.label === "Próximas" ? "border-brand/30 bg-brand/5" : "bg-muted/30",
                    )}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">
                      {formatDate(m.fecha_inicio, "monthYear").split(" ")[0].slice(0, 3)}
                    </span>
                    <span className="text-base leading-tight font-semibold tabular">
                      {new Intl.DateTimeFormat("es-CO", { day: "numeric", timeZone: "America/Bogota" }).format(
                        new Date(m.fecha_inicio),
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link href={`/reuniones/${m.id}`} className="block truncate text-sm font-medium hover:text-brand">
                      {m.titulo}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatTime(m.fecha_inicio)}
                        {m.fecha_fin ? ` – ${formatTime(m.fecha_fin)}` : ""}
                      </span>
                      <Badge tone={REUNION_TIPOS[m.tipo].tone} className="py-0 text-[11px]">
                        {REUNION_TIPOS[m.tipo].label}
                      </Badge>
                      {m.estado !== "programada" && (
                        <Badge tone={REUNION_ESTADOS[m.estado].tone} className="py-0 text-[11px]">
                          {REUNION_ESTADOS[m.estado].label}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {m.link && m.estado === "programada" && (
                    <a
                      href={m.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-medium text-brand hover:underline"
                    >
                      Unirse
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
