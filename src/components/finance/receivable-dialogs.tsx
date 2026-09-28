"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Link2, PencilLine } from "lucide-react";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Crear / editar cobro
// ---------------------------------------------------------------------------

/** Texto que se muestra para un proyecto en el campo "¿A quién le cobras?". */
function projectLabel(p: Pick<FinanceProjectOption, "nombre" | "cliente">) {
  return p.cliente ? `${p.nombre} · ${p.cliente}` : p.nombre;
}

/** Busca un proyecto cuyo nombre (o "nombre · cliente") coincida con lo escrito. */
function matchProject(text: string, projects: FinanceProjectOption[]) {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  return projects.find((p) => projectLabel(p).toLowerCase() === q || p.nombre.toLowerCase() === q) ?? null;
}

/**
 * En el formulario, `cliente` guarda siempre lo que se ve en el campo. Al guardar,
 * si coincide con un proyecto se liga a él; si no, se guarda como texto libre.
 */
function toInput(r: ReceivableRow | null | undefined, projects: FinanceProjectOption[], projectId?: string): ReceivableInput {
  if (r) {
    const project = projects.find((p) => p.id === r.project_id);
    const text = project ? projectLabel(project) : (r.project?.nombre ?? r.cliente ?? "");
    return {
      project_id: r.project_id,
      cliente: text,
      concepto: r.concepto,
      monto: Number(r.monto),
      moneda: r.moneda,
      fecha_vencimiento: r.fecha_vencimiento ?? "",
    };
  }
  const project = projects.find((p) => p.id === projectId);
  return {
    project_id: project?.id ?? null,
    cliente: project ? projectLabel(project) : "",
    concepto: "",
    monto: 0,
    moneda: project?.moneda ?? "COP",
    // Sin fecha por defecto: solo se pone si hay una fecha acordada con el cliente.
    fecha_vencimiento: "",
  };
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
    defaultValues: toInput(receivable, projects, defaultProjectId),
  });

  // Reinicia solo al abrir, para no perder lo escrito si la página se refresca.
  useEffect(() => {
    if (open) form.reset(toInput(receivable, projects, defaultProjectId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const moneda = form.watch("moneda");
  const destino = form.watch("cliente");
  const linked = matchProject(destino, projects);
  // Al editar un cobro de un proyecto que ya no está en la lista (p. ej. cancelado), se conserva el vínculo.
  const keepsOriginalProject =
    !linked && Boolean(receivable?.project_id) && destino === toInput(receivable, projects).cliente;

  const onSubmit = async (values: ReceivableInput) => {
    const project = matchProject(values.cliente, projects);
    const payload: ReceivableInput = project
      ? { ...values, project_id: project.id, cliente: "" }
      : keepsOriginalProject
        ? { ...values, project_id: receivable!.project_id, cliente: "" }
        : { ...values, project_id: null, cliente: values.cliente.trim() };

    const result = receivable
      ? await updateReceivableAction(receivable.id, payload)
      : await createReceivableAction(payload);
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
            name="cliente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿A quién le cobras? *</FormLabel>
                <FormControl>
                  <Input
                    list="destinos-cobro"
                    placeholder="Escribe o pega el cliente, empresa o proyecto"
                    autoComplete="off"
                    autoFocus={!isEdit}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      const project = matchProject(e.target.value, projects);
                      if (project) form.setValue("moneda", project.moneda);
                    }}
                  />
                </FormControl>
                <datalist id="destinos-cobro">
                  {projects.map((p) => (
                    <option key={p.id} value={projectLabel(p)} />
                  ))}
                </datalist>
                {destino.trim() && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {linked || keepsOriginalProject ? (
                      <>
                        <Link2 className="size-3.5 text-brand" />
                        Quedará ligado al proyecto{" "}
                        <span className="font-medium text-foreground">{linked?.nombre ?? receivable?.project?.nombre}</span>
                      </>
                    ) : (
                      <>
                        <PencilLine className="size-3.5" />
                        Se guardará como texto, sin proyecto
                        {projects.length > 0 && " (elige una sugerencia si quieres ligarlo a un proyecto)"}
                      </>
                    )}
                  </p>
                )}
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
                <FormLabel>Fecha de vencimiento (opcional)</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  {field.value && (
                    <Button type="button" variant="ghost" onClick={() => field.onChange("")} className="shrink-0">
                      Quitar
                    </Button>
                  )}
                </div>
                <FormDescription>
                  Déjala vacía si no hay una fecha acordada: el cobro queda pendiente sin vencerse.
                </FormDescription>
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
            {(receivable.project || receivable.cliente) && (
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {receivable.project
                  ? `${receivable.project.nombre}${
                      receivable.project.client
                        ? ` · ${receivable.project.client.empresa || receivable.project.client.nombre}`
                        : ""
                    }`
                  : receivable.cliente}
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
