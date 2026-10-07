"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock,
  CalendarCheck,
  CircleCheck,
  CircleDollarSign,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat2,
  RotateCcw,
  SearchX,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { formatTotals, sumByCurrency } from "@/lib/finance";
import { capitalize, formatDate, formatMoney, shiftMonth, todayISO } from "@/lib/format";
import {
  dueDateInMonth,
  monthStatus,
  overdueMonths,
  paidKeySet,
  type MonthStatus,
} from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import {
  deleteSubscriptionAction,
  toggleSubscriptionAction,
  undoSubscriptionPaymentAction,
} from "@/app/(app)/mensualidades/actions";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { MonthPicker } from "@/components/finance/month-picker";
import type { CategoryOption } from "@/components/finance/types";
import { PayMonthDialog } from "@/components/subscriptions/pay-month-dialog";
import {
  SubscriptionFormDialog,
  type SubscriptionClientOption,
} from "@/components/subscriptions/subscription-form-dialog";
import { subscriptionWho, type PaymentRow, type SubscriptionRow } from "@/components/subscriptions/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput, normalize } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StatusFilter = "todas" | "pendientes" | "vencidas" | "pagadas";

const STATUS_INFO: Record<Exclude<MonthStatus, "no_aplica">, { label: string; tone: "success" | "warning" | "danger" }> = {
  pagada: { label: "Pagada", tone: "success" },
  pendiente: { label: "Pendiente", tone: "warning" },
  vencida: { label: "Vencida", tone: "danger" },
};

const DOT: Record<MonthStatus, string> = {
  pagada: "bg-success",
  pendiente: "border border-warning bg-warning/20",
  vencida: "bg-destructive",
  no_aplica: "bg-foreground/10",
};

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function SubscriptionsView({
  subscriptions,
  payments,
  clients,
  projects,
  categories,
}: {
  subscriptions: SubscriptionRow[];
  payments: PaymentRow[];
  clients: SubscriptionClientOption[];
  projects: { id: string; nombre: string; cliente: string | null }[];
  categories: CategoryOption[];
}) {
  const today = todayISO();
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  const [paying, setPaying] = useState<SubscriptionRow | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [undoing, setUndoing] = useState<{ payment: PaymentRow; sub: SubscriptionRow } | null>(null);
  const [deleting, setDeleting] = useState<SubscriptionRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const paid = useMemo(() => paidKeySet(payments), [payments]);
  const paymentOf = (subId: string, m: string) =>
    payments.find((p) => p.subscription_id === subId && p.periodo.slice(0, 7) === m) ?? null;

  const active = subscriptions.filter((s) => s.activo);
  const mrr = sumByCurrency(active.map((s) => ({ monto: s.monto, moneda: s.moneda })));

  // Mensualidades del mes elegido: las activas que ya empezaron, más las pausadas que se pagaron ese mes.
  const monthRows = useMemo(() => {
    return subscriptions
      .map((s) => ({ s, status: monthStatus(s, month, paid, today) }))
      .filter(({ s, status }) => status !== "no_aplica" && (s.activo || status === "pagada"));
  }, [subscriptions, month, paid, today]);

  const monthPayments = payments.filter((p) => p.periodo.slice(0, 7) === month);
  const cobrado = sumByCurrency(monthPayments);
  const pendientes = monthRows.filter((r) => r.status !== "pagada");
  const pendiente = sumByCurrency(pendientes.map(({ s }) => ({ monto: s.monto, moneda: s.moneda })));

  // Atrasado: meses vencidos sin pagar (últimos 12 meses) de las mensualidades activas.
  const overdue = active.map((s) => ({ s, months: overdueMonths(s, paid, today) })).filter((o) => o.months.length);
  const atrasado = sumByCurrency(overdue.flatMap(({ s, months }) => months.map(() => ({ monto: s.monto, moneda: s.moneda }))));
  const overdueCount = overdue.reduce((n, o) => n + o.months.length, 0);

  const matches = (s: SubscriptionRow) => {
    const q = normalize(search.trim());
    if (!q) return true;
    return [subscriptionWho(s), s.servicio, s.notas, s.project?.nombre].some((f) => normalize(f).includes(q));
  };

  const order: Record<MonthStatus, number> = { vencida: 0, pendiente: 1, pagada: 2, no_aplica: 3 };
  const visibleMonthRows = monthRows
    .filter(({ status }) =>
      filter === "todas"
        ? true
        : filter === "pagadas"
          ? status === "pagada"
          : filter === "vencidas"
            ? status === "vencida"
            : status !== "pagada",
    )
    .filter(({ s }) => matches(s))
    .sort((a, b) => order[a.status] - order[b.status] || a.s.dia_cobro - b.s.dia_cobro);

  const allRows = subscriptions
    .filter(matches)
    .sort((a, b) => Number(b.activo) - Number(a.activo) || subscriptionWho(a).localeCompare(subscriptionWho(b), "es"));

  const history = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const monthLabel = capitalize(formatDate(`${month}-15`, "monthYear"));

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: SubscriptionRow) => {
    setEditing(s);
    setFormOpen(true);
  };

  const toggle = async (s: SubscriptionRow, value: boolean) => {
    setBusy(s.id);
    const result = await toggleSubscriptionAction(s.id, value);
    setBusy(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(value ? `${s.servicio} reactivada` : `${s.servicio} pausada`);
  };

  const handleUndo = async () => {
    if (!undoing) return;
    const result = await undoSubscriptionPaymentAction(undoing.payment.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Pago deshecho: el mes volvió a pendiente");
    setUndoing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteSubscriptionAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Mensualidad eliminada");
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensualidades"
        description="Lo que cada cliente paga mes a mes: hosting, mantenimiento, bots y sistemas."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Nueva mensualidad
          </Button>
        }
      />

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat2}
          title="Aún no hay mensualidades"
          description="Registra lo que cada cliente paga cada mes y lleva el control de quién está al día."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Crear la primera
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Ingreso mensual recurrente"
              icon={Repeat2}
              tone="brand"
              value={formatTotals(mrr)}
              hint={`${active.length} ${active.length === 1 ? "mensualidad activa" : "mensualidades activas"}`}
            />
            <StatCard
              label={`Cobrado en ${monthLabel.toLowerCase()}`}
              icon={CircleCheck}
              tone="success"
              value={formatTotals(cobrado)}
              hint={`${monthPayments.length} ${monthPayments.length === 1 ? "pago" : "pagos"}`}
            />
            <StatCard
              label={`Pendiente en ${monthLabel.toLowerCase()}`}
              icon={Wallet}
              tone={pendientes.length ? "warning" : "default"}
              value={formatTotals(pendiente)}
              hint={pendientes.length ? `${pendientes.length} por cobrar` : "Todo cobrado"}
            />
            <StatCard
              label="Atrasado"
              icon={AlarmClock}
              tone={overdueCount ? "danger" : "default"}
              value={formatTotals(atrasado)}
              hint={overdueCount ? `${overdueCount} ${overdueCount === 1 ? "mes vencido" : "meses vencidos"} sin pagar` : "Nadie atrasado"}
            />
          </div>

          <Tabs defaultValue="mes">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList>
                <TabsTrigger value="mes">
                  <CalendarCheck />
                  Cobro del mes
                </TabsTrigger>
                <TabsTrigger value="todas">
                  <Repeat2 />
                  Todas
                  <span className="rounded-full bg-foreground/[0.07] px-1.5 text-[11px] text-muted-foreground tabular">
                    {subscriptions.length}
                  </span>
                </TabsTrigger>
              </TabsList>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar cliente o servicio…" className="w-full lg:w-72" />
            </div>

            {/* Cobro del mes */}
            <TabsContent value="mes" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <MonthPicker month={month} onChange={setMonth} max={shiftMonth(currentMonth, 3)} />
                <FilterChips
                  options={[
                    { value: "todas" as StatusFilter, label: "Todas", count: monthRows.length },
                    { value: "pendientes" as StatusFilter, label: "Por cobrar", count: pendientes.length },
                    { value: "vencidas" as StatusFilter, label: "Vencidas", count: monthRows.filter((r) => r.status === "vencida").length },
                    { value: "pagadas" as StatusFilter, label: "Pagadas", count: monthRows.filter((r) => r.status === "pagada").length },
                  ]}
                  value={filter}
                  onChange={setFilter}
                />
              </div>

              {visibleMonthRows.length === 0 ? (
                <EmptyState
                  compact
                  icon={SearchX}
                  title={monthRows.length ? "Nada en esta vista" : `Sin mensualidades en ${monthLabel.toLowerCase()}`}
                  description={monthRows.length ? "Cambia el filtro o la búsqueda." : "Ninguna mensualidad activa había empezado en ese mes."}
                />
              ) : (
                <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
                  {visibleMonthRows.map(({ s, status }) => {
                    const info = STATUS_INFO[status as Exclude<MonthStatus, "no_aplica">];
                    const payment = paymentOf(s.id, month);
                    const due = dueDateInMonth(s.dia_cobro, month);
                    return (
                      <div key={s.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <ClientAvatar nombre={subscriptionWho(s)} />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium">{subscriptionWho(s)}</span>
                              <Badge tone={info.tone} dot className="py-0 text-[11px]">
                                {info.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                              <span className="truncate">{s.servicio}</span>
                              <span className={cn(status === "vencida" && "font-medium text-destructive")}>
                                ·{" "}
                                {payment
                                  ? `Pagada el ${formatDate(payment.fecha_pago, "month")}${payment.metodo_pago ? ` · ${payment.metodo_pago}` : ""}`
                                  : status === "vencida"
                                    ? `Venció el ${formatDate(due, "month")}`
                                    : `Vence el ${formatDate(due, "month")}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 lg:justify-end">
                          {/* Últimos 6 meses */}
                          <div className="flex items-center gap-1" aria-label="Historial de los últimos 6 meses">
                            {history.map((m) => {
                              const st = monthStatus(s, m, paid, today);
                              return (
                                <span
                                  key={m}
                                  title={`${MONTHS_SHORT[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}: ${
                                    st === "no_aplica" ? "no aplica" : STATUS_INFO[st].label.toLowerCase()
                                  }`}
                                  className={cn("size-2.5 rounded-full", DOT[st], m === month && "ring-2 ring-foreground/30 ring-offset-1 ring-offset-card")}
                                />
                              );
                            })}
                          </div>
                          <div className="w-28 text-right text-base font-semibold tabular">{formatMoney(s.monto, s.moneda)}</div>
                          <div className="flex items-center gap-1">
                            {status !== "pagada" ? (
                              <Button
                                size="sm"
                                variant={status === "vencida" ? "default" : "outline"}
                                onClick={() => {
                                  setPaying(s);
                                  setPayOpen(true);
                                }}
                              >
                                <CircleCheck />
                                Marcar pagada
                              </Button>
                            ) : (
                              <span className="hidden w-[132px] sm:block" />
                            )}
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {payment && (
                                  <DropdownMenuItem onSelect={() => setUndoing({ payment, sub: s })}>
                                    <RotateCcw />
                                    Deshacer pago
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => openEdit(s)}>
                                  <Pencil />
                                  Editar mensualidad
                                </DropdownMenuItem>
                                {s.activo && (
                                  <DropdownMenuItem onSelect={() => toggle(s, false)}>
                                    <Pause />
                                    Pausar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-full", DOT.pagada)} /> Pagada
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-full", DOT.pendiente)} /> Pendiente
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-full", DOT.vencida)} /> Vencida
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-full", DOT.no_aplica)} /> Aún no empezaba
                </span>
                <span>· Los puntos son los últimos 6 meses hasta el mes elegido.</span>
              </div>
            </TabsContent>

            {/* Todas */}
            <TabsContent value="todas">
              {allRows.length === 0 ? (
                <EmptyState compact icon={SearchX} title="Sin resultados" description="Prueba con otra búsqueda." />
              ) : (
                <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
                  {allRows.map((s) => {
                    const late = s.activo ? overdueMonths(s, paid, today).length : 0;
                    return (
                      <div
                        key={s.id}
                        className={cn("flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center", !s.activo && "opacity-60")}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <ClientAvatar nombre={subscriptionWho(s)} />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium">{subscriptionWho(s)}</span>
                              {!s.activo && <Badge tone="neutral" className="py-0 text-[11px]">Pausada</Badge>}
                              {late > 0 && (
                                <Badge tone="danger" dot className="py-0 text-[11px]">
                                  {late} {late === 1 ? "mes atrasado" : "meses atrasados"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                              <span className="truncate">{s.servicio}</span>
                              <span>· Día {s.dia_cobro} de cada mes</span>
                              <span>· Desde {formatDate(s.fecha_inicio, "monthYear")}</span>
                              {s.project && <span className="truncate">· {s.project.nombre}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <div className="text-right">
                            <div className="text-base font-semibold tabular">{formatMoney(s.monto, s.moneda)}</div>
                            <div className="text-[11px] text-muted-foreground">al mes</div>
                          </div>
                          <Switch
                            checked={s.activo}
                            onCheckedChange={(v) => toggle(s, v)}
                            disabled={busy === s.id}
                            aria-label={s.activo ? "Pausar mensualidad" : "Reactivar mensualidad"}
                          />
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openEdit(s)}>
                                <Pencil />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => toggle(s, !s.activo)}>
                                {s.activo ? <Pause /> : <Play />}
                                {s.activo ? "Pausar" : "Reactivar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(s)}>
                                <Trash2 />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleDollarSign className="size-3.5" />
            Cada pago se registra como ingreso en Finanzas (categoría Fee mensual). Si borras ese ingreso, el mes vuelve a
            quedar pendiente.
          </p>
        </>
      )}

      <SubscriptionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        subscription={editing}
        clients={clients}
        projects={projects}
      />
      <PayMonthDialog open={payOpen} onOpenChange={setPayOpen} subscription={paying} month={month} categories={categories} />
      <ConfirmDialog
        open={Boolean(undoing)}
        onOpenChange={(v) => !v && setUndoing(null)}
        title="¿Deshacer este pago?"
        description="El mes vuelve a quedar pendiente y se elimina el ingreso que se registró en Finanzas."
        confirmLabel="Deshacer pago"
        onConfirm={handleUndo}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`¿Eliminar la mensualidad de ${deleting ? subscriptionWho(deleting) : ""}?`}
        description="Se borra la mensualidad y su historial de meses pagados. Los ingresos ya registrados en Finanzas se conservan. Si solo dejó de pagar por un tiempo, mejor páusala."
        onConfirm={handleDelete}
      />
    </div>
  );
}
