"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Client } from "@/types/database";
import { deleteClientAction } from "@/app/(app)/clientes/actions";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ClientHeaderActions({ client }: { client: Client }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const result = await deleteClientAction(client.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Cliente eliminado");
    router.push("/clientes");
  };

  return (
    <>
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil />
        Editar
      </Button>
      <Button onClick={() => setProjectOpen(true)}>
        <Plus />
        Nuevo proyecto
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
            Editar cliente
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push(`/cotizaciones/nueva?cliente=${client.id}`)}>
            <FileText />
            Nueva cotización
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Eliminar cliente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      <ProjectFormDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        clients={[{ id: client.id, nombre: client.nombre, empresa: client.empresa }]}
        defaultClientId={client.id}
        goToDetail
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar a ${client.empresa || client.nombre}?`}
        description="Se eliminarán también sus cotizaciones y documentos. Si tiene proyectos, primero debes eliminarlos."
        onConfirm={handleDelete}
      />
    </>
  );
}
