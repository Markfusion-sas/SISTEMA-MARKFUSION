"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import type { Client } from "@/types/database";
import { CLIENTE_ESTADO_OPTIONS, ORIGENES_CLIENTE } from "@/lib/constants";
import { CLIENT_DEFAULTS, clientSchema, type ClientInput } from "@/lib/validations/client";
import { createClientAction, updateClientAction } from "@/app/(app)/clientes/actions";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function toInput(client?: Client | null): ClientInput {
  if (!client) return CLIENT_DEFAULTS;
  return {
    nombre: client.nombre,
    empresa: client.empresa ?? "",
    telefono: client.telefono ?? "",
    email: client.email ?? "",
    ciudad: client.ciudad ?? "",
    pais: client.pais ?? "",
    estado: client.estado,
    origen: client.origen ?? "",
    notas: client.notas ?? "",
  };
}

/** Crear o editar un cliente. Si recibe `client`, edita. */
export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  goToDetail = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  /** Tras crear, abre la ficha del cliente. */
  goToDetail?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(client);

  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: toInput(client),
  });

  // Reinicia solo al abrir, para no perder lo escrito si la página se refresca.
  useEffect(() => {
    if (open) form.reset(toInput(client));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (values: ClientInput) => {
    if (client) {
      const result = await updateClientAction(client.id, values);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Cliente actualizado");
      onOpenChange(false);
      return;
    }

    const result = await createClientAction(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`${values.nombre} agregado a clientes`);
    onOpenChange(false);
    if (goToDetail && result.data) router.push(`/clientes/${result.data.id}`);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar cliente" : "Nuevo cliente"}
      description={isEdit ? undefined : "Registra un prospecto o un cliente de la agencia."}
      size="lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del contacto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Laura Restrepo" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="empresa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Clínica Dental Sonríe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono / WhatsApp</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+57 310 000 0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contacto@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ciudad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Medellín" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <Input placeholder="Colombia" {...field} />
                  </FormControl>
                  <FormMessage />
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
                      {CLIENTE_ESTADO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
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
              name="origen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cómo llegó?</FormLabel>
                  <FormControl>
                    <Input list="origenes-cliente" placeholder="Referido, Instagram…" {...field} />
                  </FormControl>
                  <datalist id="origenes-cliente">
                    {ORIGENES_CLIENTE.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                  <FormMessage />
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
                  <Textarea rows={3} placeholder="Preferencias, contexto, próximos pasos…" {...field} />
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
              {isEdit ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
