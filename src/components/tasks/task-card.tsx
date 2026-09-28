"use client";

import { forwardRef } from "react";
import { AlignLeft, CalendarDays, Video } from "lucide-react";

import type { Profile } from "@/types/database";
import { formatRelativeDay, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PRIORITY_DOT, type TaskRow } from "@/components/tasks/types";

type CardProps = {
  task: TaskRow;
  responsable: Profile | null;
  dragging?: boolean;
  overlay?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

/** Tarjeta del kanban. Se usa tanto en la columna como en el overlay de arrastre. */
export const TaskCard = forwardRef<HTMLDivElement, CardProps>(function TaskCard(
  { task, responsable, dragging, overlay, className, ...props },
  ref,
) {
  const done = task.estado === "hecha";
  const today = todayISO();
  const overdue = !done && task.fecha_limite !== null && task.fecha_limite < today;
  const dueToday = !done && task.fecha_limite === today;
  const projectLabel = task.project?.nombre ?? "Interna";

  return (
    <div
      ref={ref}
      className={cn(
        "group relative cursor-grab touch-manipulation rounded-xl border bg-card p-3 text-left shadow-card transition-[border-color,box-shadow,opacity] select-none active:cursor-grabbing",
        "hover:border-foreground/15",
        dragging && "opacity-35",
        overlay && "rotate-[1.5deg] scale-[1.03] cursor-grabbing border-brand/40 shadow-float",
        className,
      )}
      {...props}
    >
      {responsable && (
        <span
          className="absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full"
          style={{ backgroundColor: responsable.color }}
          aria-hidden
        />
      )}
      <div className="flex items-start gap-2 pl-1">
        <span
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", PRIORITY_DOT[task.prioridad])}
          title={`Prioridad ${task.prioridad}`}
        />
        <p className={cn("line-clamp-3 flex-1 text-[13.5px] leading-snug font-medium", done && "text-muted-foreground line-through")}>
          {task.titulo}
        </p>
      </div>

      <div className="mt-1.5 truncate pl-5 text-xs text-muted-foreground">
        {projectLabel}
        {task.project?.client ? ` · ${task.project.client.empresa || task.project.client.nombre}` : ""}
      </div>

      <div className="mt-3 flex items-center gap-2 pl-5">
        {task.fecha_limite && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              overdue && "bg-destructive/10 text-destructive",
              dueToday && "bg-warning/15 text-warning",
              !overdue && !dueToday && "bg-muted text-muted-foreground",
            )}
          >
            <CalendarDays className="size-3" />
            {formatRelativeDay(task.fecha_limite)}
          </span>
        )}
        {task.meeting && (
          <span className="text-muted-foreground" title={`De la reunión: ${task.meeting.titulo}`}>
            <Video className="size-3.5" />
          </span>
        )}
        {task.descripcion && (
          <span className="text-muted-foreground" title="Tiene descripción">
            <AlignLeft className="size-3.5" />
          </span>
        )}
        <span className="ml-auto">
          <UserAvatar profile={responsable} className="size-6 text-[10px]" />
        </span>
      </div>
    </div>
  );
});
