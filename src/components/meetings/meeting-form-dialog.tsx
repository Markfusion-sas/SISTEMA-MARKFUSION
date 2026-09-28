"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import type { Meeting } from "@/types/database";
import { REUNION_ESTADO_OPTIONS, REUNION_TIPO_OPTIONS } from "@/lib/constants";
import { bogotaParts, todayISO } from "@/lib/format";
import { meetingSchema, type MeetingInput } from "@/lib/validations/meeting";
import { createMeetingAction, updateMeetingAction } from "@/app/(app)/reuniones/actions";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none__";

export interface MeetingClientOption {
  id: string;
  nombre: string;
  empresa: string | null;
}

export interface MeetingProjectOption {
  id: string;
  nombre: string;
  client_id: string;
}

export interface MeetingPreset {
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  client_id?: string | null;
  project_id?: string | null;
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function toInput(meeting: Meeting | null | undefined, preset?: MeetingPreset): MeetingInput {
  if (meeting) {
    const start = bogotaParts(meeting.fecha_inicio);
    return {
      titulo: meeting.titulo,
      tipo: meeting.tipo,
      estado: meeting.estado,
      fecha: start.date,
      hora_inicio: start.time,
      hora_fin: meeting.fecha_fin ? bogotaParts(meeting.fecha_fin).time : "",
      client_id: meeting.client_id,
      project_id: meeting.project_id,
      link: meeting.link ?? "",
      participantes: meeting.participantes ?? "",
      agenda: meeting.agenda ?? "",
    };
  }
  const inicio = preset?.hora_inicio ?? "09:00";
  return {
    titulo: "",
    tipo: "seguimiento",
    estado: "programada",
    fecha: preset?.fecha ?? todayISO(),
    hora_inicio: inicio,
    hora_fin: preset?.hora_fin ?? addMinutes(inicio, 60),
    client_id: preset?.client_id ?? null,
    project_id: preset?.project_id ?? null,
    link: "",
    participantes: "",
    agenda: "",
  };
}

/** Crear o editar una reunión. */
export function MeetingFormDialog({
  open,
  onOpenChange,
  meeting,
  preset,
  clients,
  projects,
  goToDetail = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting | null;
  preset?: MeetingPreset;
  clients: MeetingClientOption[];
  projects: MeetingProjectOption[];
  goToDetail?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(meeting);

  const form = useForm<MeetingInput>({
    resolver: zodResolver(meetingSchema),
    defaultValues: toInput(meeting, preset),
  });

  // Reinicia solo al abrir, para no perder lo escrito si la página se refresca.
  useEffect(() => {
    if (open) form.reset(toInput(meeting, preset));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clientId = form.watch("client_id");
  const visibleProjects = clientId ? projects.filter((p) => p.client_id === clientId) : projects;

  const onSubmit = async (values: MeetingInput) => {
    if (meeting) {
      const result = await updateMeetingAction(meeting.id, values);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Reunión actualizada");
      onOpenChange(false);
      return;
    }
    const result = await createMeetingAction(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Reunión programada");
    onOpenChange(false);
    if (goToDetail && result.data) router.push(`/reuniones/${result.data.id}`);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar reunión" : "Nueva reunión"}
      description={isEdit ? undefined : "Programa una reunión con un cliente o del equipo."}
      size="lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="titulo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Seguimiento semanal con el cliente" autoFocus={!isEdit} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hora_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inicio</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      step={300}
                      {...field}
                      onChange={(e) => {
                        const prevStart = field.value;
                        const prevEnd = form.getValues("hora_fin");
                        field.onChange(e);
                        // Conserva la duración al mover la hora de inicio.
                        if (prevEnd && prevStart && e.target.value) {
                          const [ph, pm] = prevStart.split(":").map(Number);
                          const [eh, em] = prevEnd.split(":").map(Number);
                          const duration = eh * 60 + em - (ph * 60 + pm);
                          if (duration > 0) form.setValue("hora_fin", addMinutes(e.target.value, duration));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hora_fin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fin</FormLabel>
                  <FormControl>
                    <Input type="time" step={300} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REUNION_TIPO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {isEdit ? (
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
                        {REUNION_ESTADO_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enlace (Meet, Zoom…)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://meet.google.com/…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => {
                      const next = v === NONE ? null : v;
                      field.onChange(next);
                      const project = form.getValues("project_id");
                      if (project && next && !projects.some((p) => p.id === project && p.client_id === next)) {
                        form.setValue("project_id", null);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin cliente (interna)</SelectItem>
                      {clients.length > 0 && <SelectSeparator />}
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.empresa || c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proyecto</FormLabel>
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => {
                      const next = v === NONE ? null : v;
                      field.onChange(next);
                      const project = projects.find((p) => p.id === next);
                      if (project) form.setValue("client_id", project.client_id);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin proyecto</SelectItem>
                      {visibleProjects.length > 0 && <SelectSeparator />}
                      {visibleProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {isEdit && (
              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Enlace (Meet, Zoom…)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://meet.google.com/…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="participantes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Participantes</FormLabel>
                  <FormControl>
                    <Input placeholder="Laura Restrepo, Juan Jose, Jerónimo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="agenda"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agenda</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder={"1. Estado del proyecto\n2. Pendientes\n3. Próximos pasos"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {isEdit ? "Guardar cambios" : "Programar reunión"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
