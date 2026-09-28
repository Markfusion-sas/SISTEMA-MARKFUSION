"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import type { Profile, TareaEstado } from "@/types/database";
import { TAREA_ESTADOS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { moveTaskAction } from "@/lib/actions/tasks";
import { TaskCard } from "@/components/tasks/task-card";
import { COLUMNS, orderBetween, type TaskRow } from "@/components/tasks/types";

const COLUMN_IDS = COLUMNS.map((c) => c.estado) as string[];

function groupByColumn(tasks: TaskRow[]) {
  const groups = Object.fromEntries(COLUMNS.map((c) => [c.estado, [] as TaskRow[]])) as Record<TareaEstado, TaskRow[]>;
  for (const task of tasks) groups[task.estado].push(task);
  for (const key of Object.keys(groups) as TareaEstado[]) groups[key].sort((a, b) => a.orden - b.orden);
  return groups;
}

/**
 * Kanban con drag & drop. `tasks` son las tareas visibles (ya filtradas);
 * `setTasks` actualiza el estado local de la vista para mover al instante.
 */
export function KanbanBoard({
  tasks,
  setTasks,
  team,
  onOpenTask,
  onAddTask,
}: {
  tasks: TaskRow[];
  setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
  team: Profile[];
  onOpenTask: (task: TaskRow) => void;
  onAddTask: (estado: TareaEstado) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const snapshot = useRef<Pick<TaskRow, "id" | "estado" | "orden" | "completed_at"> | null>(null);

  /** Devuelve la tarea arrastrada a su lugar original. */
  const revert = (start: NonNullable<typeof snapshot.current>) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === start.id ? { ...t, estado: start.estado, orden: start.orden, completed_at: start.completed_at } : t,
      ),
    );

  const columns = useMemo(() => groupByColumn(tasks), [tasks]);
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;
  const memberById = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter queda libre para abrir la tarea; espacio toma y suelta.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const columnOf = (id: string): TareaEstado | null => {
    if (COLUMN_IDS.includes(id)) return id as TareaEstado;
    return tasks.find((t) => t.id === id)?.estado ?? null;
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    setActiveId(task.id);
    snapshot.current = { id: task.id, estado: task.estado, orden: task.orden, completed_at: task.completed_at };
  };

  // Al pasar a otra columna, la tarea se mueve de inmediato para que la columna destino abra espacio.
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = columnOf(String(active.id));
    const to = columnOf(String(over.id));
    if (!from || !to || from === to) return;

    setTasks((prev) => {
      const target = groupByColumn(prev)[to].filter((t) => t.id !== active.id);
      const overIndex = target.findIndex((t) => t.id === over.id);
      const index = overIndex >= 0 ? overIndex : target.length;
      const orden = orderBetween(target[index - 1]?.orden, target[index]?.orden);
      return prev.map((t) => (t.id === active.id ? { ...t, estado: to, orden } : t));
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const start = snapshot.current;
    setActiveId(null);
    snapshot.current = null;
    if (!start || !over) {
      if (start) revert(start);
      return;
    }

    const id = String(active.id);
    const column = columnOf(id);
    if (!column) return;

    // Reordenar dentro de la columna final.
    let finalOrden = tasks.find((t) => t.id === id)?.orden ?? start.orden;
    const list = columns[column];
    const oldIndex = list.findIndex((t) => t.id === id);
    const overIndex = list.findIndex((t) => t.id === over.id);
    if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
      const moved = arrayMove(list, oldIndex, overIndex);
      const newIndex = moved.findIndex((t) => t.id === id);
      finalOrden = orderBetween(moved[newIndex - 1]?.orden, moved[newIndex + 1]?.orden);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, orden: finalOrden } : t)));
    }

    if (column === start.estado && finalOrden === start.orden) return;

    const changedColumn = column !== start.estado;
    const doneNow = column === "hecha" && changedColumn;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed_at: doneNow ? new Date().toISOString() : column === "hecha" ? t.completed_at : null } : t,
      ),
    );

    moveTaskAction(id, column, finalOrden).then((result) => {
      if (!result.ok) {
        revert(start);
        toast.error(result.error);
        return;
      }
      if (changedColumn) toast.success(doneNow ? "¡Tarea completada!" : `Movida a ${TAREA_ESTADOS[column].label}`);
    });
  };

  const handleDragCancel = () => {
    if (snapshot.current) revert(snapshot.current);
    snapshot.current = null;
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Presiona espacio para tomar la tarea, usa las flechas para moverla y espacio de nuevo para soltarla.",
        },
      }}
    >
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {COLUMNS.map((col) => (
          <Column
            key={col.estado}
            estado={col.estado}
            label={col.label}
            dot={col.dot}
            tasks={columns[col.estado]}
            memberById={memberById}
            activeId={activeId}
            onOpenTask={onOpenTask}
            onAdd={() => onAddTask(col.estado)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {activeTask ? (
          <TaskCard task={activeTask} responsable={memberById.get(activeTask.responsable_id ?? "") ?? null} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  estado,
  label,
  dot,
  tasks,
  memberById,
  activeId,
  onOpenTask,
  onAdd,
}: {
  estado: TareaEstado;
  label: string;
  dot: string;
  tasks: TaskRow[];
  memberById: Map<string, Profile>;
  activeId: string | null;
  onOpenTask: (task: TaskRow) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <section
      aria-label={label}
      className="flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl border bg-muted/25 sm:w-72 lg:w-auto lg:max-w-none"
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={cn("size-2 rounded-full", dot)} />
        <h2 className="text-[13px] font-semibold">{label}</h2>
        <span className="rounded-full bg-foreground/[0.07] px-1.5 text-[11px] text-muted-foreground tabular">{tasks.length}</span>
        <button
          type="button"
          onClick={onAdd}
          className="ml-auto flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Agregar tarea en ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-40 flex-1 flex-col gap-2 rounded-b-2xl p-2 transition-colors lg:min-h-[calc(100dvh-280px)]",
            isOver && "bg-brand/4",
          )}
        >
          {tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              responsable={memberById.get(task.responsable_id ?? "") ?? null}
              hidden={task.id === activeId}
              onOpen={() => onOpenTask(task)}
            />
          ))}
          {tasks.length === 0 && (
            <button
              type="button"
              onClick={onAdd}
              className="flex h-20 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
            >
              Suelta aquí o agrega una tarea
            </button>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableTask({
  task,
  responsable,
  hidden,
  onOpen,
}: {
  task: TaskRow;
  responsable: Profile | null;
  hidden: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const { onKeyDown, ...pointerListeners } = listeners ?? {};

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      responsable={responsable}
      dragging={hidden}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={onOpen}
      {...attributes}
      {...pointerListeners}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isDragging) {
          e.preventDefault();
          onOpen();
          return;
        }
        onKeyDown?.(e);
      }}
    />
  );
}
