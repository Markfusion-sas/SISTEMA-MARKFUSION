import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, CalendarDays, Clock, Link2, Users, Building2 } from "lucide-react";

import type { Meeting } from "@/types/database";
import { REUNION_ESTADOS, REUNION_TIPOS } from "@/lib/constants";
import { bogotaParts, capitalize, formatDate, formatDuration, formatTime, todayISO } from "@/lib/format";
import { getMeetingOptions } from "@/lib/meeting-options";
import { createClient } from "@/lib/supabase/server";
import { MeetingHeaderActions } from "@/components/meetings/meeting-header-actions";
import { MeetingNotes } from "@/components/meetings/meeting-notes";
import { MeetingTasks } from "@/components/meetings/meeting-tasks";
import type { TaskItem } from "@/components/tasks/task-checklist";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Reunión" };
  const supabase = await createClient();
  const { data } = await supabase.from("meetings").select("titulo").eq("id", id).maybeSingle();
  return { title: data?.titulo ?? "Reunión" };
}

type MeetingDetail = Meeting & {
  client: { id: string; nombre: string; empresa: string | null } | null;
  project: { id: string; nombre: string } | null;
};

export default async function ReunionDetallePage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [meetingRes, tasksRes, options] = await Promise.all([
    supabase
      .from("meetings")
      .select("*, client:clients(id, nombre, empresa), project:projects(id, nombre)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id, titulo, estado, prioridad, fecha_limite, responsable_id, descripcion")
      .eq("meeting_id", id)
      .order("created_at"),
    getMeetingOptions(supabase),
  ]);

  if (!meetingRes.data) notFound();
  const meeting = meetingRes.data as unknown as MeetingDetail;
  const tasks = (tasksRes.data ?? []) as TaskItem[];

  const tipo = REUNION_TIPOS[meeting.tipo];
  const estado = REUNION_ESTADOS[meeting.estado];
  const start = bogotaParts(meeting.fecha_inicio);
  const isPastProgrammed = meeting.estado === "programada" && start.date < todayISO();
  const clientLabel = meeting.client ? meeting.client.empresa || meeting.client.nombre : null;

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <Link
          href="/reuniones"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Reuniones
        </Link>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tipo.tone}>{tipo.label}</Badge>
              <Badge tone={isPastProgrammed ? "warning" : estado.tone} dot>
                {isPastProgrammed ? "Por cerrar" : estado.label}
              </Badge>
            </div>
            <h1
              className={`text-2xl font-semibold tracking-tight text-balance sm:text-[28px] ${
                meeting.estado === "cancelada" ? "text-muted-foreground line-through" : ""
              }`}
            >
              {meeting.titulo}
            </h1>
            <p className="text-sm text-muted-foreground">
              {capitalize(formatDate(meeting.fecha_inicio, "full"))} · {formatTime(meeting.fecha_inicio)}
              {meeting.fecha_fin ? ` – ${formatTime(meeting.fecha_fin)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MeetingHeaderActions
              key={meeting.updated_at}
              meeting={meeting}
              clients={options.clients}
              projects={options.projects}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <MeetingNotes
            key={meeting.updated_at}
            meetingId={meeting.id}
            initial={{
              agenda: meeting.agenda ?? "",
              notas: meeting.notas ?? "",
              decisiones: meeting.decisiones ?? "",
            }}
          />

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Tareas de esta reunión</h2>
              <p className="text-sm text-muted-foreground">
                Quedan ligadas a la reunión{meeting.project ? " y a su proyecto" : ""} y aparecen en el kanban.
              </p>
            </div>
            <MeetingTasks meetingId={meeting.id} projectId={meeting.project_id} tasks={tasks} />
          </section>
        </div>

        <Card className="h-fit gap-4 lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Detail icon={CalendarDays} label="Fecha">
              {capitalize(formatDate(meeting.fecha_inicio, "long"))}
            </Detail>
            <Detail icon={Clock} label="Horario">
              {formatTime(meeting.fecha_inicio)}
              {meeting.fecha_fin ? ` – ${formatTime(meeting.fecha_fin)}` : ""}
              {meeting.fecha_fin && (
                <span className="text-muted-foreground"> · {formatDuration(meeting.fecha_inicio, meeting.fecha_fin)}</span>
              )}
            </Detail>
            <Detail icon={Building2} label="Cliente">
              {meeting.client ? (
                <Link href={`/clientes/${meeting.client.id}`} className="hover:text-brand">
                  {clientLabel}
                </Link>
              ) : (
                <span className="text-muted-foreground">Reunión interna</span>
              )}
            </Detail>
            <Detail icon={Briefcase} label="Proyecto">
              {meeting.project ? (
                <Link href={`/proyectos/${meeting.project.id}`} className="hover:text-brand">
                  {meeting.project.nombre}
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Detail>
            <Detail icon={Users} label="Participantes">
              {meeting.participantes || <span className="text-muted-foreground">—</span>}
            </Detail>
            <Detail icon={Link2} label="Enlace">
              {meeting.link ? (
                <a href={meeting.link} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:underline">
                  {meeting.link.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Detail>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-0.5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}
