"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { rescheduleMeetingAction } from "@/app/(app)/reuniones/actions";
import { setTaskDueDateAction } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import type { MoveRequest, SlotSelection } from "@/components/calendar/calendar-board";
import { EVENT_TYPES, type CalendarEventType, type CalendarItem } from "@/components/calendar/types";
import {
  MeetingFormDialog,
  type MeetingClientOption,
  type MeetingPreset,
  type MeetingProjectOption,
} from "@/components/meetings/meeting-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import type { MeetingOption, ProjectOption, TaskRow } from "@/components/tasks/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CalendarBoard = dynamic(() => import("@/components/calendar/calendar-board"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-160 w-full rounded-xl" />
    </div>
  ),
});

export function CalendarView({
  items,
  tasks,
  clients,
  projects,
  taskProjects,
  taskMeetings,
}: {
  items: CalendarItem[];
  tasks: TaskRow[];
  clients: MeetingClientOption[];
  projects: MeetingProjectOption[];
  taskProjects: ProjectOption[];
  taskMeetings: MeetingOption[];
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<CalendarEventType>>(new Set());
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingPreset, setMeetingPreset] = useState<MeetingPreset | undefined>();
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);

  const visible = useMemo(() => items.filter((i) => !hidden.has(i.type)), [items, hidden]);
  const counts = useMemo(() => {
    const map = new Map<CalendarEventType, number>();
    for (const i of items) map.set(i.type, (map.get(i.type) ?? 0) + 1);
    return map;
  }, [items]);

  const toggleType = (type: CalendarEventType) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const handleItemClick = (item: CalendarItem) => {
    if (item.type === "task") {
      const task = tasks.find((t) => t.id === item.refId);
      if (task) {
        setEditingTask(task);
        setTaskOpen(true);
      }
      return;
    }
    if (item.href) router.push(item.href);
  };

  const handleSelectSlot = (slot: SlotSelection) => {
    setMeetingPreset(slot);
    setMeetingOpen(true);
  };

  const handleMove = async ({ item, startISO, endISO, date, allDay, revert }: MoveRequest) => {
    if (item.type === "meeting") {
      if (allDay) {
        revert();
        toast.error("Las reuniones necesitan una hora. Muévela dentro de la grilla de horas.");
        return;
      }
      const result = await rescheduleMeetingAction(item.refId, startISO, endISO);
      if (!result.ok) {
        revert();
        toast.error(result.error);
        return;
      }
      toast.success("Reunión reprogramada");
      return;
    }

    if (item.type === "task") {
      if (!allDay) {
        revert();
        toast.error("Las tareas se mueven por día: suéltala en la fila de todo el día o en la vista de mes.");
        return;
      }
      const result = await setTaskDueDateAction(item.refId, date);
      if (!result.ok) {
        revert();
        toast.error(result.error);
        return;
      }
      toast.success("Fecha límite actualizada");
      return;
    }

    revert();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario"
        description="Reuniones, entregas, tareas, cobros y gastos recurrentes. Arrastra reuniones y tareas para reprogramarlas."
        actions={
          <Button
            onClick={() => {
              setMeetingPreset(undefined);
              setMeetingOpen(true);
            }}
          >
            <Plus />
            Nueva reunión
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1.5" aria-label="Mostrar u ocultar tipos de evento">
        {EVENT_TYPES.map(({ type, label, cssVar }) => {
          const active = !hidden.has(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={active}
              onClick={() => toggleType(type)}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-all",
                active ? "bg-card text-foreground shadow-xs" : "border-dashed text-muted-foreground/70 hover:text-foreground",
              )}
            >
              <span
                className={cn("size-2.5 rounded-full transition-opacity", !active && "opacity-40")}
                style={{ backgroundColor: cssVar }}
              />
              {label}
              <span className="text-xs text-muted-foreground tabular">{counts.get(type) ?? 0}</span>
            </button>
          );
        })}
      </div>

      <CalendarBoard items={visible} onItemClick={handleItemClick} onSelectSlot={handleSelectSlot} onMove={handleMove} />

      <p className="text-xs text-muted-foreground">
        Haz clic en un día u horario vacío para programar una reunión. Todas las horas están en hora de Colombia.
      </p>

      <MeetingFormDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        preset={meetingPreset}
        clients={clients}
        projects={projects}
      />

      <TaskFormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        task={editingTask}
        projects={taskProjects}
        meetings={taskMeetings}
      />
    </div>
  );
}
