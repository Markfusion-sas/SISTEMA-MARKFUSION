"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  SearchX,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import type { Moneda, MovimientoTipo } from "@/types/database";
import { formatDate, formatMoney, formatPercent, todayISO } from "@/lib/format";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { CategoryBars, type CategoryValue } from "@/components/charts/category-bars";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { deleteTransactionAction } from "@/app/(app)/finanzas/actions";
import { useCurrentUser } from "@/components/layout/current-user";
import { MonthPicker } from "@/components/finance/month-picker";
import { openSoporte } from "@/components/finance/soporte-field";
import { TransactionFormDialog } from "@/components/finance/transaction-form-dialog";
import {
  categoryLookup,
  type CategoryOption,
  type FinanceProjectOption,
  type TransactionRow,
} from "@/components/finance/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { SearchInput, normalize } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TipoFilter = MovimientoTipo | "todos";
const ALL = "todos";
const GENERAL = "general";

export interface MonthTotals {
  ingresos: number;
  gastos: number;
}

function totals(rows: { tipo: MovimientoTipo; monto: number; moneda: Moneda }[], moneda: Moneda): MonthTotals {
  return rows
    .filter((r) => r.moneda === moneda)
    .reduce(
      (acc, r) => {
        if (r.tipo === "ingreso") acc.ingresos += Number(r.monto);
        else acc.gastos += Number(r.monto);
        return acc;
      },
      { ingresos: 0, gastos: 0 },
    );
}

function variation(current: number, previous: number) {
  if (!previous) return null;
  return (current - previous) / previous;
}

export function TransactionsTab({
  transactions,
  previous,
  month,
  currentMonth,
  onMonthChange,
  categories,
  projects,
}: {
  transactions: TransactionRow[];
  previous: { tipo: MovimientoTipo; monto: number; moneda: Moneda }[];
  month: string;
  currentMonth: string;
  onMonthChange: (month: string) => void;
  categories: CategoryOption[];
  projects: FinanceProjectOption[];
}) {
  const { team } = useCurrentUser();
  const [tipo, setTipo] = useState<TipoFilter>(ALL);
  const [categoria, setCategoria] = useState<string>(ALL);
  const [proyecto, setProyecto] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formTipo, setFormTipo] = useState<MovimientoTipo>("gasto");
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [deleting, setDeleting] = useState<TransactionRow | null>(null);

  const lookup = useMemo(() => categoryLookup(categories), [categories]);
  const memberById = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);

  const cop = totals(transactions, "COP");
  const usd = totals(transactions, "USD");
  const prev = totals(previous, "COP");
  const utilidad = cop.ingresos - cop.gastos;
  const prevUtilidad = prev.ingresos - prev.gastos;
  const hasUsd = usd.ingresos > 0 || usd.gastos > 0;

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return transactions.filter((t) => {
      if (tipo !== ALL && t.tipo !== tipo) return false;
      if (categoria !== ALL && `${t.tipo}:${t.categoria}` !== categoria) return false;
      if (proyecto === GENERAL && t.project_id) return false;
      if (proyecto !== ALL && proyecto !== GENERAL && t.project_id !== proyecto) return false;
      if (q && ![t.descripcion, t.metodo_pago, t.project?.nombre, lookup(t.tipo, t.categoria).nombre].some((f) => normalize(f).includes(q)))
        return false;
      return true;
    });
  }, [transactions, tipo, categoria, proyecto, search, lookup]);

  const filteredTotals = totals(filtered, "COP");
  const hasFilters = tipo !== ALL || categoria !== ALL || proyecto !== ALL || search !== "";

  const openCreate = (t: MovimientoTipo) => {
    setEditing(null);
    setFormTipo(t);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteTransactionAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success(deleting.receivable_id ? "Movimiento eliminado; el cobro volvió a pendiente" : "Movimiento eliminado");
    setDeleting(null);
  };

  const hint = (value: number | null, inverse = false) => {
    if (value === null) return "Sin datos del mes anterior";
    const good = inverse ? value <= 0 : value >= 0;
    return (
      <span className={good ? "text-success" : "text-destructive"}>
        {formatPercent(value, { signed: true })} vs mes anterior
      </span>
    );
  };

  const rowActions = (t: TransactionRow) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Acciones del movimiento">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            setEditing(t);
            setFormTipo(t.tipo);
            setFormOpen(true);
          }}
        >
          <Pencil />
          Editar
        </DropdownMenuItem>
        {t.soporte_url && (
          <DropdownMenuItem onSelect={() => openSoporte(t.soporte_url!)}>
            <Paperclip />
            Ver soporte
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(t)}>
          <Trash2 />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthPicker month={month} onChange={onMonthChange} max={currentMonth} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate("ingreso")}>
            <ArrowDownLeft className="text-success" />
            Ingreso
          </Button>
          <Button onClick={() => openCreate("gasto")}>
            <Plus />
            Gasto
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos"
          icon={TrendingUp}
          tone="success"
          value={formatMoney(cop.ingresos)}
          hint={hasUsd && usd.ingresos ? `+ ${formatMoney(usd.ingresos, "USD")}` : hint(variation(cop.ingresos, prev.ingresos))}
        />
        <StatCard
          label="Gastos"
          icon={TrendingDown}
          value={formatMoney(cop.gastos)}
          hint={hasUsd && usd.gastos ? `+ ${formatMoney(usd.gastos, "USD")}` : hint(variation(cop.gastos, prev.gastos), true)}
        />
        <StatCard
          label="Utilidad"
          icon={Wallet}
          tone={utilidad < 0 ? "danger" : "brand"}
          value={formatMoney(utilidad)}
          hint={
            cop.ingresos > 0
              ? `Margen ${formatPercent(utilidad / cop.ingresos)}`
              : hint(prevUtilidad ? (utilidad - prevUtilidad) / Math.abs(prevUtilidad) : null)
          }
        />
        <StatCard
          label="Movimientos"
          icon={Receipt}
          value={transactions.length}
          hint={`${transactions.filter((t) => t.tipo === "ingreso").length} ingresos · ${transactions.filter((t) => t.tipo === "gasto").length} gastos`}
        />
      </div>

      {transactions.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-4 lg:col-span-2">
            <CardHeader>
              <CardTitle>Flujo del mes</CardTitle>
              <CardDescription>Ingresos y gastos acumulados día a día · COP</CardDescription>
            </CardHeader>
            <CardContent>
              <CashflowChart transactions={transactions} month={month} today={todayISO()} />
            </CardContent>
          </Card>
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>¿En qué se fue la plata?</CardTitle>
              <CardDescription>Gastos del mes por categoría · COP</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryBars
                caption="Gastos del mes por categoría"
                emptyText="Sin gastos registrados este mes."
                items={Object.values(
                  transactions
                    .filter((t) => t.tipo === "gasto" && t.moneda === "COP")
                    .reduce<Record<string, CategoryValue>>((acc, t) => {
                      const cat = lookup("gasto", t.categoria);
                      acc[t.categoria] ??= { key: t.categoria, nombre: cat.nombre, color: cat.color, value: 0 };
                      acc[t.categoria].value += Number(t.monto);
                      return acc;
                    }, {}),
                )}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {transactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin movimientos este mes"
          description="Registra los ingresos y gastos para ver la utilidad del mes."
          action={
            <>
              <Button variant="outline" onClick={() => openCreate("ingreso")}>
                <ArrowDownLeft />
                Registrar ingreso
              </Button>
              <Button onClick={() => openCreate("gasto")}>
                <Plus />
                Registrar gasto
              </Button>
            </>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <FilterChips
                options={[
                  { value: ALL as TipoFilter, label: "Todos", count: transactions.length },
                  { value: "ingreso" as TipoFilter, label: "Ingresos", count: transactions.filter((t) => t.tipo === "ingreso").length },
                  { value: "gasto" as TipoFilter, label: "Gastos", count: transactions.filter((t) => t.tipo === "gasto").length },
                ]}
                value={tipo}
                onChange={(v) => {
                  setTipo(v);
                  setCategoria(ALL);
                }}
              />
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger size="sm" className="w-auto min-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las categorías</SelectItem>
                  {(["ingreso", "gasto"] as const)
                    .filter((t) => tipo === ALL || tipo === t)
                    .map((t) => (
                      <SelectGroup key={t}>
                        <SelectSeparator />
                        <SelectLabel>{t === "ingreso" ? "Ingresos" : "Gastos"}</SelectLabel>
                        {categories
                          .filter((c) => c.tipo === t)
                          .map((c) => (
                            <SelectItem key={c.id} value={`${t}:${c.slug}`}>
                              <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                              {c.nombre}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                </SelectContent>
              </Select>
              <Select value={proyecto} onValueChange={setProyecto}>
                <SelectTrigger size="sm" className="w-auto min-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los proyectos</SelectItem>
                  <SelectItem value={GENERAL}>General de la agencia</SelectItem>
                  {projects.length > 0 && <SelectSeparator />}
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar movimiento…" className="w-full xl:w-64" />
          </div>

          {hasFilters && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filtered.length} movimientos · ingresos {formatMoney(filteredTotals.ingresos)} · gastos{" "}
              {formatMoney(filteredTotals.gastos)}
            </p>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={SearchX}
              title="Ningún movimiento coincide"
              description="Cambia los filtros o la búsqueda."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setTipo(ALL);
                    setCategoria(ALL);
                    setProyecto(ALL);
                    setSearch("");
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              {/* Escritorio */}
              <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Proyecto</TableHead>
                      <TableHead className="hidden lg:table-cell">Método</TableHead>
                      <TableHead className="w-10" />
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => {
                      const cat = lookup(t.tipo, t.categoria);
                      const income = t.tipo === "ingreso";
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="pl-4 text-muted-foreground tabular">{formatDate(t.fecha, "month")}</TableCell>
                          <TableCell className="max-w-72">
                            <div className="truncate font-medium">{t.descripcion || cat.nombre}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="size-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.nombre}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-48 truncate text-muted-foreground">
                            {t.project?.nombre ?? "General"}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground lg:table-cell">
                            <div className="flex items-center gap-2">
                              <UserAvatar profile={memberById.get(t.registrado_por ?? "") ?? null} className="size-5 text-[9px]" />
                              {t.metodo_pago || "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {t.soporte_url && (
                              <button
                                type="button"
                                onClick={() => openSoporte(t.soporte_url!)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                aria-label="Ver soporte"
                                title="Ver soporte"
                              >
                                <Paperclip className="size-4" />
                              </button>
                            )}
                          </TableCell>
                          <TableCell className={cn("text-right font-semibold tabular", income ? "text-success" : "")}>
                            {income ? "+" : "-"}
                            {formatMoney(t.monto, t.moneda)}
                          </TableCell>
                          <TableCell className="pr-3 text-right">{rowActions(t)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Celular */}
              <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-card md:hidden">
                {filtered.map((t) => {
                  const cat = lookup(t.tipo, t.categoria);
                  const income = t.tipo === "ingreso";
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-3.5 py-3">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          income ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {income ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{t.descripcion || cat.nombre}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {cat.nombre} · {formatDate(t.fecha, "month")}
                          {t.soporte_url && <Paperclip className="size-3" />}
                        </div>
                      </div>
                      <div className={cn("text-right text-sm font-semibold tabular", income && "text-success")}>
                        {income ? "+" : "-"}
                        {formatMoney(t.monto, t.moneda)}
                      </div>
                      {rowActions(t)}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        defaultTipo={formTipo}
        categories={categories}
        projects={projects}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar este movimiento?"
        description={
          deleting?.receivable_id
            ? "Este ingreso viene de una cuenta por cobrar: al eliminarlo, el cobro vuelve a quedar pendiente."
            : "Se eliminará también su soporte adjunto, si lo tiene."
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
