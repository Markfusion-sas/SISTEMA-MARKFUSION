"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { SOPORTE_ACCEPT, SOPORTE_MAX_BYTES } from "@/lib/storage-client";
import { cn } from "@/lib/utils";
import { getSoporteUrlAction } from "@/app/(app)/finanzas/actions";
import { Button } from "@/components/ui/button";

/** Abre un soporte guardado en una pestaña nueva con URL firmada. */
export async function openSoporte(path: string) {
  const tab = window.open("", "_blank");
  const result = await getSoporteUrlAction(path);
  if (!result.ok || !result.data) {
    tab?.close();
    toast.error(result.ok ? "No se pudo abrir el soporte" : result.error);
    return;
  }
  if (tab) tab.location.href = result.data.url;
  else window.location.href = result.data.url;
}

/**
 * Campo de soporte (foto o PDF). Muestra el archivo ya guardado (`existing`)
 * o el nuevo elegido (`file`). `onRemoveExisting` quita el guardado.
 */
export function SoporteField({
  file,
  onFileChange,
  existing,
  onRemoveExisting,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  existing?: string | null;
  onRemoveExisting?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [opening, setOpening] = useState(false);

  const pick = (selected: File | undefined) => {
    if (!selected) return;
    if (selected.size > SOPORTE_MAX_BYTES) {
      toast.error("El soporte supera los 10 MB");
      return;
    }
    onFileChange(selected);
  };

  const name = file?.name ?? existing?.split("/").pop()?.replace(/^[0-9a-f-]{36}-/, "") ?? null;
  const isPdf = name?.toLowerCase().endsWith(".pdf");
  const Icon = isPdf ? FileText : ImageIcon;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={SOPORTE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {name ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
          {!file && existing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={opening}
              onClick={async () => {
                setOpening(true);
                await openSoporte(existing);
                setOpening(false);
              }}
            >
              {opening ? <Loader2 className="animate-spin" /> : "Ver"}
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            Cambiar
          </Button>
          <button
            type="button"
            onClick={() => (file ? onFileChange(null) : onRemoveExisting?.())}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Quitar soporte"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors",
            "hover:border-foreground/25 hover:bg-muted/30 hover:text-foreground",
          )}
        >
          <Paperclip className="size-4" />
          Adjuntar foto o PDF (opcional)
        </button>
      )}
    </div>
  );
}
