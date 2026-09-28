"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import type { Project } from "@/types/database";
import { PROYECTO_ESTADO_OPTIONS, PROYECTO_TIPO_OPTIONS } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { projectSchema, type ProjectInput } from "@/lib/validations/project";
import { createProjectAction, updateProjectAction } from "@/app/(app)/proyectos/actions";
import { FormDialog } from "@/components/shared/form-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface ClientOption {
  id: string;
  nombre: string;
  empresa: string | null;
}

function toInput(project?: Project | null, clientId?: string): ProjectInput {
  if (!project) {
    return {
      client_id: clientId ?? "",
      nombre: "",
      tipo: "web",
      estado: "en_curso",
      moneda: "COP",
      valor_total: 0,
      fee_mensual: 0,
      fecha_inicio: todayISO(),
      fecha_entrega: "",
      descripcion: "",
    };
  }
  return {
    client_id: project.client_id,
    nombre: project.nombre,
    tipo: project.tipo,
    estado: project.estado,
    moneda: project.moneda,
    valor_total: Number(project.valor_total),
    fee_mensual: Number(project.fee_mensual),
    fecha_inicio: project.fecha_inicio ?? "",
    fecha_entrega: project.fecha_entrega ?? "",
    descripcion: project.descripcion ?? "",
  };
}

/** Crear o editar un proyecto. */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  clients,
  defaultClientId,
  goToDetail = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  clients: ClientOption[];
  defaultClientId?: string;
  goToDetail?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(project);

  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: toInput(project, defaultClientId),
  });

  // Reinicia solo al abrir, para no perder lo escrito si la página se refresca.
  useEffect(() => {
    if (open) form.reset(toInput(project, defaultClientId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const moneda = form.watch("moneda");

  const onSubmit = async (values: ProjectInput) => {
    if (project) {
      const result = await updateProjectAction(project.id, values);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Proyecto actualizado");
      onOpenChange(false);
      return;
    }

    const result = await createProjectAction(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Proyecto creado");
    onOpenChange(false);
    if (goToDetail && result.data) router.push(`/proyectos/${result.data.id}`);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar proyecto" : "Nuevo proyecto"}
      description={isEdit ? undefined : "Registra un proyecto contratado por un cliente."}
      size="lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nombre del proyecto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Sitio web + agenda de citas" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange} disabled={clients.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={clients.length ? "Elige un cliente" : "Primero crea un cliente"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.empresa ? `${c.empresa} · ${c.nombre}` : c.nombre}
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
                      {PROYECTO_ESTADO_OPTIONS.map((o) => (
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="valor_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor total</FormLabel>
                  <FormControl>
                    <MoneyInput value={field.value} onChange={field.onChange} moneda={moneda} onBlur={field.onBlur} />
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
                    <MoneyInput value={field.value} onChange={field.onChange} moneda={moneda} onBlur={field.onBlur} />
                  </FormControl>
                  <FormDescription>Mantenimiento o gestión recurrente. Deja 0 si no aplica.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fecha_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de inicio</FormLabel>
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
                  <FormLabel>Fecha de entrega</FormLabel>
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
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Alcance, entregables y acuerdos principales…" {...field} />
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
              {isEdit ? "Guardar cambios" : "Crear proyecto"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
