"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, CheckSquare, Loader2, Plus, UserPlus, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { useQuickCreate, type QuickCreateKind } from "@/components/layout/quick-create";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const QUICK_ACTIONS: {
  kind: QuickCreateKind;
  label: string;
  createLabel: string;
  icon: typeof Plus;
  tone: string;
}[] = [
  { kind: "gasto", label: "Gasto", createLabel: "Nuevo gasto", icon: ArrowUpRight, tone: "text-destructive" },
  { kind: "ingreso", label: "Ingreso", createLabel: "Nuevo ingreso", icon: ArrowDownLeft, tone: "text-success" },
  { kind: "tarea", label: "Tarea", createLabel: "Nueva tarea", icon: CheckSquare, tone: "text-brand" },
  { kind: "reunion", label: "Reunión", createLabel: "Nueva reunión", icon: Video, tone: "text-info" },
  { kind: "cliente", label: "Cliente", createLabel: "Nuevo cliente", icon: UserPlus, tone: "text-pink" },
];

/** Botón flotante "+" siempre visible para crear rápido. */
export function QuickCreateFab() {
  const { open, prefetch, loading } = useQuickCreate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 md:right-6 md:bottom-6">
      <DropdownMenu
        modal={false}
        open={menuOpen}
        onOpenChange={(value) => {
          setMenuOpen(value);
          if (value) prefetch();
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onPointerEnter={prefetch}
            aria-label="Crear rápido"
            className={cn(
              "group relative flex size-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-[0_10px_30px_-8px] shadow-brand/60 outline-none transition-transform duration-200",
              "hover:scale-105 active:scale-95 focus-visible:ring-4 focus-visible:ring-ring/40",
            )}
          >
            <span className="absolute inset-0 rounded-full bg-white/0 transition-colors group-hover:bg-white/10" />
            {loading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <motion.span animate={{ rotate: menuOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                <Plus className="size-6" strokeWidth={2.4} />
              </motion.span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={10} className="w-52">
          <DropdownMenuLabel>Crear rápido</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {QUICK_ACTIONS.map(({ kind, label, icon: Icon, tone }) => (
            <DropdownMenuItem key={kind} onSelect={() => open(kind)} className="py-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
                <Icon className={cn("size-4", tone)} />
              </span>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
