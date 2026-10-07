"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck } from "lucide-react";
import { toast } from "sonner";

import { METODOS_PAGO } from "@/lib/constants";
import { capitalize, formatDate, formatMoney, todayISO } from "@/lib/format";
import { subscriptionPaySchema, type SubscriptionPayInput } from "@/lib/validations/subscription";
import { paySubscriptionMonthAction } from "@/app/(app)/mensualidades/actions";
import type { CategoryOption } from "@/components/finance/types";
import { subscriptionWho, type SubscriptionRow } from "@/components/subscriptions/types";
import { FormDialog } from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function defaultCategory(categories: CategoryOption[]) {
  const ingresos = categories.filter((c) => c.tipo === "ingreso" && c.activo);
  return ingresos.find((c) => c.slug === "fee_mensual")?.slug ?? ingresos[0]?.slug ?? "";
}

/** Marca un mes de una mensualidad como pagado (registra el ingreso en Finanzas). */
export function PayMonthDialog({
  open,
  onOpenChange,
  subscription,
  month,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SubscriptionRow | null;
  month: string;
  categories: CategoryOption[];
}) {
  const form = useForm<SubscriptionPayInput>({
    resolver: zodResolver(subscriptionPaySchema),
    defaultValues: { mes: month, fecha_pago: todayISO(), monto: 0, categoria: "", metodo_pago: "" },
  });

  useEffect(() => {
    if (open && subscription) {
      form.reset({
        mes: month,
        fecha_pago: todayISO(),
        monto: Number(subscription.monto),
        categoria: defaultCategory(categories),
        metodo_pago: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!subscription) return null;
  const mesLabel = capitalize(formatDate(`${month}-15`, "monthYear"));
  const ingresos = categories.filter((c) => c.tipo === "ingreso" && c.activo).sort((a, b) => a.orden - b.orden);

  const onSubmit = async (values: SubscriptionPayInput) => {
    const result = await paySubscriptionMonthAction(subscription.id, values);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`${mesLabel} pagado · ${formatMoney(values.monto, subscription.moneda)}`);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Pago de ${mesLabel.toLowerCase()}`}
      description="Se registrará el ingreso en Finanzas."
      size="sm"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-sm font-medium">{subscriptionWho(subscription)}</div>
            <div className="text-xs text-muted-foreground">{subscription.servicio}</div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor pagado</FormLabel>
                  <FormControl>
                    <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} moneda={subscription.moneda} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fecha_pago"
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
                <FormItem>
                  <FormLabel>Método de pago</FormLabel>
                  <FormControl>
                    <Input list="metodos-pago-mensualidad" placeholder="Transferencia, Nequi…" {...field} />
                  </FormControl>
                  <datalist id="metodos-pago-mensualidad">
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </FormItem>
              )}
            />
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
