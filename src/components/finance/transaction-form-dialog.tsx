"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

import type { MovimientoTipo } from "@/types/database";
import { METODOS_PAGO } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { discardSoporte, uploadSoporte } from "@/lib/storage-client";
import { cn } from "@/lib/utils";
import { transactionSchema, type TransactionInput } from "@/lib/validations/finance";
import { createTransactionAction, updateTransactionAction } from "@/app/(app)/finanzas/actions";
import { SoporteField } from "@/components/finance/soporte-field";
import type { CategoryOption, FinanceProjectOption, TransactionRow } from "@/components/finance/types";
import { FormDialog } from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none__";

function toInput(tx: TransactionRow | null | undefined, tipo: MovimientoTipo): TransactionInput {
  if (tx) {
    return {
      tipo: tx.tipo,
      monto: Number(tx.monto),
      moneda: tx.moneda,
      categoria: tx.categoria,
      project_id: tx.project_id,
      descripcion: tx.descripcion ?? "",
      fecha: tx.fecha,
      metodo_pago: tx.metodo_pago ?? "",
      soporte_url: tx.soporte_url,
    };
  }
  return {
    tipo,
    monto: 0,
    moneda: "COP",
    categoria: "",
    project_id: null,
    descripcion: "",
    fecha: todayISO(),
    metodo_pago: "",
    soporte_url: null,
  };
}

/** Registrar o editar un ingreso o gasto, con soporte opcional (foto o PDF). */
export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  defaultTipo = "gasto",
  categories,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: TransactionRow | null;
  defaultTipo?: MovimientoTipo;
  categories: CategoryOption[];
  projects: FinanceProjectOption[];
}) {
  const isEdit = Boolean(transaction);
  const [file, setFile] = useState<File | null>(null);

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: toInput(transaction, defaultTipo),
  });

  // Reinicia solo al abrir, para no perder lo escrito si la página se refresca.
  useEffect(() => {
    if (open) {
      form.reset(toInput(transaction, defaultTipo));
      setFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const tipo = form.watch("tipo");
  const moneda = form.watch("moneda");
  const categoria = form.watch("categoria");
  const soporteUrl = form.watch("soporte_url");

  const options = categories
    .filter((c) => c.tipo === tipo && (c.activo || c.slug === categoria))
    .sort((a, b) => a.orden - b.orden);

  const changeTipo = (next: MovimientoTipo) => {
    if (next === tipo) return;
    form.setValue("tipo", next);
    form.setValue("categoria", "");
  };

  const onSubmit = async (values: TransactionInput) => {
    let uploaded: string | null = null;
    try {
      if (file) uploaded = await uploadSoporte(file, values.fecha);
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }

    const payload = { ...values, soporte_url: uploaded ?? values.soporte_url };
    const result = transaction
      ? await updateTransactionAction(transaction.id, payload)
      : await createTransactionAction(payload);

    if (!result.ok) {
      if (uploaded) await discardSoporte(uploaded);
      toast.error(result.error);
      return;
    }
    toast.success(
      transaction ? "Movimiento actualizado" : values.tipo === "ingreso" ? "Ingreso registrado" : "Gasto registrado",
    );
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar movimiento" : tipo === "ingreso" ? "Registrar ingreso" : "Registrar gasto"}
      size="lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Tipo de movimiento">
            {(["gasto", "ingreso"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipo === t}
                onClick={() => changeTipo(t)}
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
                  tipo === t ? "bg-background shadow-sm dark:bg-input/40" : "text-muted-foreground hover:text-foreground",
                  tipo === t && t === "ingreso" && "text-success",
                  tipo === t && t === "gasto" && "text-destructive",
                )}
              >
                {t === "ingreso" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                {t === "ingreso" ? "Ingreso" : "Gasto"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto *</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      moneda={moneda}
                      className="h-11 text-lg font-semibold"
                      autoFocus={!isEdit}
                    />
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
                      <SelectTrigger className="h-11">
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
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría *</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elige una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.map((c) => (
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
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha *</FormLabel>
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
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => {
                      const next = v === NONE ? null : v;
                      field.onChange(next);
                      const project = projects.find((p) => p.id === next);
                      if (project && !isEdit) form.setValue("moneda", project.moneda);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>General de la agencia</SelectItem>
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
              name="metodo_pago"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago</FormLabel>
                  <FormControl>
                    <Input list="metodos-pago" placeholder="Transferencia, Nequi…" {...field} />
                  </FormControl>
                  <datalist id="metodos-pago">
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Input
                    placeholder={tipo === "ingreso" ? "Anticipo sitio web Clínica Sonríe" : "Figma Professional"}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-2">
            <span className="text-[13px] font-medium">Soporte</span>
            <SoporteField
              file={file}
              onFileChange={setFile}
              existing={soporteUrl}
              onRemoveExisting={() => form.setValue("soporte_url", null, { shouldDirty: true })}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {isEdit ? "Guardar cambios" : tipo === "ingreso" ? "Registrar ingreso" : "Registrar gasto"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
