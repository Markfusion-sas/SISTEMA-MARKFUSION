import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Minus,
  Repeat,
  Video,
  type LucideIcon,
} from "lucide-react";

import type { Moneda, Profile, TareaPrioridad } from "@/types/database";
import { COBRO_ESTADOS, REUNION_TIPOS } from "@/lib/constants";
import { receivableStatus } from "@/lib/finance";
import {
  addDaysISO,
  bogotaParts,
  capitalize,
  formatDate,
  formatMoney,
  formatPercent,
  formatRelativeDay,
  formatTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/sparkline";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  previousLabel,
  invert = false,
  hint,
  href,
  trend,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Valores de los últimos meses (el último es el mes actual) para la mini tendencia. */
  trend?: number[];
  /** Variación relativa vs el mes anterior (0.12 = +12 %). null si no hay base. */
  delta: number | null;
  previousLabel: string;
  /** true cuando subir es malo (gastos, por cobrar). */
  invert?: boolean;
  hint?: string;
  href?: string;
}) {
  const flat = delta !== null && Math.abs(delta) < 0.005;
  const up = delta !== null && delta > 0;
  const good = delta === null || flat ? null : invert ? !up : up;
  const DeltaIcon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  const content = (
    <Card interactive={Boolean(href)} className="h-full gap-3 py-4">
      <div className="flex items-center justify-between px-4">
        <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Icon className="size-4" />
          </span>
          {label}
        </span>
        {href && <ArrowUpRight className="size-4 text-muted-foreground/60" />}
      </div>
      <div className="px-4">
        <div className="truncate text-[26px] leading-tight font-semibold tracking-tight">{value}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {delta === null ? (
            <span className="text-muted-foreground">Sin base del mes anterior</span>
          ) : (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                  good === null && "bg-muted text-muted-foreground",
                  good === true && "bg-success/10 text-success",
                  good === false && "bg-destructive/10 text-destructive",
                )}
              >
                <DeltaIcon className="size-3.5" aria-hidden />
                {flat ? "0 %" : formatPercent(Math.abs(delta))}
                <span className="sr-only">{up ? "más" : "menos"}</span>
              </span>
              <span className="text-muted-foreground">vs {previousLabel}</span>
            </>
          )}
          {hint && <span className="text-muted-foreground">· {hint}</span>}
        </div>
      </div>
      {trend && trend.length > 1 && (
        <div className="mt-auto px-4">
          <Sparkline values={trend} label={`Tendencia de ${label.toLowerCase()} en los últimos ${trend.length} meses`} />
        </div>
      )}
    </Card>
  );

  return href ? (
    <Link href={href} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
      {content}
    </Link>
  ) : (
    content
  );
}

// ---------------------------------------------------------------------------
// Tareas vencidas y de esta semana por persona
// ---------------------------------------------------------------------------

export interface DashboardTask {
  id: string;
  titulo: string;
  prioridad: TareaPrioridad;
  fecha_limite: string;
  responsable_id: string | null;
  proyecto: string | null;
}

const PRIORITY_DOT: Record<TareaPrioridad, string> = {
  alta: "bg-destructive",
  media: "bg-warning",
  baja: "bg-muted-foreground/50",
};

export function TasksByPerson({ tasks, team, today }: { tasks: DashboardTask[]; team: Profile[]; today: string }) {
  const groups = [
    ...team.map((m) => ({ key: m.id, member: m as Profile | null, tasks: tasks.filter((t) => t.responsable_id === m.id) })),
    { key: "sin", member: null, tasks: tasks.filter((t) => !t.responsable_id) },
  ].filter((g) => g.member || g.tasks.length);

  const overdueTotal = tasks.filter((t) => t.fecha_limite < today).length;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Tareas de la semana</CardTitle>
        <CardDescription>
          {tasks.length ? `${tasks.length} abiertas hasta el domingo` : "Nada pendiente para esta semana"}
          {overdueTotal > 0 && <span className="text-destructive"> · {overdueTotal} vencidas</span>}
        </CardDescription>
        <CardAction>
          <Link href="/tareas?vista=mi-dia" className="text-xs text-muted-foreground hover:text-foreground">
            Mi día
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map(({ key, member, tasks: list }) => {
            const overdue = list.filter((t) => t.fecha_limite < today);
            const week = list.filter((t) => t.fecha_limite >= today);
            return (
              <div key={key} className="rounded-xl border bg-muted/15 p-3">
                <div className="mb-3 flex items-center gap-2.5">
                  <UserAvatar profile={member} className="size-7" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{member ? member.nombre : "Sin asignar"}</div>
                    <div className="text-xs text-muted-foreground">
                      {overdue.length > 0 && <span className="font-medium text-destructive">{overdue.length} vencidas · </span>}
                      {week.length} esta semana
                    </div>
                  </div>
                  {member && (
                    <span className="h-6 w-1 rounded-full" style={{ backgroundColor: member.color }} aria-hidden />
                  )}
                </div>
                {list.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg px-2 py-3 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-4 text-success" />
                    Al día. Nada vencido ni para esta semana.
                  </div>
                ) : (
                  <ul className="space-y-0.5">
                    {[...overdue, ...week].slice(0, 6).map((t) => {
                      const isOverdue = t.fecha_limite < today;
                      return (
                        <li key={t.id}>
                          <Link
                            href={`/tareas?vista=lista&tarea=${t.id}`}
                            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-background/70"
                          >
                            <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[t.prioridad])} aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px]">{t.titulo}</span>
                              {t.proyecto && <span className="block truncate text-[11px] text-muted-foreground">{t.proyecto}</span>}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 text-[11px]",
                                isOverdue ? "font-medium text-destructive" : t.fecha_limite === today ? "font-medium text-warning" : "text-muted-foreground",
                              )}
                            >
                              {formatRelativeDay(t.fecha_limite)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                    {list.length > 6 && (
                      <li className="px-2 pt-1 text-[11px] text-muted-foreground">+{list.length - 6} más en el tablero</li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Reuniones de hoy y próximas
// ---------------------------------------------------------------------------

export interface DashboardMeeting {
  id: string;
  titulo: string;
  tipo: keyof typeof REUNION_TIPOS;
  fecha_inicio: string;
  fecha_fin: string | null;
  link: string | null;
  cliente: string | null;
}

export function UpcomingMeetings({ meetings, today }: { meetings: DashboardMeeting[]; today: string }) {
  const todays = meetings.filter((m) => bogotaParts(m.fecha_inicio).date === today);
  const next = meetings.filter((m) => bogotaParts(m.fecha_inicio).date !== today);
  const now = Date.now();

  const row = (m: DashboardMeeting) => {
    const start = new Date(m.fecha_inicio).getTime();
    const end = m.fecha_fin ? new Date(m.fecha_fin).getTime() : start + 60 * 60 * 1000;
    const live = now >= start && now <= end;
    const date = bogotaParts(m.fecha_inicio).date;
    return (
      <li key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40">
        <div className="w-14 shrink-0 text-right">
          <div className="text-[13px] font-semibold tabular">{formatTime(m.fecha_inicio).replace(/\s?[ap]\. m\./, "")}</div>
          <div className="text-[10px] text-muted-foreground uppercase">
            {date === today ? formatTime(m.fecha_inicio).match(/[ap]\. m\./)?.[0] : formatRelativeDay(date)}
          </div>
        </div>
        <span className={cn("h-8 w-0.5 shrink-0 rounded-full", live ? "bg-success" : "bg-brand/40")} aria-hidden />
        <Link href={`/reuniones/${m.id}`} className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{m.titulo}</div>
          <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            {live && (
              <Badge tone="success" dot className="py-0 text-[10px]">
                En curso
              </Badge>
            )}
            <span>{REUNION_TIPOS[m.tipo].label}</span>
            {m.cliente && <span className="truncate">· {m.cliente}</span>}
          </div>
        </Link>
        {m.link && (date === today) && (
          <a
            href={m.link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`Unirse a ${m.titulo}`}
            title="Unirse"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </li>
    );
  };

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Reuniones</CardTitle>
        <CardDescription>
          {todays.length ? `${todays.length} hoy` : "Sin reuniones hoy"}
          {next.length ? ` · ${next.length} próximas` : ""}
        </CardDescription>
        <CardAction>
          <Link href="/calendario" className="text-xs text-muted-foreground hover:text-foreground">
            Calendario
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            <Video className="size-5" />
            No hay reuniones programadas en los próximos días.
          </div>
        ) : (
          <>
            {todays.length > 0 && (
              <section>
                <h4 className="mb-1 px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Hoy</h4>
                <ul>{todays.map(row)}</ul>
              </section>
            )}
            {next.length > 0 && (
              <section>
                <h4 className="mb-1 px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Próximas</h4>
                <ul>{next.map(row)}</ul>
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Próximos cobros
// ---------------------------------------------------------------------------

export interface DashboardReceivable {
  id: string;
  concepto: string;
  monto: number;
  moneda: Moneda;
  estado: "pendiente" | "pagado";
  fecha_vencimiento: string | null;
  /** A quién se cobra cuando no hay proyecto (texto libre). */
  cliente: string | null;
  project: { id: string; nombre: string; cliente: string | null } | null;
}

export function UpcomingReceivables({ receivables, today }: { receivables: DashboardReceivable[]; today: string }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Próximos cobros</CardTitle>
        <CardDescription>Vencidos primero, luego por fecha</CardDescription>
        <CardAction>
          <Link href="/finanzas?tab=por-cobrar" className="text-xs text-muted-foreground hover:text-foreground">
            Ver todos
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {receivables.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 text-success" />
            No hay cobros pendientes.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {receivables.map((r) => {
              const status = receivableStatus(r, today);
              const info = COBRO_ESTADOS[status];
              return (
                <li key={r.id}>
                  <Link
                    href={r.project ? `/proyectos/${r.project.id}` : "/finanzas?tab=por-cobrar"}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.project?.cliente ?? r.project?.nombre ?? r.cliente ?? r.concepto}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.concepto}
                        {r.project ? ` · ${r.project.nombre}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={cn("text-sm font-semibold tabular", status === "vencido" && "text-destructive")}>
                        {formatMoney(r.monto, r.moneda)}
                      </div>
                      <div className={cn("text-[11px]", status === "vencido" ? "text-destructive" : "text-muted-foreground")}>
                        {status === "vencido" ? info.label : r.fecha_vencimiento ? formatRelativeDay(r.fecha_vencimiento) : ""}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Gastos recurrentes del mes
// ---------------------------------------------------------------------------

export interface DashboardRecurring {
  id: string;
  nombre: string;
  monto: number;
  moneda: Moneda;
  fecha: string;
  pagado: boolean;
}

export function RecurringThisMonth({ items, monthLabel, today }: { items: DashboardRecurring[]; monthLabel: string; today: string }) {
  const total = items.filter((i) => i.moneda === "COP").reduce((s, i) => s + Number(i.monto), 0);
  const pending = items.filter((i) => !i.pagado);

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Gastos recurrentes de {monthLabel.toLowerCase()}</CardTitle>
        <CardDescription>
          {items.length ? `${formatMoney(total)} en costos fijos · ${pending.length} por registrar` : "Sin costos fijos activos"}
        </CardDescription>
        <CardAction>
          <Link href="/finanzas?tab=recurrentes" className="text-xs text-muted-foreground hover:text-foreground">
            Gestionar
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            <Repeat className="size-5" />
            Agrega tus suscripciones y costos fijos en Finanzas.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {items.map((i) => {
              const late = !i.pagado && i.fecha < today;
              return (
                <li key={i.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                  {i.pagado ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Registrado" />
                  ) : (
                    <CircleDashed className={cn("size-4 shrink-0", late ? "text-warning" : "text-muted-foreground")} aria-label="Por registrar" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate text-sm", i.pagado && "text-muted-foreground")}>{i.nombre}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CalendarClock className="size-3" />
                      {i.pagado ? "Registrado" : late ? `Cobró el ${formatDate(i.fecha, "month")}` : capitalize(formatRelativeDay(i.fecha))}
                    </div>
                  </div>
                  <span className={cn("text-sm font-medium tabular", i.pagado && "text-muted-foreground")}>
                    {formatMoney(i.monto, i.moneda)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Fin de semana (domingo) de una fecha "YYYY-MM-DD". */
export function endOfWeek(date: string) {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDaysISO(date, (7 - dow) % 7);
}
