"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, CheckSquare } from "lucide-react";
import { toast } from "sonner";

import type { Task } from "@/types/database";
import { TAREA_ESTADOS, TAREA_PRIORIDADES } from "@/lib/constants";
import { formatRelativeDay, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toggleTaskDoneAction } from "@/lib/actions/tasks";
import { useCurrentUser } from "@/components/layout/current-user";
import { EmptyState } from "@/components/shared/empty-state";
import { UserChip } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type TaskItem = Pick<
  Task,
  "id" | "titulo" | "estado" | "prioridad" | "fecha_limite" | "responsable_id" | "descripcion"
>;

/** Lista de tareas con check para marcarlas como hechas. */
export function TaskChecklist({ tasks, emptyHint }: { tasks: TaskItem[]; emptyHint?: string }) {
  const { team } = useCurrentUser();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, update: { id: string; done: boolean }) =>
    state.map((t) => (t.id === update.id ? { ...t, estado: update.done ? "hecha" : "pendiente" } : t)),
  );
  const today = todayISO();

  const toggle = (task: TaskItem) => {
    const done = task.estado !== "hecha";
    startTransition(async () => {
      setOptimistic({ id: task.id, done });
      const result = await toggleTaskDoneAction(task.id, done);
      if (!result.ok) toast.error(result.error);
      else toast.success(done ? "Tarea completada" : "Tarea reabierta");
    });
  };

  if (tasks.length === 0) {
    return (
      <EmptyState
        compact
        icon={CheckSquare}
        title="Sin tareas"
        description={emptyHint ?? "Las tareas ligadas aparecerán aquí."}
        action={
          <Button variant="outline" asChild>
            <Link href="/tareas">Ir a tareas</Link>
          </Button>
        }
      />
    );
  }

  const sorted = [...optimistic].sort((a, b) => {
    const aDone = a.estado === "hecha" ? 1 : 0;
    const bDone = b.estado === "hecha" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return (a.fecha_limite ?? "9999").localeCompare(b.fecha_limite ?? "9999");
  });

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {sorted.map((task) => {
        const done = task.estado === "hecha";
        const overdue = !done && task.fecha_limite && task.fecha_limite < today;
        const responsable = team.find((m) => m.id === task.responsable_id) ?? null;
        return (
          <div key={task.id} className="flex items-start gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => toggle(task)}
              className="mt-0.5 shrink-0 rounded-full text-muted-foreground transition-colors outline-none hover:text-success focus-visible:ring-2 focus-visible:ring-ring/40"
              aria-label={done ? "Marcar como pendiente" : "Marcar como hecha"}
            >
              {done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5" />}
            </button>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{task.titulo}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <UserChip profile={responsable} />
                {!done && (
                  <Badge tone={TAREA_ESTADOS[task.estado].tone} className="py-0 text-[11px]">
                    {TAREA_ESTADOS[task.estado].label}
                  </Badge>
                )}
                {!done && task.prioridad === "alta" && (
                  <Badge tone={TAREA_PRIORIDADES.alta.tone} className="py-0 text-[11px]">
                    Prioridad alta
                  </Badge>
                )}
                {task.fecha_limite && (
                  <span className={cn("text-muted-foreground", overdue && "font-medium text-destructive")}>
                    {overdue ? "Vencida · " : ""}
                    {formatRelativeDay(task.fecha_limite)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
