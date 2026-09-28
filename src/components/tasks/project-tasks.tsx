"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { TaskChecklist, type TaskItem } from "@/components/tasks/task-checklist";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import type { ProjectOption } from "@/components/tasks/types";
import { Button } from "@/components/ui/button";

/** Tareas dentro de la ficha de un proyecto, con creación rápida ligada al proyecto. */
export function ProjectTasks({ tasks, project }: { tasks: TaskItem[]; project: ProjectOption }) {
  const [open, setOpen] = useState(false);
  const pending = tasks.filter((t) => t.estado !== "hecha").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {tasks.length ? `${pending} pendientes de ${tasks.length}` : "Organiza el trabajo del proyecto."}
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus />
          Nueva tarea
        </Button>
      </div>
      <TaskChecklist tasks={tasks} emptyHint="Crea la primera tarea de este proyecto con el botón de arriba." />
      <TaskFormDialog open={open} onOpenChange={setOpen} preset={{ project_id: project.id }} projects={[project]} />
    </div>
  );
}
