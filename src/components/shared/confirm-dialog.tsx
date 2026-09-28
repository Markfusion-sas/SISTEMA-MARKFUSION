"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Confirmación antes de una acción destructiva.
 * `onConfirm` puede ser async: el diálogo queda en "cargando" hasta que termine
 * y se cierra solo si no lanza error.
 */
export function ConfirmDialog({
  trigger,
  title = "¿Eliminar este registro?",
  description = "Esta acción no se puede deshacer.",
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  destructive = true,
  onConfirm,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (loading) return;
    onOpenChange?.(value);
    if (controlledOpen === undefined) setInternalOpen(value);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setLoading(false);
      onOpenChange?.(false);
      if (controlledOpen === undefined) setInternalOpen(false);
    } catch {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          {destructive && (
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <Button variant={destructive ? "destructive" : "default"} onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
