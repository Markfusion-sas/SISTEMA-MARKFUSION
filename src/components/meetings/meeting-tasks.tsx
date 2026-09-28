"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CornerDownLeft, Plus } from "lucide-react";
import { toast } from "sonner";

import { createTaskAction } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/components/layout/current-user";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskChecklist, type TaskItem } from "@/components/tasks/task-checklist";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none__";

/**
 * "Tareas de esta reunión": se agregan en línea, quedan ligadas a la reunión
 * (y a su proyecto, si tiene) y aparecen en el kanban.
 */
export function MeetingTasks({
  meetingId,
  projectId,
  tasks,
}: {
  meetingId: string;
  projectId: string | null;
  tasks: TaskItem[];
}) {
  const { profile, team } = useCurrentUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState("");
  const [responsable, setResponsable] = useState<string>(profile.id);
  const [fecha, setFecha] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = titulo.trim();
    if (value.length < 2) {
      inputRef.current?.focus();
      return;
    }
    setSaving(true);
    const result = await createTaskAction({
      titulo: value,
      descripcion: "",
      responsable_id: responsable === NONE ? null : responsable,
      project_id: projectId,
      meeting_id: meetingId,
      prioridad: "media",
      estado: "pendiente",
      fecha_limite: fecha,
    });
    setSaving(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Tarea agregada al kanban");
    setTitulo("");
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={add}
        className="flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-card focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <Plus className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nueva tarea que sale de la reunión…"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            maxLength={200}
            disabled={saving}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={responsable} onValueChange={setResponsable}>
            <SelectTrigger size="sm" className="w-auto min-w-32 border-transparent bg-muted/50 shadow-none" aria-label="Responsable">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {team.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <UserAvatar profile={m} className="size-5 text-[9px]" />
                  {m.nombre.split(" ")[0]}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value={NONE}>Sin asignar</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={cn(
              "h-8 rounded-md bg-muted/50 px-2 text-xs outline-none",
              fecha ? "text-foreground" : "text-muted-foreground",
            )}
            aria-label="Fecha límite"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            <CornerDownLeft className="size-3.5" />
            Agregar
          </button>
        </div>
      </form>

      <TaskChecklist tasks={tasks} emptyHint="Escribe arriba los compromisos que salen de la reunión." />

      {tasks.length > 0 && (
        <Link href="/tareas" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Ver en el kanban
          <ArrowUpRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
