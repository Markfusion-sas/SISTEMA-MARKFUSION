"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, CircleCheck, MoreHorizontal, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatMoney, formatRelativeDay, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { recurringSchema, type RecurringInput } from "@/lib/validations/finance";
import {
  createRecurringAction,
  deleteRecurringAction,
  registerRecurringPaymentAction,
  toggleRecurringAction,
  updateRecurringAction,
} from "@/app/(app)/finanzas/actions";
import { categoryLookup, type CategoryOption, type RecurringRow } from "@/components/finance/types";
import { CategoryBars, type CategoryValue } from "@/components/charts/category-bars";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/** Próxima fecha de cobro desde hoy (si el día no existe en el mes, el último día). */
export function nextChargeDate(dia: number, today = todayISO()) {
  const [y, m, d] = today.split("-").map(Number);
  const build = (year: number, monthIndex: number) => {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const date = new Date(Date.UTC(year, monthIndex, Math.min(dia, last)));
    return date.toISOString().slice(0, 10);
  };
  const thisMonth = build(y, m - 1);
  return Number(thisMonth.slice(8)) >= d ? thisMonth : build(y, m);
}

/** "hoy", "mañana", "en 3 días" o "el 5 oct". */
function nextLabel(date: string) {
  const rel = formatRelativeDay(date);
  return /^\d/.test(rel) ? `el ${rel}` : rel.toLowerCase();
}

export function RecurringTab({
  recurring,
  paidThisMonth,
  categories,
}: {
  recurring: RecurringRow[];
  paidThisMonth: string[];
  categories: CategoryOption[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRow | null>(null);
  const [deleting, setDeleting] = useState<RecurringRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const lookup = useMemo(() => categoryLookup(categories), [categories]);
  const today = todayISO();

  const active = recurring.filter((r) => r.activo);
  const monthlyCop = active.filter((r) => r.moneda === "COP").reduce((s, r) => s + Number(r.monto), 0);
  const monthlyUsd = active.filter((r) => r.moneda === "USD").reduce((s, r) => s + Number(r.monto), 0);
  const pendingThisMonth = active.filter((r) => !paidThisMonth.includes(r.id));

  const sorted = [...recurring].sort((a, b) => Number(b.activo) - Number(a.activo) || a.dia_cobro - b.dia_cobro);

  const toggle = async (r: RecurringRow, value: boolean) => {
    setBusy(r.id);
    const result = await toggleRecurringAction(r.id, value);
    setBusy(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(value ? `${r.nombre} activado` : `${r.nombre} pausado`);
  };

  const registerPayment = async (r: RecurringRow) => {
    setBusy(r.id);
    const result = await registerRecurringPaymentAction(r.id);
    setBusy(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`Gasto registrado: ${r.nombre} · ${formatMoney(r.monto, r.moneda)}`);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteRecurringAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Gasto recurrente eliminado");
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Costo fijo mensual"
          icon={Repeat}
          tone="brand"
          value={formatMoney(monthlyCop)}
          hint={monthlyUsd ? `+ ${formatMoney(monthlyUsd, "USD")}` : `${active.length} activos`}
        />
        <StatCard
          label="Costo fijo anual"
          icon={CalendarClock}
          value={formatMoney(monthlyCop * 12)}
          hint="Proyección con los activos"
        />
        <StatCard
          label="Pendientes de registrar este mes"
          icon={CircleCheck}
          tone={pendingThisMonth.length ? "warning" : "success"}
          value={pendingThisMonth.length}
          hint={pendingThisMonth.length ? formatMoney(pendingThisMonth.reduce((s, r) => s + (r.moneda === "COP" ? Number(r.monto) : 0), 0)) : "Todo registrado"}
        />
      </div>

      {active.length > 0 && (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>¿Qué pesa más en el costo fijo?</CardTitle>
            <CardDescription>Gastos recurrentes activos por categoría · COP mensual</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBars
              caption="Costo fijo mensual por categoría"
              items={Object.values(
                active
                  .filter((r) => r.moneda === "COP")
                  .reduce<Record<string, CategoryValue>>((acc, r) => {
                    const cat = lookup("gasto", r.categoria);
                    acc[r.categoria] ??= { key: r.categoria, nombre: cat.nombre, color: cat.color, value: 0 };
                    acc[r.categoria].value += Number(r.monto);
                    return acc;
                  }, {}),
              )}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Suscripciones y costos fijos. Aparecen en el calendario el día de cobro.
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="shrink-0"
        >
          <Plus />
          <span className="hidden sm:inline">Nuevo recurrente</span>
        </Button>
      </div>

      {recurring.length === 0 ? (
        <EmptyState
          compact
          icon={Repeat}
          title="Sin gastos recurrentes"
          description="Agrega herramientas, hosting, coworking o el contador para saber cuánto cuesta operar cada mes."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus />
              Agregar recurrente
            </Button>
          }
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
          {sorted.map((r) => {
            const cat = lookup("gasto", r.categoria);
            const next = nextChargeDate(r.dia_cobro, today);
            const paid = paidThisMonth.includes(r.id);
            return (
              <div
                key={r.id}
                className={cn("flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center", !r.activo && "opacity-55")}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg border bg-muted/30">
                    <span className="text-[9px] leading-none text-muted-foreground uppercase">Día</span>
                    <span className="text-sm leading-tight font-semibold tabular">{r.dia_cobro}</span>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{r.nombre}</span>
                      {r.activo && paid && (
                        <Badge tone="success" className="py-0 text-[11px]">
                          Registrado este mes
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.nombre}
                      </span>
                      {r.activo ? (
                        <span>· Próximo cobro {nextLabel(next)}</span>
                      ) : (
                        <span>· Pausado</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-base font-semibold tabular">{formatMoney(r.monto, r.moneda)}</span>
                  <div className="flex items-center gap-2">
                    {r.activo && !paid && (
                      <Button size="sm" variant="outline" onClick={() => registerPayment(r)} loading={busy === r.id}>
                        Registrar gasto
                      </Button>
                    )}
                    <Switch
                      checked={r.activo}
                      onCheckedChange={(v) => toggle(r, v)}
                      disabled={busy === r.id}
                      aria-label={r.activo ? `Pausar ${r.nombre}` : `Activar ${r.nombre}`}
                    />
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Acciones">
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
                        {r.activo && (
                          <DropdownMenuItem onSelect={() => registerPayment(r)}>
                            <CircleCheck />
                            Registrar gasto de hoy
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

      <RecurringFormDialog open={formOpen} onOpenChange={setFormOpen} recurring={editing} categories={categories} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`¿Eliminar "${deleting?.nombre}"?`}
        description="Los gastos ya registrados se conservan en Movimientos. Si solo quieres dejar de verlo, puedes pausarlo."
        onConfirm={handleDelete}
      />
    </div>
  );
}

function toInput(r: RecurringRow | null | undefined): RecurringInput {
  if (r) {
    return {
      nombre: r.nombre,
      monto: Number(r.monto),
      moneda: r.moneda,
      dia_cobro: r.dia_cobro,
      categoria: r.categoria,
      activo: r.activo,
    };
  }
  return { nombre: "", monto: 0, moneda: "COP", dia_cobro: 1, categoria: "herramientas_software", activo: true };
}

function RecurringFormDialog({
  open,
  onOpenChange,
  recurring,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring: RecurringRow | null;
  categories: CategoryOption[];
}) {
  const form = useForm<RecurringInput>({ resolver: zodResolver(recurringSchema), defaultValues: toInput(recurring) });

  useEffect(() => {
    if (open) form.reset(toInput(recurring));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const moneda = form.watch("moneda");
  const categoria = form.watch("categoria");
  const gastos = categories
    .filter((c) => c.tipo === "gasto" && (c.activo || c.slug === categoria))
    .sort((a, b) => a.orden - b.orden);

  const onSubmit = async (values: RecurringInput) => {
    const result = recurring ? await updateRecurringAction(recurring.id, values) : await createRecurringAction(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success(recurring ? "Gasto recurrente actualizado" : "Gasto recurrente agregado");
    onOpenChange(false);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={recurring ? "Editar gasto recurrente" : "Nuevo gasto recurrente"}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl>
                  <Input placeholder="Google Workspace" autoFocus={!recurring} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto mensual *</FormLabel>
                  <FormControl>
                    <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} moneda={moneda} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="moneda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="dia_cobro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Día de cobro</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={31}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elige" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gastos.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>
                          <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <FormLabel>Activo</FormLabel>
                  <p className="mt-1 text-xs text-muted-foreground">Los pausados no suman al costo fijo ni aparecen en el calendario.</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {recurring ? "Guardar cambios" : "Agregar"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
