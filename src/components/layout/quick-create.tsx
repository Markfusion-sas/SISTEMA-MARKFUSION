"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { toast } from "sonner";

import { getQuickCreateOptionsAction, type QuickCreateOptions } from "@/lib/actions/global";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { TransactionFormDialog } from "@/components/finance/transaction-form-dialog";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";

export type QuickCreateKind = "gasto" | "ingreso" | "tarea" | "reunion" | "cliente";

interface QuickCreateContextValue {
  open: (kind: QuickCreateKind) => void;
  /** Precarga las opciones (al abrir el menú "+") para que el formulario salga sin espera. */
  prefetch: () => void;
  loading: QuickCreateKind | null;
}

const QuickCreateContext = createContext<QuickCreateContextValue | null>(null);

export function useQuickCreate() {
  const ctx = useContext(QuickCreateContext);
  if (!ctx) throw new Error("useQuickCreate debe usarse dentro de <QuickCreateProvider>");
  return ctx;
}

const CACHE_MS = 30_000;

/**
 * Formularios de creación rápida disponibles desde cualquier página
 * (botón flotante "+" y buscador Ctrl/⌘ + K).
 */
export function QuickCreateProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<QuickCreateOptions | null>(null);
  const [kind, setKind] = useState<QuickCreateKind | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState<QuickCreateKind | null>(null);
  const fetchedAt = useRef(0);
  const inflight = useRef<Promise<QuickCreateOptions> | null>(null);

  const load = useCallback(async () => {
    if (options && Date.now() - fetchedAt.current < CACHE_MS) return options;
    if (!inflight.current) {
      inflight.current = getQuickCreateOptionsAction().finally(() => {
        inflight.current = null;
      });
    }
    const data = await inflight.current;
    fetchedAt.current = Date.now();
    setOptions(data);
    return data;
  }, [options]);

  const prefetch = useCallback(() => {
    void load().catch(() => undefined);
  }, [load]);

  const open = useCallback(
    async (next: QuickCreateKind) => {
      if (next === "cliente") {
        setKind(next);
        setDialogOpen(true);
        return;
      }
      setLoading(next);
      try {
        await load();
        setKind(next);
        setDialogOpen(true);
      } catch {
        toast.error("No se pudo abrir el formulario. Revisa tu conexión.");
      } finally {
        setLoading(null);
      }
    },
    [load],
  );

  return (
    <QuickCreateContext.Provider value={{ open, prefetch, loading }}>
      {children}

      <ClientFormDialog open={dialogOpen && kind === "cliente"} onOpenChange={setDialogOpen} goToDetail />

      {options && (
        <>
          <TransactionFormDialog
            open={dialogOpen && (kind === "gasto" || kind === "ingreso")}
            onOpenChange={setDialogOpen}
            defaultTipo={kind === "ingreso" ? "ingreso" : "gasto"}
            categories={options.categories}
            projects={options.financeProjects}
          />
          <TaskFormDialog
            open={dialogOpen && kind === "tarea"}
            onOpenChange={setDialogOpen}
            projects={options.taskProjects}
            meetings={options.meetings}
          />
          <MeetingFormDialog
            open={dialogOpen && kind === "reunion"}
            onOpenChange={setDialogOpen}
            clients={options.clients}
            projects={options.meetingProjects}
            goToDetail
          />
        </>
      )}
    </QuickCreateContext.Provider>
  );
}
