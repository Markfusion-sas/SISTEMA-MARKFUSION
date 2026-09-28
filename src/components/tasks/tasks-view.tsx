"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, Columns3, List, Plus, Sun, X } from "lucide-react";
import { toast } from "sonner";

import type { TareaEstado, TareaPrioridad } from "@/types/database";
import { TAREA_ESTADOS, TAREA_PRIORIDAD_OPTIONS } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setTaskStatusAction } from "@/lib/actions/tasks";
import { useCurrentUser } from "@/components/layout/current-user";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput, normalize } from "@/components/shared/search-input";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { MyDayView } from "@/components/tasks/my-day-view";
import { TaskFormDialog, type TaskPreset } from "@/components/tasks/task-form-dialog";
import { TaskListView } from "@/components/tasks/task-list-view";
import type { MeetingOption, ProjectOption, TaskRow } from "@/components/tasks/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TaskViewMode = "kanban" | "lista" | "mi-dia";

const VIEWS: { value: TaskViewMode; label: string; icon: typeof Columns3 }[] = [
  { value: "kanban", label: "Kanban", icon: Columns3 },
  { value: "lista", label: "Lista", icon: List },
  { value: "mi-dia", label: "Mi día", icon: Sun },
];

const ALL = "todos";
const NONE = "sin";
const INTERNAL = "internas";

export function TasksView({
  initialTasks,
  projects,
  meetings,
  initialView,
}: {
  initialTasks: TaskRow[];
  projects: ProjectOption[];
  meetings: MeetingOption[];
  initialView: TaskViewMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, team } = useCurrentUser();

  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<TaskViewMode>(initialView);
  const [responsable, setResponsable] = useState<string>(ALL);
  const [proyecto, setProyecto] = useState<string>(ALL);
  const [prioridad, setPrioridad] = useState<TareaPrioridad | typeof ALL>(ALL);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [preset, setPreset] = useState<TaskPreset | undefined>();

  // Los datos del servidor mandan: tras cada acción la página se revalida y llegan aquí.
  useEffect(() => setTasks(initialTasks), [initialTasks]);

  // "?tarea=<id>" (desde el buscador global) abre esa tarea y limpia el parámetro.
  const searchParams = useSearchParams();
  const taskParam = searchParams.get("tarea");
  useEffect(() => {
    if (!taskParam) return;
    const task = initialTasks.find((t) => t.id === taskParam);
    if (task) {
      setEditing(task);
      setPreset(undefined);
      setFormOpen(true);
    }
    const params = new URLSearchParams(window.location.search);
    params.delete("tarea");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskParam]);

  const changeView = (next: TaskViewMode) => {
    setView(next);
    router.replace(next === "kanban" ? pathname : `${pathname}?vista=${next}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return tasks.filter((t) => {
      if (responsable === NONE && t.responsable_id) return false;
      if (responsable !== ALL && responsable !== NONE && t.responsable_id !== responsable) return false;
      if (proyecto === INTERNAL && t.project_id) return false;
      if (proyecto !== ALL && proyecto !== INTERNAL && t.project_id !== proyecto) return false;
      if (prioridad !== ALL && t.prioridad !== prioridad) return false;
      if (q && ![t.titulo, t.descripcion, t.project?.nombre].some((f) => normalize(f).includes(q))) return false;
      return true;
    });
  }, [tasks, responsable, proyecto, prioridad, search]);

  const hasFilters = responsable !== ALL || proyecto !== ALL || prioridad !== ALL || search !== "";
  const clearFilters = () => {
    setResponsable(ALL);
    setProyecto(ALL);
    setPrioridad(ALL);
    setSearch("");
  };

  const today = todayISO();
  const openCount = tasks.filter((t) => t.estado !== "hecha").length;
  const overdueCount = tasks.filter((t) => t.estado !== "hecha" && t.fecha_limite && t.fecha_limite < today).length;

  const openCreate = (p?: TaskPreset) => {
    setEditing(null);
    setPreset(p);
    setFormOpen(true);
  };

  const openEdit = (task: TaskRow) => {
    setEditing(task);
    setPreset(undefined);
    setFormOpen(true);
  };

  const changeStatus = (task: TaskRow, estado: TareaEstado) => {
    if (task.estado === estado) return;
    const previous = { estado: task.estado, completed_at: task.completed_at };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, estado, completed_at: estado === "hecha" ? new Date().toISOString() : null }
          : t,
      ),
    );
    setTaskStatusAction(task.id, estado).then((result) => {
      if (!result.ok) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...previous } : t)));
        toast.error(result.error);
        return;
      }
      toast.success(estado === "hecha" ? "¡Tarea completada!" : `Tarea en ${TAREA_ESTADOS[estado].label.toLowerCase()}`);
    });
  };

  const toggle = (task: TaskRow) => changeStatus(task, task.estado === "hecha" ? "pendiente" : "hecha");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tareas"
        description={
          <>
            {openCount} abiertas
            {overdueCount > 0 && <span className="text-destructive"> · {overdueCount} vencidas</span>}
          </>
        }
        actions={
          <Button onClick={() => openCreate()}>
            <Plus />
            Nueva tarea
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Selector de vista */}
          <div className="inline-flex w-fit rounded-lg bg-muted p-[3px]" role="tablist" aria-label="Vista">
            {VIEWS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => changeView(value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors",
                  view === value
                    ? "bg-background text-foreground shadow-sm dark:bg-input/40"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
          {view !== "mi-dia" && (
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar tarea…" className="w-full sm:w-64" />
          )}
        </div>

        {view !== "mi-dia" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Responsable: chip de color por persona */}
            <div className="flex flex-wrap gap-1.5">
              <PersonChip active={responsable === ALL} onClick={() => setResponsable(ALL)}>
                Todos
              </PersonChip>
              {team.map((m) => (
                <PersonChip
                  key={m.id}
                  active={responsable === m.id}
                  color={m.color}
                  onClick={() => setResponsable(responsable === m.id ? ALL : m.id)}
                >
                  {m.nombre.split(" ")[0]}
                  {m.id === profile.id && <span className="opacity-60">(tú)</span>}
                </PersonChip>
              ))}
              <PersonChip active={responsable === NONE} onClick={() => setResponsable(responsable === NONE ? ALL : NONE)}>
                Sin asignar
              </PersonChip>
            </div>

            <Select value={proyecto} onValueChange={setProyecto}>
              <SelectTrigger size="sm" className="w-auto min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los proyectos</SelectItem>
                <SelectItem value={INTERNAL}>Tareas internas</SelectItem>
                {projects.length > 0 && <SelectSeparator />}
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={prioridad} onValueChange={(v) => setPrioridad(v as TareaPrioridad | typeof ALL)}>
              <SelectTrigger size="sm" className="w-auto min-w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toda prioridad</SelectItem>
                {TAREA_PRIORIDAD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    Prioridad {o.label.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X />
                Limpiar
              </Button>
            )}
          </div>
        )}
      </div>

      {tasks.length === 0 && view !== "mi-dia" ? (
        <EmptyState
          icon={CheckSquare}
          title="Aún no hay tareas"
          description="Crea la primera tarea del equipo. Puedes ligarla a un proyecto o dejarla como tarea interna."
          action={
            <Button onClick={() => openCreate()}>
              <Plus />
              Crear tarea
            </Button>
          }
        />
      ) : view === "kanban" ? (
        <KanbanBoard
          tasks={filtered}
          setTasks={setTasks}
          team={team}
          onOpenTask={openEdit}
          onAddTask={(estado) =>
            openCreate({
              estado,
              project_id: proyecto !== ALL && proyecto !== INTERNAL ? proyecto : null,
              responsable_id: responsable !== ALL && responsable !== NONE ? responsable : undefined,
            })
          }
        />
      ) : view === "lista" ? (
        <TaskListView tasks={filtered} team={team} onToggle={toggle} onStatusChange={changeStatus} onOpenTask={openEdit} />
      ) : (
        <MyDayView tasks={tasks} me={profile} onToggle={toggle} onStatusChange={changeStatus} onOpenTask={openEdit} />
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        preset={preset}
        projects={projects}
        meetings={meetings}
      />
    </div>
  );
}

function PersonChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
        !active && "text-muted-foreground hover:bg-accent hover:text-foreground",
        active && !color && "border-foreground/15 bg-foreground text-background",
      )}
      style={
        active && color
          ? { backgroundColor: `${color}22`, borderColor: `${color}66`, color }
          : undefined
      }
    >
      {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  );
}
