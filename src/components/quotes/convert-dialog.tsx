"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type { ProyectoTipo, Quote } from "@/types/database";
import { PROYECTO_TIPO_OPTIONS } from "@/lib/constants";
import { addDaysISO, formatMoney, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { convertSchema, type ConvertInput } from "@/lib/validations/quote";
import { convertQuoteToProjectAction } from "@/app/(app)/cotizaciones/actions";
import { FormDialog } from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Sugiere el tipo de proyecto a partir de los ítems cotizados. */
function guessTipo(text: string): ProyectoTipo {
  const t = text.toLowerCase();
  if (/\bbot\b|chatbot|whatsapp|\bia\b|inteligencia artificial|asistente/.test(t)) return "bot_ia";
  if (/automatiza|integraci|flujo|crm|zapier|make|n8n/.test(t)) return "automatizacion";
  if (/\bads\b|pauta|campa|meta|google ads|tiktok/.test(t)) return "ads";
  if (/web|sitio|p[aá]gina|landing|tienda|e-?commerce/.test(t)) return "web";
  if (/consultor|asesor|diagn[oó]stico|auditor/.test(t)) return "consultoria";
  return "otro";
}

function defaults(quote: Quote, clientName: string): ConvertInput {
  const total = Number(quote.total);
  const fee = Number(quote.fee_mensual);
  const allText = quote.items.map((i) => i.descripcion).join(" ");
  const start = todayISO();
  const end = addDaysISO(start, 30);
  const anticipo = Math.round(total / 2);

  const cobros: ConvertInput["cobros"] = [];
  if (total > 0) {
    cobros.push({ concepto: "Anticipo 50%", monto: anticipo, fecha_vencimiento: start });
    cobros.push({ concepto: "Pago final 50%", monto: total - anticipo, fecha_vencimiento: end });
  }
  if (fee > 0) cobros.push({ concepto: "Fee mensual (primer mes)", monto: fee, fecha_vencimiento: addDaysISO(end, 30) });

  const first = quote.items[0]?.descripcion ?? "";
  return {
    nombre: first.length > 3 && first.length <= 80 ? first : `Proyecto ${clientName}`,
    tipo: guessTipo(allText),
    valor_total: total,
    fee_mensual: fee,
    fecha_inicio: start,
    fecha_entrega: end,
    descripcion: `Cotización ${quote.numero}\n${quote.items.map((i) => `- ${i.descripcion}`).join("\n")}`,
    cobros,
  };
}

export function ConvertQuoteDialog({
  open,
  onOpenChange,
  quote,
  clientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  clientName: string;
}) {
  const router = useRouter();
  const form = useForm<ConvertInput>({
    resolver: zodResolver(convertSchema),
    defaultValues: quote ? defaults(quote, clientName) : undefined,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "cobros" });

  useEffect(() => {
    if (open && quote) form.reset(defaults(quote, clientName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!quote) return null;
  const moneda = quote.moneda;
  const valorTotal = form.watch("valor_total") ?? 0;
  const cobros = form.watch("cobros") ?? [];
  const programado = cobros.reduce((s, c) => s + (Number(c.monto) || 0), 0);
  const fee = form.watch("fee_mensual") ?? 0;
  const diff = programado - valorTotal - (cobros.some((c) => /fee/i.test(c.concepto)) ? fee : 0);

  const onSubmit = async (values: ConvertInput) => {
    const result = await convertQuoteToProjectAction(quote.id, values);
    if (!result.ok || !result.data) return void toast.error(result.ok ? "No se pudo crear el proyecto" : result.error);
    toast.success(
      values.cobros.length
        ? `Proyecto creado con ${values.cobros.length} ${values.cobros.length === 1 ? "cobro programado" : "cobros programados"}`
        : "Proyecto creado",
    );
    onOpenChange(false);
    router.push(`/proyectos/${result.data.projectId}`);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Convertir en proyecto"
      description={`${quote.numero} · ${clientName}. Revisa los datos y los cobros antes de crear el proyecto.`}
      size="xl"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nombre del proyecto *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROYECTO_TIPO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fecha_entrega"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entrega</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="valor_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor total</FormLabel>
                  <FormControl>
                    <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} moneda={moneda} />
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
                    <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} moneda={moneda} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Cuentas por cobrar */}
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Cuentas por cobrar</h3>
                <p className="text-xs text-muted-foreground">Se crean junto con el proyecto y aparecen en Finanzas y en el calendario.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ concepto: "Cuota", monto: 0, fecha_vencimiento: todayISO() })}
              >
                <Plus />
                Cobro
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                Sin cobros programados. Puedes agregarlos después desde Finanzas.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((f, index) => (
                  <div key={f.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_160px_150px_auto] sm:items-start sm:border-0 sm:p-0">
                    <FormField
                      control={form.control}
                      name={`cobros.${index}.concepto`}
                      render={({ field }) => (
                        <FormItem className="col-span-2 sm:col-span-1">
                          <FormControl>
                            <Input placeholder="Concepto" aria-label="Concepto" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`cobros.${index}.monto`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} moneda={moneda} aria-label="Monto" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`cobros.${index}.fecha_vencimiento`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="date" aria-label="Fecha de vencimiento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="hover:text-destructive"
                      aria-label="Quitar cobro"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {fields.length > 0 && (
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                  Math.abs(diff) < 1 ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {Math.abs(diff) >= 1 && <TriangleAlert className="size-4" />}
                  Programado: {formatMoney(programado, moneda)}
                </span>
                <span>
                  {Math.abs(diff) < 1
                    ? "Cuadra con el valor total"
                    : diff > 0
                      ? `${formatMoney(diff, moneda)} por encima del total`
                      : `Faltan ${formatMoney(-diff, moneda)} por programar`}
                </span>
              </div>
            )}
          </section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Crear proyecto
              {!form.formState.isSubmitting && <ArrowRight />}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
