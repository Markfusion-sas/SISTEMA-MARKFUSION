"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Briefcase,
  Download,
  Eye,
  PencilLine,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { Quote } from "@/types/database";
import { COTIZACION_ESTADOS, COTIZACION_ESTADO_OPTIONS } from "@/lib/constants";
import { clientOptionLabel } from "@/lib/clients";
import { addDaysISO, formatMoney, todayISO } from "@/lib/format";
import { itemSubtotal, quoteTotal, quoteValidUntil } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import { quoteSchema, type QuoteInput } from "@/lib/validations/quote";
import { createQuoteAction, updateQuoteAction } from "@/app/(app)/cotizaciones/actions";
import { ConvertQuoteDialog } from "@/components/quotes/convert-dialog";
import { downloadQuotePdf } from "@/components/quotes/pdf-download";
import { QuoteDocument } from "@/components/quotes/quote-document";
import type { BrandDoc, QuoteClient, QuoteDocData } from "@/components/quotes/types";
import { MoneyInput } from "@/components/shared/money-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function toInput(quote: Quote | null, brand: BrandDoc, clientId?: string): QuoteInput {
  if (quote) {
    return {
      client_id: quote.client_id,
      moneda: quote.moneda,
      fee_mensual: Number(quote.fee_mensual),
      vigencia_dias: quote.vigencia_dias,
      condiciones: quote.condiciones ?? "",
      estado: quote.estado,
      items: quote.items.map((i) => ({
        descripcion: i.descripcion,
        cantidad: Number(i.cantidad),
        valor_unitario: Number(i.valor_unitario),
      })),
    };
  }
  return {
    client_id: clientId ?? "",
    moneda: "COP",
    fee_mensual: 0,
    vigencia_dias: 15,
    condiciones: brand.condiciones_default ?? "",
    estado: "borrador",
    items: [{ descripcion: "", cantidad: 1, valor_unitario: 0 }],
  };
}

export function QuoteEditor({
  quote,
  project,
  clients,
  brand,
  defaultClientId,
}: {
  quote: Quote | null;
  project: { id: string; nombre: string } | null;
  clients: QuoteClient[];
  brand: BrandDoc;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [mobileView, setMobileView] = useState<"editar" | "vista">("editar");
  const [downloading, setDownloading] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const form = useForm<QuoteInput>({
    resolver: zodResolver(quoteSchema),
    defaultValues: toInput(quote, brand, defaultClientId),
  });
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "items" });

  const values = useWatch({ control: form.control }) as QuoteInput;
  const items = useMemo(() => values.items ?? [], [values.items]);
  const total = quoteTotal(items);
  const client = clients.find((c) => c.id === values.client_id) ?? null;
  const fecha = quote ? quote.created_at : new Date().toISOString();

  const doc: QuoteDocData = {
    numero: quote?.numero ?? null,
    fecha: quote ? fecha : todayISO(),
    validaHasta: quote
      ? quoteValidUntil(quote.created_at, Number(values.vigencia_dias) || 1)
      : addDaysISO(todayISO(), Number(values.vigencia_dias) || 1),
    moneda: values.moneda ?? "COP",
    items: items.map((i) => ({
      descripcion: i?.descripcion ?? "",
      cantidad: Number(i?.cantidad) || 0,
      valor_unitario: Number(i?.valor_unitario) || 0,
    })),
    fee_mensual: Number(values.fee_mensual) || 0,
    condiciones: values.condiciones?.trim() || null,
    client,
  };

  /** Guarda (crea o actualiza). Devuelve el número si todo salió bien. */
  const save = async (data: QuoteInput): Promise<string | null> => {
    if (quote) {
      const result = await updateQuoteAction(quote.id, data);
      if (!result.ok) {
        toast.error(result.error);
        return null;
      }
      form.reset(data);
      toast.success(`Cotización ${quote.numero} guardada`);
      return quote.numero;
    }
    const result = await createQuoteAction(data);
    if (!result.ok || !result.data) {
      toast.error(result.ok ? "No se pudo crear la cotización" : result.error);
      return null;
    }
    toast.success(`Cotización ${result.data.numero} creada`);
    router.replace(`/cotizaciones/${result.data.id}`);
    return result.data.numero;
  };

  const onSubmit = async (data: QuoteInput) => {
    await save(data);
  };

  // Descarga: si hay cambios sin guardar (o es nueva), primero guarda para que el PDF tenga número.
  const handleDownload = form.handleSubmit(async (data) => {
    setDownloading(true);
    try {
      let numero = quote?.numero ?? null;
      if (!quote || form.formState.isDirty) {
        numero = await save(data);
        if (!numero) return;
      }
      await downloadQuotePdf({ ...doc, numero }, brand);
      toast.success("PDF descargado");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo generar el PDF");
    } finally {
      setDownloading(false);
    }
  });

  const estadoView = COTIZACION_ESTADOS[values.estado ?? "borrador"];
  const canConvert = quote && quote.estado === "aprobada" && !project;
  const clientName = client ? client.empresa || client.nombre : "cliente";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Encabezado */}
        <div className="space-y-5">
          <Link
            href="/cotizaciones"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Cotizaciones
          </Link>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={estadoView.tone} dot>
                  {estadoView.label}
                </Badge>
                {form.formState.isDirty && <span className="text-xs text-warning">Cambios sin guardar</span>}
              </div>
              <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-[28px]">
                {quote ? quote.numero : "Nueva cotización"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {client ? clientName : "Elige un cliente"} · {formatMoney(total, doc.moneda)}
                {doc.fee_mensual > 0 ? ` + ${formatMoney(doc.fee_mensual, doc.moneda)}/mes` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {project && (
                <Button asChild variant="outline">
                  <Link href={`/proyectos/${project.id}`}>
                    <Briefcase />
                    Ver proyecto
                  </Link>
                </Button>
              )}
              {canConvert && (
                <Button type="button" variant="outline" onClick={() => setConvertOpen(true)} disabled={form.formState.isDirty}>
                  Convertir en proyecto
                  <ArrowRight />
                </Button>
              )}
              <Button type="button" variant="outline" onClick={handleDownload} loading={downloading}>
                {!downloading && <Download />}
                Descargar PDF
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting && !downloading}>
                {!(form.formState.isSubmitting && !downloading) && <Save />}
                {quote ? "Guardar" : "Crear cotización"}
              </Button>
            </div>
          </div>
        </div>

        {/* Selector móvil */}
        <div className="grid grid-cols-2 rounded-lg bg-muted p-[3px] lg:hidden">
          {(
            [
              { value: "editar", label: "Editar", icon: PencilLine },
              { value: "vista", label: "Vista previa", icon: Eye },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMobileView(value)}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium",
                mobileView === value ? "bg-background shadow-sm dark:bg-input/40" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
          {/* Editor */}
          <div className={cn("min-w-0 space-y-6", mobileView === "vista" && "hidden lg:block")}>
            <Card className="gap-4">
              <CardHeader>
                <CardTitle>Datos generales</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Cliente *</FormLabel>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={clients.length ? "Elige el cliente" : "Primero crea un cliente"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {clientOptionLabel(c)}
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
                          <SelectItem value="COP">COP · Peso colombiano</SelectItem>
                          <SelectItem value="USD">USD · Dólar</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COTIZACION_ESTADO_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vigencia_dias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vigencia (días)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={365}
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
                  name="fee_mensual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee mensual</FormLabel>
                      <FormControl>
                        <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} moneda={values.moneda} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="gap-4">
              <CardHeader className="grid-cols-[1fr_auto]">
                <CardTitle>Ítems</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ descripcion: "", cantidad: 1, valor_unitario: 0 })}
                >
                  <Plus />
                  Ítem
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="hidden grid-cols-[1fr_72px_140px_120px_76px] gap-2 px-1 text-xs font-medium text-muted-foreground md:grid">
                  <span>Descripción</span>
                  <span className="text-right">Cant.</span>
                  <span className="text-right">Valor unitario</span>
                  <span className="text-right">Subtotal</span>
                  <span />
                </div>
                {fields.map((f, index) => (
                  <div
                    key={f.id}
                    className="grid grid-cols-2 gap-2 rounded-lg border p-2.5 md:grid-cols-[1fr_72px_140px_120px_76px] md:items-start md:border-0 md:p-0"
                  >
                    <FormField
                      control={form.control}
                      name={`items.${index}.descripcion`}
                      render={({ field }) => (
                        <FormItem className="col-span-2 md:col-span-1">
                          <FormControl>
                            <Textarea
                              rows={1}
                              placeholder="Sitio web de 6 secciones con blog"
                              className="min-h-9 resize-none py-1.5"
                              aria-label={`Descripción del ítem ${index + 1}`}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.cantidad`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="any"
                              className="text-right tabular"
                              aria-label="Cantidad"
                              value={Number.isNaN(field.value) ? "" : field.value}
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
                      name={`items.${index}.valor_unitario`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <MoneyInput
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              moneda={values.moneda}
                              className="text-right"
                              aria-label="Valor unitario"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex h-9 items-center text-sm font-semibold tabular md:justify-end">
                      <span className="mr-2 text-xs font-normal text-muted-foreground md:hidden">Subtotal</span>
                      {formatMoney(itemSubtotal(items[index] ?? { cantidad: 0, valor_unitario: 0 }), values.moneda)}
                    </div>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => move(index, index - 1)}
                        disabled={index === 0}
                        aria-label="Subir ítem"
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => move(index, index + 1)}
                        disabled={index === fields.length - 1}
                        aria-label="Bajar ítem"
                        className="hidden md:inline-flex"
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="hover:text-destructive"
                        aria-label="Quitar ítem"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
                {form.formState.errors.items?.root?.message && (
                  <p className="text-xs text-destructive">{form.formState.errors.items.root.message}</p>
                )}

                <div className="flex justify-end border-t pt-4">
                  <div className="w-full max-w-xs space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{fields.length} {fields.length === 1 ? "ítem" : "ítems"}</span>
                      <span className="tabular">{formatMoney(total, values.moneda)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium">Total</span>
                      <span className="text-xl font-semibold tracking-tight tabular">{formatMoney(total, values.moneda)}</span>
                    </div>
                    {doc.fee_mensual > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Fee mensual</span>
                        <span className="tabular">{formatMoney(doc.fee_mensual, values.moneda)}/mes</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-4">
              <CardHeader>
                <CardTitle>Condiciones</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="condiciones"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea rows={4} placeholder="Forma de pago, tiempos de entrega, qué no incluye…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Vista previa */}
          <div className={cn("min-w-0", mobileView === "editar" && "hidden lg:block")}>
            <div className="space-y-2 lg:sticky lg:top-20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="size-3.5" />
                  Vista previa
                </span>
                <span>Así se verá el PDF</span>
              </div>
              <div className="max-h-[calc(100dvh-140px)] overflow-y-auto rounded-xl bg-muted/40 p-3 sm:p-5">
                <QuoteDocument doc={doc} brand={brand} />
              </div>
            </div>
          </div>
        </div>
      </form>

      {quote && (
        <ConvertQuoteDialog open={convertOpen} onOpenChange={setConvertOpen} quote={quote} clientName={clientName} />
      )}
    </Form>
  );
}
