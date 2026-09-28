"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck } from "lucide-react";
import { toast } from "sonner";

import { METODOS_PAGO } from "@/lib/constants";
import { formatMoney, todayISO } from "@/lib/format";
import { discardSoporte, uploadSoporte } from "@/lib/storage-client";
import { markPaidSchema, receivableSchema, type MarkPaidInput, type ReceivableInput } from "@/lib/validations/finance";
import {
  createReceivableAction,
  markReceivablePaidAction,
  updateReceivableAction,
} from "@/app/(app)/finanzas/actions";
import { SoporteField } from "@/components/finance/soporte-field";
import type { CategoryOption, FinanceProjectOption, ReceivableRow } from "@/components/finance/types";
import { FormDialog } from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Crear / editar cobro
// ---------------------------------------------------------------------------

function toInput(r: ReceivableRow | null | undefined, projectId?: string): ReceivableInput {
  if (r) {
    return {
      project_id: r.project_id,
      concepto: r.concepto,
      monto: Number(r.monto),
      moneda: r.moneda,
      fecha_vencimiento: r.fecha_vencimiento,
    };
  }
  return { project_id: projectId ?? "", concepto: "", monto: 0, moneda: "COP", fecha_vencimiento: todayISO() };
}

export function ReceivableFormDialog({
  open,
  onOpenChange,
  receivable,
  projects,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable?: ReceivableRow | null;
  projects: FinanceProjectOption[];
  defaultProjectId?: string;
}) {
  const isEdit = Boolean(receivable);
  const form = useForm<ReceivableInput>({
    resolver: zodResolver(receivableSchema),
    defaultValues: toInput(receivable, defaultProjectId),
  });

  // Reinicia solo al abrir, para no perder lo escrito si la página se refresca.
  useEffect(() => {
    if (open) form.reset(toInput(receivable, defaultProjectId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const moneda = form.watch("moneda");

  const onSubmit = async (values: ReceivableInput) => {
    const result = receivable
      ? await updateReceivableAction(receivable.id, values)
      : await createReceivableAction(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success(receivable ? "Cobro actualizado" : "Cobro programado");
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar cobro" : "Nueva cuenta por cobrar"}
      description={isEdit ? undefined : "Programa un anticipo, saldo o fee que el cliente debe pagar."}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="project_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proyecto *</FormLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v);
                    const project = projects.find((p) => p.id === v);
                    if (project) form.setValue("moneda", project.moneda);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige el proyecto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                        {p.cliente && <span className="text-muted-foreground">· {p.cliente}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="concepto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Concepto *</FormLabel>
                <FormControl>
                  <Input list="conceptos-cobro" placeholder="Anticipo 50%" {...field} />
                </FormControl>
                <datalist id="conceptos-cobro">
                  {["Anticipo 50%", "Pago final 50%", "Fee mensual", "Saldo pendiente", "Cuota"].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
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
                  <FormLabel>Monto *</FormLabel>
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
          <FormField
            control={form.control}
            name="fecha_vencimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de vencimiento *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
              {isEdit ? "Guardar cambios" : "Programar cobro"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Marcar como pagado (registra el ingreso)
// ---------------------------------------------------------------------------

/** Sugiere la categoría de ingreso a partir del concepto. */
function guessCategory(concepto: string, categories: CategoryOption[]) {
  const text = concepto.toLowerCase();
  const slug = text.includes("anticipo")
    ? "anticipo"
    : /fee|mensual|mantenimiento|gesti[oó]n/.test(text)
      ? "fee_mensual"
      : "pago_final";
  const ingresos = categories.filter((c) => c.tipo === "ingreso" && c.activo);
  return ingresos.find((c) => c.slug === slug)?.slug ?? ingresos[0]?.slug ?? "";
}

export function MarkPaidDialog({
  open,
  onOpenChange,
  receivable,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: ReceivableRow | null;
  categories: CategoryOption[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<MarkPaidInput>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: { fecha: todayISO(), categoria: "", metodo_pago: "", soporte_url: null },
  });

  useEffect(() => {
    if (open && receivable) {
      form.reset({
        fecha: todayISO(),
        categoria: guessCategory(receivable.concepto, categories),
        metodo_pago: "",
        soporte_url: null,
      });
      setFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!receivable) return null;

  const onSubmit = async (values: MarkPaidInput) => {
    let uploaded: string | null = null;
    try {
      if (file) uploaded = await uploadSoporte(file, values.fecha);
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }
    const result = await markReceivablePaidAction(receivable.id, { ...values, soporte_url: uploaded });
    if (!result.ok) {
      if (uploaded) await discardSoporte(uploaded);
      toast.error(result.error);
      return;
    }
    toast.success(`Pago registrado: ${formatMoney(receivable.monto, receivable.moneda)}`);
    onOpenChange(false);
  };

  const ingresos = categories.filter((c) => c.tipo === "ingreso" && c.activo).sort((a, b) => a.orden - b.orden);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Marcar como pagado"
      description="Se registrará el ingreso en Movimientos, ligado al proyecto."
      size="sm"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">{receivable.concepto}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight tabular">
              {formatMoney(receivable.monto, receivable.moneda)}
            </div>
            {receivable.project && (
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {receivable.project.nombre}
                {receivable.project.client
                  ? ` · ${receivable.project.client.empresa || receivable.project.client.nombre}`
                  : ""}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de pago</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                      {ingresos.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metodo_pago"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Método de pago</FormLabel>
                  <FormControl>
                    <Input list="metodos-pago-cobro" placeholder="Transferencia, Nequi…" {...field} />
                  </FormControl>
                  <datalist id="metodos-pago-cobro">
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-2">
            <span className="text-[13px] font-medium">Soporte del pago</span>
            <SoporteField file={file} onFileChange={setFile} />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {!form.formState.isSubmitting && <CircleCheck />}
              Confirmar pago
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
