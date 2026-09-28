"use client";

import Link from "next/link";
import { CalendarClock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { Project } from "@/types/database";
import { PROYECTO_ESTADOS, PROYECTO_TIPOS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { deliveryInfo, projectProgress } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

export type ProjectRow = Project & {
  client: { id: string; nombre: string; empresa: string | null } | null;
  tasks: { estado: string }[];
};

export function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: ProjectRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const progress = projectProgress(project.tasks);
  const delivery = deliveryInfo(project);
  const clientLabel = project.client ? project.client.empresa || project.client.nombre : "Sin cliente";

  return (
    <Card interactive className="group relative h-full gap-4 py-4">
      <Link
        href={`/proyectos/${project.id}`}
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={`Abrir ${project.nombre}`}
      />

      <div className="pointer-events-none relative flex items-start justify-between gap-2 px-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={PROYECTO_ESTADOS[project.estado].tone} dot>
            {PROYECTO_ESTADOS[project.estado].label}
          </Badge>
          <Badge tone="neutral">{PROYECTO_TIPOS[project.tipo].label}</Badge>
        </div>
        <div className="pointer-events-auto -mt-1 -mr-1">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${project.nombre}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="pointer-events-none relative space-y-1 px-4">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold">{project.nombre}</h3>
        <p className="truncate text-[13px] text-muted-foreground">{clientLabel}</p>
      </div>

      <div className="pointer-events-none relative space-y-2 px-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {progress.total ? `${progress.done} de ${progress.total} tareas` : "Sin tareas aún"}
          </span>
          <span className="font-medium tabular">{progress.pct}%</span>
        </div>
        <Progress value={progress.pct} />
      </div>

      <div className="pointer-events-none relative mt-auto flex items-end justify-between gap-3 border-t px-4 pt-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tabular">{formatMoney(project.valor_total, project.moneda)}</div>
          {Number(project.fee_mensual) > 0 && (
            <div className="text-xs text-muted-foreground tabular">
              + {formatMoney(project.fee_mensual, project.moneda)}/mes
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-right text-xs",
            delivery.tone === "danger" && "font-medium text-destructive",
            delivery.tone === "warning" && "font-medium text-warning",
            delivery.tone === "muted" && "text-muted-foreground",
          )}
        >
          <CalendarClock className="size-3.5 shrink-0" />
          {delivery.label}
        </div>
      </div>
    </Card>
  );
}
