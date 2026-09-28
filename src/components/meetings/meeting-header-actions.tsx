"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCheck, ExternalLink, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Meeting } from "@/types/database";
import { deleteMeetingAction, setMeetingStatusAction } from "@/app/(app)/reuniones/actions";
import {
  MeetingFormDialog,
  type MeetingClientOption,
  type MeetingProjectOption,
} from "@/components/meetings/meeting-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MeetingHeaderActions({
  meeting,
  clients,
  projects,
}: {
  meeting: Meeting;
  clients: MeetingClientOption[];
  projects: MeetingProjectOption[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const setStatus = (estado: Meeting["estado"]) =>
    startTransition(async () => {
      const result = await setMeetingStatusAction(meeting.id, estado);
      if (!result.ok) return void toast.error(result.error);
      toast.success(
        estado === "realizada" ? "Reunión marcada como realizada" : estado === "cancelada" ? "Reunión cancelada" : "Reunión reactivada",
      );
    });

  const handleDelete = async () => {
    const result = await deleteMeetingAction(meeting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Reunión eliminada");
    router.push("/reuniones");
  };

  return (
    <>
      {meeting.link && meeting.estado === "programada" && (
        <Button asChild variant="outline">
          <a href={meeting.link} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            Unirse
          </a>
        </Button>
      )}
      {meeting.estado === "programada" && (
        <Button onClick={() => setStatus("realizada")} loading={pending}>
          {!pending && <CheckCheck />}
          Marcar como realizada
        </Button>
      )}
      {meeting.estado !== "programada" && (
        <Button variant="outline" onClick={() => setStatus("programada")} loading={pending}>
          {!pending && <RotateCcw />}
          Volver a programada
        </Button>
      )}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Más acciones">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Editar o reprogramar
          </DropdownMenuItem>
          {meeting.estado === "programada" && (
            <DropdownMenuItem onSelect={() => setStatus("cancelada")}>
              <Ban />
              Cancelar reunión
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MeetingFormDialog open={editOpen} onOpenChange={setEditOpen} meeting={meeting} clients={clients} projects={projects} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar "${meeting.titulo}"?`}
        description="Se borran la agenda, las notas y las decisiones. Las tareas creadas en la reunión se conservan."
        onConfirm={handleDelete}
      />
    </>
  );
}
