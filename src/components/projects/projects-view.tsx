"use client";

import { useMemo, useState } from "react";
import { Briefcase, Plus, SearchX } from "lucide-react";
import { toast } from "sonner";

import type { Project, ProyectoEstado, ProyectoTipo } from "@/types/database";
import { PROYECTO_ESTADO_OPTIONS, PROYECTO_TIPO_OPTIONS } from "@/lib/constants";
import { deleteProjectAction } from "@/app/(app)/proyectos/actions";
import { ProjectCard, type ProjectRow } from "@/components/projects/project-card";
import { ProjectFormDialog, type ClientOption } from "@/components/projects/project-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { PageHeader } from "@/components/shared/page-header";
import { Stagger, StaggerItem } from "@/components/shared/page-transition";
import { SearchInput, normalize } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACTIVE: ProyectoEstado[] = ["en_curso", "en_revision", "mantenimiento"];
type EstadoFilter = ProyectoEstado | "activos" | "todos";

export function ProjectsView({ projects, clients }: { projects: ProjectRow[]; clients: ClientOption[] }) {
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<EstadoFilter>("activos");
  const [tipo, setTipo] = useState<ProyectoTipo | "todos">("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<ProjectRow | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return projects.filter((p) => {
      if (estado === "activos" && !ACTIVE.includes(p.estado)) return false;
      if (estado !== "activos" && estado !== "todos" && p.estado !== estado) return false;
      if (tipo !== "todos" && p.tipo !== tipo) return false;
      if (!q) return true;
      return [p.nombre, p.client?.nombre, p.client?.empresa, p.descripcion].some((f) => normalize(f).includes(q));
    });
  }, [projects, search, estado, tipo]);

  const chips = [
    { value: "activos" as EstadoFilter, label: "Activos", count: projects.filter((p) => ACTIVE.includes(p.estado)).length },
    { value: "todos" as EstadoFilter, label: "Todos", count: projects.length },
    ...PROYECTO_ESTADO_OPTIONS.map((o) => ({
      value: o.value as EstadoFilter,
      label: o.label,
      count: projects.filter((p) => p.estado === o.value).length,
    })),
  ];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteProjectAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Proyecto eliminado");
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        description="Avance, entregas y valor de cada proyecto."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Nuevo proyecto
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Aún no hay proyectos"
          description={
            clients.length
              ? "Crea el primer proyecto para seguir su avance, cobros y documentos."
              : "Primero registra un cliente en el módulo de clientes; luego crea su proyecto."
          }
          action={
            <Button onClick={openCreate} disabled={!clients.length}>
              <Plus />
              Crear proyecto
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <FilterChips options={chips} value={estado} onChange={setEstado} />
            <div className="flex gap-2">
              <Select value={tipo} onValueChange={(v) => setTipo(v as ProyectoTipo | "todos")}>
                <SelectTrigger className="w-44 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {PROYECTO_TIPO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar proyecto o cliente…" className="w-full xl:w-72" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={SearchX}
              title="Ningún proyecto coincide"
              description="Prueba con otra búsqueda o cambia los filtros."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setEstado("todos");
                    setTipo("todos");
                  }}
                >
                  Ver todos
                </Button>
              }
            />
          ) : (
            <Stagger key={`${estado}-${tipo}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((project) => (
                <StaggerItem key={project.id}>
                  <ProjectCard
                    project={project}
                    onEdit={() => {
                      setEditing(project);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(project)}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </>
      )}

      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} project={editing} clients={clients} goToDetail={!editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar "${deleting?.nombre}"?`}
        description="También se eliminarán sus tareas, cuentas por cobrar y documentos. Los movimientos de dinero se conservan sin proyecto."
        onConfirm={handleDelete}
      />
    </div>
  );
}
