"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Project, ProyectoEstado } from "@/types/database";
import { PROYECTO_ESTADOS, PROYECTO_ESTADO_OPTIONS } from "@/lib/constants";
import { deleteProjectAction, updateProjectStatusAction } from "@/app/(app)/proyectos/actions";
import { ProjectFormDialog, type ClientOption } from "@/components/projects/project-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DOT: Record<string, string> = {
  brand: "bg-brand",
  warning: "bg-warning",
  success: "bg-success",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

export function ProjectHeaderActions({ project, clients }: { project: Project; clients: ClientOption[] }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [estado, setEstado] = useState<ProyectoEstado>(project.estado);
  const [pending, startTransition] = useTransition();

  const changeStatus = (next: ProyectoEstado) => {
    const previous = estado;
    setEstado(next);
    startTransition(async () => {
      const result = await updateProjectStatusAction(project.id, next);
      if (!result.ok) {
        setEstado(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`Proyecto en estado "${PROYECTO_ESTADOS[next].label}"`);
    });
  };

  const handleDelete = async () => {
    const result = await deleteProjectAction(project.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Proyecto eliminado");
    router.push("/proyectos");
  };

  return (
    <>
      <Select value={estado} onValueChange={(v) => changeStatus(v as ProyectoEstado)} disabled={pending}>
        <SelectTrigger className="w-44" aria-label="Estado del proyecto">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROYECTO_ESTADO_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className={`size-2 rounded-full ${DOT[o.tone] ?? "bg-muted-foreground"}`} />
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil />
        Editar
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Más acciones">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Editar proyecto
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Eliminar proyecto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} clients={clients} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar "${project.nombre}"?`}
        description="También se eliminarán sus tareas, cuentas por cobrar y documentos. Los movimientos de dinero se conservan sin proyecto."
        onConfirm={handleDelete}
      />
    </>
  );
}
