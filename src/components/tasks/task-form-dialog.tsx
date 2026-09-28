"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { TareaEstado } from "@/types/database";
import { TAREA_ESTADO_OPTIONS, TAREA_PRIORIDAD_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { taskSchema, type TaskInput } from "@/lib/validations/task";
import { createTaskAction, deleteTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import { useCurrentUser } from "@/components/layout/current-user";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { MeetingOption, ProjectOption, TaskRow } from "@/components/tasks/types";
import { PRIORITY_DOT } from "@/components/tasks/types";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none__";

export interface TaskPreset {
  estado?: TareaEstado;
  project_id?: string | null;
  meeting_id?: string | null;
  responsable_id?: string | null;
  fecha_limite?: string;
}

function toInput(task: TaskRow | null | undefined, preset: TaskPreset | undefined, myId: string): TaskInput {
  if (task) {
    return {
      titulo: task.titulo,
      descripcion: task.descripcion ?? "",
      responsable_id: task.responsable_id,
      project_id: task.project_id,
      meeting_id: task.meeting_id,
      prioridad: task.prioridad,
      estado: task.estado,
      fecha_limite: task.fecha_limite ?? "",
    };
  }
  return {
    titulo: "",
    descripcion: "",
    responsable_id: preset?.responsable_id !== undefined ? preset.responsable_id : myId,
    project_id: preset?.project_id ?? null,
    meeting_id: preset?.meeting_id ?? null,
    prioridad: "media",
    estado: preset?.estado ?? "pendiente",
    fecha_limite: preset?.fecha_limite ?? "",
  };
}

/** Crear o editar una tarea. En edición incluye eliminar. */
export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  preset,
  projects,
  meetings = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskRow | null;
  preset?: TaskPreset;
  projects: ProjectOption[];
  meetings?: MeetingOption[];
}) {
  const { profile, team } = useCurrentUser();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = Boolean(task);

  const form = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: toInput(task, preset, profile.id),
  });

  // Reinicia solo al abrir, para no perder lo escrito si la página se refresca.
  useEffect(() => {
    if (open) form.reset(toInput(task, preset, profile.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (values: TaskInput) => {
    const result = task ? await updateTaskAction(task.id, values) : await createTaskAction(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success(task ? "Tarea actualizada" : "Tarea creada");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!task) return;
    const result = await deleteTaskAction(task.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Tarea eliminada");
    onOpenChange(false);
  };

  // Si la tarea tiene una reunión que no está en la lista (antigua), se agrega para no perderla.
  const meetingOptions =
    task?.meeting && !meetings.some((m) => m.id === task.meeting!.id)
      ? [{ id: task.meeting.id, titulo: task.meeting.titulo, fecha_inicio: "" }, ...meetings]
      : meetings;

  return (
    <>
      <FormDialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar tarea" : "Nueva tarea"} size="lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarea *</FormLabel>
                  <FormControl>
                    <Input placeholder="¿Qué hay que hacer?" autoFocus={!isEdit} className="h-10 text-[15px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prioridad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad</FormLabel>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup">
                    {TAREA_PRIORIDAD_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === o.value}
                        onClick={() => field.onChange(o.value)}
                        className={cn(
                          "flex h-9 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                          field.value === o.value
                            ? "border-foreground/25 bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent/50",
                        )}
                      >
                        <span className={cn("size-2 rounded-full", PRIORITY_DOT[o.value])} />
                        {o.label}
                      </button>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="responsable_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsable</FormLabel>
                    <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {team.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <UserAvatar profile={m} className="size-5 text-[9px]" />
                            {m.nombre}
                            {m.id === profile.id ? " (tú)" : ""}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
                        <SelectItem value={NONE}>Sin asignar</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fecha_limite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha límite</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proyecto</FormLabel>
                    <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Tarea interna (sin proyecto)</SelectItem>
                        {projects.length > 0 && <SelectSeparator />}
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre}
                            {p.cliente && <span className="text-muted-foreground">· {p.cliente}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TAREA_ESTADO_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              {meetingOptions.length > 0 && (
                <FormField
                  control={form.control}
                  name="meeting_id"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Reunión de origen</FormLabel>
                      <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>Ninguna</SelectItem>
                          <SelectSeparator />
                          {meetingOptions.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.titulo}
                              {m.fecha_inicio && (
                                <span className="text-muted-foreground">· {formatDate(m.fecha_inicio, "month")}</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Detalles, enlaces, criterios de terminado…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {isEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 />
                  Eliminar
                </Button>
              )}
              <Button type="button" variant="ghost" className={isEdit ? "" : "sm:ml-auto"} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                {isEdit ? "Guardar cambios" : "Crear tarea"}
              </Button>
            </div>
          </form>
        </Form>
      </FormDialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar esta tarea?"
        description={task ? `"${task.titulo}" se eliminará definitivamente.` : undefined}
        onConfirm={handleDelete}
      />
    </>
  );
}
