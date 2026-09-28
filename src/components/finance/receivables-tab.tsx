"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlarmClock, CircleCheck, MoreHorizontal, Pencil, Plus, Receipt, RotateCcw, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { COBRO_ESTADOS } from "@/lib/constants";
import { compareDueDates, formatTotals, receivableStatus, sumByCurrency, type CobroEstadoVista } from "@/lib/finance";
import { diffDaysISO, formatDate, formatMoney, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteReceivableAction, undoReceivablePaymentAction } from "@/app/(app)/finanzas/actions";
import { AgingChart } from "@/components/charts/aging-chart";
import { MarkPaidDialog, ReceivableFormDialog } from "@/components/finance/receivable-dialogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryOption, FinanceProjectOption, ReceivableRow } from "@/components/finance/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
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

type Filter = "abiertos" | "vencidos" | "pagados" | "todos";

export function ReceivablesTab({
  receivables,
  categories,
  projects,
}: {
  receivables: ReceivableRow[];
  categories: CategoryOption[];
  projects: FinanceProjectOption[];
}) {
  const today = todayISO();
  const [filter, setFilter] = useState<Filter>("abiertos");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReceivableRow | null>(null);
  const [paying, setPaying] = useState<ReceivableRow | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [deleting, setDeleting] = useState<ReceivableRow | null>(null);
  const [undoing, setUndoing] = useState<ReceivableRow | null>(null);

  const withStatus = useMemo(
    () => receivables.map((r) => ({ ...r, status: receivableStatus(r, today) as CobroEstadoVista })),
    [receivables, today],
  );

  const open = withStatus.filter((r) => r.status !== "pagado");
  const overdue = withStatus.filter((r) => r.status === "vencido");
  const monthPrefix = today.slice(0, 7);
  const paidThisMonth = withStatus.filter((r) => r.status === "pagado" && r.pagado_en?.startsWith(monthPrefix));
  const next30 = open.filter(
    (r) => r.status === "pendiente" && r.fecha_vencimiento !== null && diffDaysISO(today, r.fecha_vencimiento) <= 30,
  );

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return withStatus
      .filter((r) => {
        if (filter === "abiertos" && r.status === "pagado") return false;
        if (filter === "vencidos" && r.status !== "vencido") return false;
        if (filter === "pagados" && r.status !== "pagado") return false;
        if (!q) return true;
        return [r.concepto, r.cliente, r.project?.nombre, r.project?.client?.nombre, r.project?.client?.empresa].some((f) =>
          normalize(f).includes(q),
        );
      })
      .sort((a, b) =>
        filter === "pagados"
          ? (b.pagado_en ?? "").localeCompare(a.pagado_en ?? "")
          : compareDueDates(a.fecha_vencimiento, b.fecha_vencimiento),
      );
  }, [withStatus, filter, search]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteReceivableAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Cobro eliminado");
    setDeleting(null);
  };

  const handleUndo = async () => {
    if (!undoing) return;
    const result = await undoReceivablePaymentAction(undoing.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Pago deshecho: el cobro volvió a pendiente");
    setUndoing(null);
  };

  /** Texto de la fecha; null si el cobro no tiene fecha acordada (no se muestra nada). */
  const dueLabel = (r: (typeof withStatus)[number]) => {
    if (r.status === "pagado") return r.pagado_en ? `Pagado el ${formatDate(r.pagado_en, "medium")}` : "Pagado";
    if (!r.fecha_vencimiento) return null;
    const diff = diffDaysISO(today, r.fecha_vencimiento);
    if (diff < 0) return `Venció hace ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "día" : "días"}`;
    if (diff === 0) return "Vence hoy";
    if (diff === 1) return "Vence mañana";
    return `Vence el ${formatDate(r.fecha_vencimiento, "medium")}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Por cobrar"
          icon={Receipt}
          tone={open.length ? "warning" : "default"}
          value={formatTotals(sumByCurrency(open))}
          hint={`${open.length} ${open.length === 1 ? "cobro abierto" : "cobros abiertos"}`}
        />
        <StatCard
          label="Vencido"
          icon={AlarmClock}
          tone={overdue.length ? "danger" : "default"}
          value={formatTotals(sumByCurrency(overdue))}
          hint={overdue.length ? `${overdue.length} por gestionar` : "Nada vencido"}
        />
        <StatCard
          label="Próximos 30 días"
          icon={Wallet}
          tone="brand"
          value={formatTotals(sumByCurrency(next30))}
          hint={`${next30.length} ${next30.length === 1 ? "cobro" : "cobros"}`}
        />
        <StatCard
          label="Cobrado este mes"
          icon={CircleCheck}
          tone="success"
          value={formatTotals(sumByCurrency(paidThisMonth))}
          hint={`${paidThisMonth.length} ${paidThisMonth.length === 1 ? "pago" : "pagos"}`}
        />
      </div>

      {open.length > 0 && (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>¿Qué tan vieja está la cartera?</CardTitle>
            <CardDescription>Cobros abiertos en COP según su fecha de vencimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <AgingChart receivables={open.filter((r) => r.moneda === "COP")} today={today} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          options={[
            { value: "abiertos" as Filter, label: "Pendientes", count: open.length },
            { value: "vencidos" as Filter, label: "Vencidos", count: overdue.length },
            { value: "pagados" as Filter, label: "Pagados", count: withStatus.length - open.length },
            { value: "todos" as Filter, label: "Todos", count: withStatus.length },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div className="flex gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar cobro, proyecto o cliente…" className="w-full lg:w-72" />
          <Button onClick={openCreate} className="shrink-0">
            <Plus />
            <span className="hidden sm:inline">Nuevo cobro</span>
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          compact
          icon={Receipt}
          title={
            receivables.length === 0
              ? "Aún no hay cuentas por cobrar"
              : filter === "vencidos"
                ? "Nada vencido"
                : "Sin cobros en esta vista"
          }
          description={
            receivables.length === 0
              ? "Programa anticipos, saldos y fees. Puedes escribir a quién le cobras o ligarlo a un proyecto."
              : "Cambia el filtro o la búsqueda."
          }
          action={
            receivables.length === 0 ? (
              <Button onClick={openCreate}>
                <Plus />
                Programar cobro
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
          {visible.map((r) => {
            const info = COBRO_ESTADOS[r.status];
            const client = r.project?.client;
            return (
              <div key={r.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{r.concepto}</span>
                    <Badge tone={info.tone} dot className="py-0 text-[11px]">
                      {info.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {r.project ? (
                      <Link href={`/proyectos/${r.project.id}`} className="truncate hover:text-foreground">
                        {r.project.nombre}
                      </Link>
                    ) : (
                      r.cliente && <span className="truncate text-foreground/80">{r.cliente}</span>
                    )}
                    {client && (
                      <Link href={`/clientes/${client.id}`} className="truncate hover:text-foreground">
                        · {client.empresa || client.nombre}
                      </Link>
                    )}
                    {dueLabel(r) && (
                      <span className={cn(r.status === "vencido" && "font-medium text-destructive")}>· {dueLabel(r)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div
                    className={cn(
                      "text-base font-semibold tabular",
                      r.status === "vencido" && "text-destructive",
                      r.status === "pagado" && "text-muted-foreground",
                    )}
                  >
                    {formatMoney(r.monto, r.moneda)}
                  </div>
                  <div className="flex items-center gap-1">
                    {r.status !== "pagado" && (
                      <Button
                        size="sm"
                        variant={r.status === "vencido" ? "default" : "outline"}
                        onClick={() => {
                          setPaying(r);
                          setPayOpen(true);
                        }}
                      >
                        <CircleCheck />
                        Marcar como pagado
                      </Button>
                    )}
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Acciones del cobro">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(r);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        {r.status === "pagado" && (
                          <DropdownMenuItem onSelect={() => setUndoing(r)}>
                            <RotateCcw />
                            Deshacer pago
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(r)}>
                          <Trash2 />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReceivableFormDialog open={formOpen} onOpenChange={setFormOpen} receivable={editing} projects={projects} />
      <MarkPaidDialog open={payOpen} onOpenChange={setPayOpen} receivable={paying} categories={categories} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="¿Eliminar este cobro?"
        description={
          deleting?.estado === "pagado"
            ? "El ingreso que ya se registró se conserva en Movimientos."
            : "Se quitará de las cuentas por cobrar y del calendario."
        }
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={Boolean(undoing)}
        onOpenChange={(v) => !v && setUndoing(null)}
        title="¿Deshacer este pago?"
        description="El cobro volverá a pendiente y se eliminará el ingreso que se registró (con su soporte)."
        confirmLabel="Deshacer pago"
        onConfirm={handleUndo}
      />
    </div>
  );
}
