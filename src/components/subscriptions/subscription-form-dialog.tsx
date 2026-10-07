"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, PencilLine } from "lucide-react";
import { toast } from "sonner";

import { clientOptionLabel } from "@/lib/clients";
import { todayISO } from "@/lib/format";
import { subscriptionSchema, type SubscriptionInput } from "@/lib/validations/subscription";
import { createSubscriptionAction, updateSubscriptionAction } from "@/app/(app)/mensualidades/actions";
import type { SubscriptionRow } from "@/components/subscriptions/types";
import { FormDialog } from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none__";
const SERVICIOS = [
  "Hosting + mantenimiento web",
  "Mantenimiento web",
  "Hosting y dominio",
  "Bot de WhatsApp",
  "Automatizaciones",
  "Gestión de pauta",
  "Gestión de redes sociales",
  "Soporte técnico",
  "Licencia del sistema",
];

export interface SubscriptionClientOption {
  id: string;
  nombre: string;
  empresa: string | null;
  estado?: string;
}

/** Busca un cliente registrado cuyo nombre coincida con lo escrito. */
function matchClient(text: string, clients: SubscriptionClientOption[]) {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  return (
    clients.find(
      (c) =>
        clientOptionLabel(c).toLowerCase() === q ||
        (c.empresa ?? "").toLowerCase() === q ||
        c.nombre.toLowerCase() === q ||
        (c.empresa ? `${c.empresa} · ${c.nombre}` : c.nombre).toLowerCase() === q,
    ) ?? null
  );
}

function toInput(s: SubscriptionRow | null | undefined, clients: SubscriptionClientOption[]): SubscriptionInput {
  if (s) {
    const client = clients.find((c) => c.id === s.client_id);
    return {
      client_id: s.client_id,
      cliente: client ? clientOptionLabel(client) : (s.client ? s.client.empresa || s.client.nombre : (s.cliente ?? "")),
      project_id: s.project_id,
      servicio: s.servicio,
      monto: Number(s.monto),
      moneda: s.moneda,
      dia_cobro: s.dia_cobro,
      fecha_inicio: s.fecha_inicio,
      activo: s.activo,
      notas: s.notas ?? "",
    };
  }
  return {
    client_id: null,
    cliente: "",
    project_id: null,
    servicio: "",
    monto: 0,
    moneda: "COP",
    dia_cobro: Number(todayISO().slice(8, 10)),
    fecha_inicio: todayISO(),
    activo: true,
    notas: "",
  };
}

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  subscription,
  clients,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: SubscriptionRow | null;
  clients: SubscriptionClientOption[];
  projects: { id: string; nombre: string; cliente: string | null }[];
}) {
  const isEdit = Boolean(subscription);
  const form = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: toInput(subscription, clients),
  });

  // Reinicia solo al abrir, para no perder lo escrito si la página se refresca.
  useEffect(() => {
    if (open) form.reset(toInput(subscription, clients));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const moneda = form.watch("moneda");
  const clienteText = form.watch("cliente");
  const linked = matchClient(clienteText, clients);
  // Al editar, si el cliente ligado no está en la lista se conserva el vínculo original.
  const keepsOriginal = !linked && Boolean(subscription?.client_id) && clienteText === toInput(subscription, clients).cliente;

  const onSubmit = async (values: SubscriptionInput) => {
    const client = matchClient(values.cliente, clients);
    const payload: SubscriptionInput = client
      ? { ...values, client_id: client.id }
      : keepsOriginal
        ? { ...values, client_id: subscription!.client_id }
        : { ...values, client_id: null };

    const result = subscription
      ? await updateSubscriptionAction(subscription.id, payload)
      : await createSubscriptionAction(payload);
    if (!result.ok) return void toast.error(result.error);
    toast.success(subscription ? "Mensualidad actualizada" : "Mensualidad creada");
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar mensualidad" : "Nueva mensualidad"}
      description={isEdit ? undefined : "Un cobro que se repite cada mes: hosting, mantenimiento, bots, sistemas…"}
      size="lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
          <FormField
            control={form.control}
            name="cliente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente *</FormLabel>
                <FormControl>
                  <Input
                    list="clientes-mensualidad"
                    placeholder="Escribe o pega el cliente"
                    autoFocus={!isEdit}
                    {...field}
                  />
                </FormControl>
                <datalist id="clientes-mensualidad">
                  {clients.map((c) => (
                    <option key={c.id} value={clientOptionLabel(c)} />
                  ))}
                </datalist>
                {clienteText.trim() && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {linked || keepsOriginal ? (
                      <>
                        <Link2 className="size-3.5 text-brand" />
                        Ligada al cliente{" "}
                        <span className="font-medium text-foreground">
                          {linked ? linked.empresa || linked.nombre : subscriptionWhoFallback(subscription)}
                        </span>
                      </>
                    ) : (
                      <>
                        <PencilLine className="size-3.5" />
                        Se guardará como texto (elige una sugerencia para ligarla a un cliente registrado)
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
            name="servicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Servicio *</FormLabel>
                <FormControl>
                  <Input list="servicios-mensualidad" placeholder="Hosting + mantenimiento web" {...field} />
                </FormControl>
                <datalist id="servicios-mensualidad">
                  {SERVICIOS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-[1fr_110px_130px]">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor mensual *</FormLabel>
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
            <FormField
              control={form.control}
              name="dia_cobro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Día de cobro *</FormLabel>
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fecha_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cobrar desde *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>Primer mes que se le cobra.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proyecto (opcional)</FormLabel>
                  <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin proyecto</SelectItem>
                      {projects.length > 0 && <SelectSeparator />}
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre}
                          {p.cliente && <span className="text-muted-foreground">· {p.cliente}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Así el ingreso cuenta en las finanzas del proyecto.</FormDescription>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Qué incluye, forma de pago acordada, contacto para cobrar…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <FormLabel>Activa</FormLabel>
                  <p className="mt-1 text-xs text-muted-foreground">Las pausadas no aparecen en el cobro del mes ni suman al ingreso recurrente.</p>
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
              {isEdit ? "Guardar cambios" : "Crear mensualidad"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}

function subscriptionWhoFallback(s: SubscriptionRow | null | undefined) {
  return s?.client ? s.client.empresa || s.client.nombre : "";
}
