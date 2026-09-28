"use client";

import { useMemo, useState } from "react";
import { CornerDownLeft, PartyPopper, Plus, Sun } from "lucide-react";
import { toast } from "sonner";

import type { Profile, TareaEstado } from "@/types/database";
import { capitalize, formatDate, todayISO } from "@/lib/format";
import { createTaskAction } from "@/lib/actions/tasks";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskListRow } from "@/components/tasks/task-list-row";
import type { TaskRow } from "@/components/tasks/types";
import { Progress } from "@/components/ui/progress";

/** Mi día: lo vencido, lo de hoy y lo que tengo en curso. */
export function MyDayView({
  tasks,
  me,
  onToggle,
  onStatusChange,
  onOpenTask,
}: {
  tasks: TaskRow[];
  me: Profile;
  onToggle: (task: TaskRow) => void;
  onStatusChange: (task: TaskRow, estado: TareaEstado) => void;
  onOpenTask: (task: TaskRow) => void;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const today = todayISO();

  const sections = useMemo(() => {
    const mine = tasks.filter((t) => t.responsable_id === me.id);
    const open = mine.filter((t) => t.estado !== "hecha");
    const overdue = open.filter((t) => t.fecha_limite && t.fecha_limite < today);
    const dueToday = open.filter((t) => t.fecha_limite === today);
    const inProgress = open.filter(
      (t) => ["en_progreso", "en_revision"].includes(t.estado) && !(t.fecha_limite && t.fecha_limite <= today),
    );
    const doneToday = mine.filter((t) => t.estado === "hecha" && t.completed_at && todayISO(new Date(t.completed_at)) === today);
    const sort = (list: TaskRow[]) =>
      [...list].sort((a, b) => {
        const p = { alta: 0, media: 1, baja: 2 };
        return p[a.prioridad] - p[b.prioridad] || (a.fecha_limite ?? "").localeCompare(b.fecha_limite ?? "");
      });
    return {
      overdue: sort(overdue),
      dueToday: sort(dueToday),
      inProgress: sort(inProgress),
      doneToday,
    };
  }, [tasks, me.id, today]);

  const pendingCount = sections.overdue.length + sections.dueToday.length + sections.inProgress.length;
  const total = pendingCount + sections.doneToday.length;
  const pct = total ? Math.round((sections.doneToday.length / total) * 100) : 0;

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const titulo = draft.trim();
    if (titulo.length < 2) return;
    setSaving(true);
    const result = await createTaskAction({
      titulo,
      descripcion: "",
      responsable_id: me.id,
      project_id: null,
      meeting_id: null,
      prioridad: "media",
      estado: "pendiente",
      fecha_limite: today,
    });
    setSaving(false);
    if (!result.ok) return void toast.error(result.error);
    setDraft("");
    toast.success("Agregada a tu día");
  };

  const rows = (list: TaskRow[]) => (
    <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {list.map((task) => (
        <TaskListRow
          key={task.id}
          task={task}
          responsable={me}
          showResponsable={false}
          onToggle={() => onToggle(task)}
          onStatusChange={(estado) => onStatusChange(task, estado)}
          onOpen={() => onOpenTask(task)}
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-card">
        <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sun className="size-4 text-warning" />
              {capitalize(formatDate(new Date(), "full"))}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              {pendingCount === 0
                ? "Tienes el día despejado"
                : `${pendingCount} ${pendingCount === 1 ? "tarea" : "tareas"} para hoy`}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular">{pct}%</div>
            <div className="text-xs text-muted-foreground">
              {sections.doneToday.length} de {total} hechas
            </div>
          </div>
        </div>
        <Progress value={pct} className="relative mt-4 h-2" />

        <form onSubmit={quickAdd} className="relative mt-4 flex items-center gap-2 rounded-lg border bg-background/60 px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25">
          <Plus className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Agregar una tarea para hoy…"
            className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            disabled={saving}
            maxLength={200}
          />
          <kbd className="hidden items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:flex">
            <CornerDownLeft className="size-3" /> Enter
          </kbd>
        </form>
      </div>

      {pendingCount === 0 && sections.doneToday.length === 0 && (
        <EmptyState
          compact
          icon={PartyPopper}
          title="Nada pendiente para hoy"
          description="No tienes tareas vencidas, para hoy ni en curso. Agrega una arriba o revisa el kanban."
        />
      )}

      {sections.overdue.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-destructive">Vencidas · {sections.overdue.length}</h3>
          {rows(sections.overdue)}
        </section>
      )}
      {sections.dueToday.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-warning">Para hoy · {sections.dueToday.length}</h3>
          {rows(sections.dueToday)}
        </section>
      )}
      {sections.inProgress.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">En curso · {sections.inProgress.length}</h3>
          {rows(sections.inProgress)}
        </section>
      )}
      {sections.doneToday.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-success">Completadas hoy · {sections.doneToday.length}</h3>
          {rows(sections.doneToday)}
        </section>
      )}
    </div>
  );
}
