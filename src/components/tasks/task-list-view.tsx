"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { Profile, TareaEstado } from "@/types/database";
import { addDaysISO, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TaskListRow } from "@/components/tasks/task-list-row";
import type { TaskRow } from "@/components/tasks/types";

type Bucket = { key: string; label: string; tone?: "danger" | "warning"; tasks: TaskRow[] };

/** Agrupa las tareas por vencimiento: vencidas, hoy, esta semana, después, sin fecha y hechas. */
function bucketize(tasks: TaskRow[]): { open: Bucket[]; done: TaskRow[] } {
  const today = todayISO();
  const weekEnd = addDaysISO(today, 7);
  const open = tasks.filter((t) => t.estado !== "hecha");
  const byDate = (a: TaskRow, b: TaskRow) =>
    (a.fecha_limite ?? "").localeCompare(b.fecha_limite ?? "") || a.orden - b.orden;

  const buckets: Bucket[] = [
    { key: "vencidas", label: "Vencidas", tone: "danger", tasks: open.filter((t) => t.fecha_limite && t.fecha_limite < today) },
    { key: "hoy", label: "Hoy", tone: "warning", tasks: open.filter((t) => t.fecha_limite === today) },
    {
      key: "semana",
      label: "Próximos 7 días",
      tasks: open.filter((t) => t.fecha_limite && t.fecha_limite > today && t.fecha_limite <= weekEnd),
    },
    { key: "despues", label: "Más adelante", tasks: open.filter((t) => t.fecha_limite && t.fecha_limite > weekEnd) },
    { key: "sin-fecha", label: "Sin fecha", tasks: open.filter((t) => !t.fecha_limite) },
  ].map((b) => ({ ...b, tasks: [...b.tasks].sort(byDate) }) as Bucket);

  const done = tasks
    .filter((t) => t.estado === "hecha")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  return { open: buckets.filter((b) => b.tasks.length), done };
}

export function TaskListView({
  tasks,
  team,
  onToggle,
  onStatusChange,
  onOpenTask,
}: {
  tasks: TaskRow[];
  team: Profile[];
  onToggle: (task: TaskRow) => void;
  onStatusChange: (task: TaskRow, estado: TareaEstado) => void;
  onOpenTask: (task: TaskRow) => void;
}) {
  const [showDone, setShowDone] = useState(false);
  const { open, done } = useMemo(() => bucketize(tasks), [tasks]);
  const memberById = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);

  const renderRows = (rows: TaskRow[]) => (
    <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {rows.map((task) => (
        <TaskListRow
          key={task.id}
          task={task}
          responsable={memberById.get(task.responsable_id ?? "") ?? null}
          onToggle={() => onToggle(task)}
          onStatusChange={(estado) => onStatusChange(task, estado)}
          onOpen={() => onOpenTask(task)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {open.length === 0 && (
        <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No hay tareas abiertas con estos filtros. 🎉
        </div>
      )}

      {open.map((bucket) => (
        <section key={bucket.key} className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span
              className={cn(
                bucket.tone === "danger" && "text-destructive",
                bucket.tone === "warning" && "text-warning",
              )}
            >
              {bucket.label}
            </span>
            <span className="tabular">{bucket.tasks.length}</span>
          </h3>
          {renderRows(bucket.tasks)}
        </section>
      ))}

      {done.length > 0 && (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={showDone}
          >
            <ChevronDown className={cn("size-3.5 transition-transform", !showDone && "-rotate-90")} />
            Hechas
            <span className="tabular">{done.length}</span>
          </button>
          {showDone && renderRows(done.slice(0, 50))}
        </section>
      )}
    </div>
  );
}
