"use client";

import { CheckCircle2, Circle, Video } from "lucide-react";

import type { Profile, TareaEstado } from "@/types/database";
import { TAREA_ESTADO_OPTIONS, TAREA_PRIORIDADES } from "@/lib/constants";
import { formatRelativeDay, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UserChip } from "@/components/shared/user-avatar";
import { PRIORITY_DOT, type TaskRow } from "@/components/tasks/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Fila de tarea para la vista lista y Mi día. */
export function TaskListRow({
  task,
  responsable,
  onToggle,
  onStatusChange,
  onOpen,
  showResponsable = true,
}: {
  task: TaskRow;
  responsable: Profile | null;
  onToggle: () => void;
  onStatusChange: (estado: TareaEstado) => void;
  onOpen: () => void;
  showResponsable?: boolean;
}) {
  const done = task.estado === "hecha";
  const today = todayISO();
  const overdue = !done && task.fecha_limite !== null && task.fecha_limite < today;
  const dueToday = !done && task.fecha_limite === today;

  return (
    <div
      className="group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:items-center"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) onOpen();
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="mt-0.5 shrink-0 rounded-full text-muted-foreground transition-colors outline-none hover:text-success focus-visible:ring-2 focus-visible:ring-ring/40 sm:mt-0"
        aria-label={done ? "Marcar como pendiente" : "Marcar como hecha"}
      >
        {done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[task.prioridad])} title={`Prioridad ${TAREA_PRIORIDADES[task.prioridad].label.toLowerCase()}`} />
          <span className={cn("truncate text-sm font-medium", done && "text-muted-foreground line-through")}>{task.titulo}</span>
          {task.meeting && <Video className="size-3.5 shrink-0 text-muted-foreground" aria-label="Viene de una reunión" />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-xs text-muted-foreground">
          <span className="truncate">{task.project?.nombre ?? "Interna"}</span>
          {showResponsable && (
            <span className="sm:hidden">
              <UserChip profile={responsable} />
            </span>
          )}
          {task.fecha_limite && (
            <span
              className={cn(
                "sm:hidden",
                overdue && "font-medium text-destructive",
                dueToday && "font-medium text-warning",
              )}
            >
              {formatRelativeDay(task.fecha_limite)}
            </span>
          )}
        </div>
      </div>

      {showResponsable && (
        <div className="hidden w-28 shrink-0 sm:block">
          <UserChip profile={responsable} />
        </div>
      )}

      <div
        className={cn(
          "hidden w-24 shrink-0 text-right text-xs tabular sm:block",
          overdue ? "font-medium text-destructive" : dueToday ? "font-medium text-warning" : "text-muted-foreground",
        )}
      >
        {task.fecha_limite ? formatRelativeDay(task.fecha_limite) : "—"}
      </div>

      <div className="hidden w-36 shrink-0 md:block" onClick={(e) => e.stopPropagation()}>
        <Select value={task.estado} onValueChange={(v) => onStatusChange(v as TareaEstado)}>
          <SelectTrigger size="sm" className="h-7 text-xs" aria-label="Estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAREA_ESTADO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
