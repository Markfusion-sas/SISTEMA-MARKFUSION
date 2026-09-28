"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCheck,
  CheckSquare,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import type { Meeting, ReunionTipo } from "@/types/database";
import { REUNION_ESTADOS, REUNION_TIPOS, REUNION_TIPO_OPTIONS } from "@/lib/constants";
import { bogotaParts, capitalize, formatDate, formatDuration, formatTime, todayISO, addDaysISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteMeetingAction, setMeetingStatusAction } from "@/app/(app)/reuniones/actions";
import {
  MeetingFormDialog,
  type MeetingClientOption,
  type MeetingProjectOption,
} from "@/components/meetings/meeting-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput, normalize } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type MeetingRow = Meeting & {
  client: { id: string; nombre: string; empresa: string | null } | null;
  project: { id: string; nombre: string } | null;
  tasks: { estado: string }[];
};

type Tab = "proximas" | "por_cerrar" | "realizadas" | "canceladas";

function dayLabel(date: string, today: string) {
  if (date === today) return "Hoy";
  if (date === addDaysISO(today, 1)) return "Mañana";
  return capitalize(formatDate(date, "full").replace(/ de \d{4}$/, ""));
}

export function MeetingsView({
  meetings,
  clients,
  projects,
}: {
  meetings: MeetingRow[];
  clients: MeetingClientOption[];
  projects: MeetingProjectOption[];
}) {
  const today = todayISO();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<ReunionTipo | "todos">("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [deleting, setDeleting] = useState<MeetingRow | null>(null);

  const classified = useMemo(() => {
    const dateOf = (m: MeetingRow) => bogotaParts(m.fecha_inicio).date;
    return {
      proximas: meetings
        .filter((m) => m.estado === "programada" && dateOf(m) >= today)
        .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio)),
      por_cerrar: meetings
        .filter((m) => m.estado === "programada" && dateOf(m) < today)
        .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)),
      realizadas: meetings
        .filter((m) => m.estado === "realizada")
        .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)),
      canceladas: meetings
        .filter((m) => m.estado === "cancelada")
        .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)),
    };
  }, [meetings, today]);

  const [tab, setTab] = useState<Tab>(classified.proximas.length || !classified.realizadas.length ? "proximas" : "realizadas");

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return classified[tab].filter((m) => {
      if (tipo !== "todos" && m.tipo !== tipo) return false;
      if (!q) return true;
      return [m.titulo, m.participantes, m.client?.nombre, m.client?.empresa, m.project?.nombre].some((f) =>
        normalize(f).includes(q),
      );
    });
  }, [classified, tab, tipo, search]);

  // Próximas: por día. El resto: por mes.
  const groups = useMemo(() => {
    const map = new Map<string, MeetingRow[]>();
    for (const m of visible) {
      const date = bogotaParts(m.fecha_inicio).date;
      const key = tab === "proximas" ? dayLabel(date, today) : capitalize(formatDate(date, "monthYear"));
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [visible, tab, today]);

  const chips = [
    { value: "proximas" as Tab, label: "Próximas", count: classified.proximas.length },
    ...(classified.por_cerrar.length
      ? [{ value: "por_cerrar" as Tab, label: "Por cerrar", count: classified.por_cerrar.length }]
      : []),
    { value: "realizadas" as Tab, label: "Realizadas", count: classified.realizadas.length },
    { value: "canceladas" as Tab, label: "Canceladas", count: classified.canceladas.length },
  ];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const setStatus = async (m: MeetingRow, estado: Meeting["estado"]) => {
    const result = await setMeetingStatusAction(m.id, estado);
    if (!result.ok) return void toast.error(result.error);
    toast.success(estado === "realizada" ? "Reunión marcada como realizada" : estado === "cancelada" ? "Reunión cancelada" : "Reunión reprogramada");
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteMeetingAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Reunión eliminada");
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reuniones"
        description="Agenda, notas, decisiones y las tareas que salen de cada reunión."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Nueva reunión
          </Button>
        }
      />

      {meetings.length === 0 ? (
        <EmptyState
          icon={Video}
          title="Aún no hay reuniones"
          description="Programa una reunión de venta, un kickoff o la weekly del equipo."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Programar reunión
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterChips options={chips} value={tab} onChange={setTab} />
            <div className="flex gap-2">
              <Select value={tipo} onValueChange={(v) => setTipo(v as ReunionTipo | "todos")}>
                <SelectTrigger className="w-40 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {REUNION_TIPO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar reunión…" className="w-full lg:w-64" />
            </div>
          </div>

          {tab === "por_cerrar" && visible.length > 0 && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              Estas reuniones ya pasaron pero siguen como programadas. Márcalas como realizadas o canceladas.
            </p>
          )}

          {visible.length === 0 ? (
            <EmptyState
              compact
              icon={SearchX}
              title={tab === "proximas" && !search && tipo === "todos" ? "No hay reuniones próximas" : "Sin resultados"}
              description={
                tab === "proximas" && !search && tipo === "todos"
                  ? "Programa la siguiente reunión con un cliente o del equipo."
                  : "Prueba con otra búsqueda o cambia el tipo."
              }
              action={
                tab === "proximas" && !search && tipo === "todos" ? (
                  <Button onClick={openCreate}>
                    <Plus />
                    Nueva reunión
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-6">
              {groups.map(([label, items]) => (
                <section key={label} className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
                  <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
                    {items.map((m) => (
                      <MeetingListItem
                        key={m.id}
                        meeting={m}
                        upcoming={tab === "proximas"}
                        onEdit={() => {
                          setEditing(m);
                          setFormOpen(true);
                        }}
                        onDelete={() => setDeleting(m)}
                        onStatus={(estado) => setStatus(m, estado)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <MeetingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        meeting={editing}
        clients={clients}
        projects={projects}
        goToDetail={!editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar "${deleting?.titulo}"?`}
        description="Se borran la agenda, las notas y las decisiones. Las tareas creadas en la reunión se conservan."
        onConfirm={handleDelete}
      />
    </div>
  );
}

function MeetingListItem({
  meeting: m,
  upcoming,
  onEdit,
  onDelete,
  onStatus,
}: {
  meeting: MeetingRow;
  upcoming: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (estado: Meeting["estado"]) => void;
}) {
  const router = useRouter();
  const start = bogotaParts(m.fecha_inicio);
  const tipo = REUNION_TIPOS[m.tipo];
  const tasksOpen = m.tasks.filter((t) => t.estado !== "hecha").length;
  const cliente = m.client ? m.client.empresa || m.client.nombre : null;
  const pastProgrammed = m.estado === "programada" && !upcoming;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/reuniones/${m.id}`)}
      onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && router.push(`/reuniones/${m.id}`)}
      className="flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors outline-none hover:bg-muted/30 focus-visible:bg-muted/40"
    >
      <div
        className={cn(
          "flex w-14 shrink-0 flex-col items-center rounded-lg border py-1.5 text-center",
          upcoming ? "border-brand/30 bg-brand/5" : "bg-muted/30",
          m.estado === "cancelada" && "opacity-60",
        )}
      >
        <span className="text-sm leading-tight font-semibold tabular">{formatTime(m.fecha_inicio).replace(/\s?[ap]\. m\./, "")}</span>
        <span className="text-[10px] text-muted-foreground uppercase">
          {formatTime(m.fecha_inicio).match(/[ap]\. m\./)?.[0] ?? ""}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className={cn("truncate text-sm font-medium", m.estado === "cancelada" && "text-muted-foreground line-through")}>
          {m.titulo}
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <Badge tone={tipo.tone} className="py-0 text-[11px]">
            {tipo.label}
          </Badge>
          {!upcoming && <span>{formatDate(start.date, "month")}</span>}
          {m.fecha_fin && <span>{formatDuration(m.fecha_inicio, m.fecha_fin)}</span>}
          {cliente && <span className="truncate">{cliente}</span>}
          {m.project && <span className="hidden truncate md:inline">· {m.project.nombre}</span>}
          {m.participantes && (
            <span className="hidden items-center gap-1 lg:inline-flex">
              <Users className="size-3" />
              <span className="max-w-52 truncate">{m.participantes}</span>
            </span>
          )}
          {m.tasks.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="size-3" />
              {tasksOpen ? `${tasksOpen} pendientes` : `${m.tasks.length} hechas`}
            </span>
          )}
          {m.estado !== "programada" && (
            <Badge tone={REUNION_ESTADOS[m.estado].tone} className="py-0 text-[11px]">
              {REUNION_ESTADOS[m.estado].label}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {upcoming && m.link && (
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
            <a href={m.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Unirse
            </a>
          </Button>
        )}
        {pastProgrammed && (
          <Button size="sm" variant="outline" onClick={() => onStatus("realizada")} className="hidden sm:inline-flex">
            <CheckCheck />
            Realizada
          </Button>
        )}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${m.titulo}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem asChild>
              <Link href={`/reuniones/${m.id}`}>
                <Video />
                Abrir reunión
              </Link>
            </DropdownMenuItem>
            {m.link && (
              <DropdownMenuItem asChild>
                <a href={m.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Unirse
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            {m.estado !== "realizada" && (
              <DropdownMenuItem onSelect={() => onStatus("realizada")}>
                <CheckCheck />
                Marcar como realizada
              </DropdownMenuItem>
            )}
            {m.estado === "programada" && (
              <DropdownMenuItem onSelect={() => onStatus("cancelada")}>
                <Ban />
                Cancelar reunión
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
