"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MapPin, MoreHorizontal, Pencil, Plus, SearchX, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import type { Client, ClienteEstado, CobroEstado, Moneda } from "@/types/database";
import { CLIENTE_ESTADOS, CLIENTE_ESTADO_OPTIONS } from "@/lib/constants";
import { formatTotals, receivableStatus, sumByCurrency } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { deleteClientAction } from "@/app/(app)/clientes/actions";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput, normalize } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ClientRow = Client & {
  projects: {
    id: string;
    estado: string;
    receivables: { monto: number; moneda: Moneda; estado: CobroEstado; fecha_vencimiento: string }[];
  }[];
};

type Filter = ClienteEstado | "todos";

function summarize(client: ClientRow) {
  const receivables = client.projects.flatMap((p) => p.receivables).filter((r) => r.estado === "pendiente");
  const overdue = receivables.some((r) => receivableStatus(r) === "vencido");
  const activeProjects = client.projects.filter((p) => !["entregado", "cancelado"].includes(p.estado)).length;
  return { pending: sumByCurrency(receivables), hasPending: receivables.length > 0, overdue, activeProjects };
}

export function ClientsView({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return clients.filter((c) => {
      if (filter !== "todos" && c.estado !== filter) return false;
      if (!q) return true;
      return [c.nombre, c.empresa, c.email, c.telefono, c.ciudad, c.origen].some((f) => normalize(f).includes(q));
    });
  }, [clients, search, filter]);

  const chips = [
    { value: "todos" as Filter, label: "Todos", count: clients.length },
    ...CLIENTE_ESTADO_OPTIONS.map((o) => ({
      value: o.value as Filter,
      label: o.label,
      count: clients.filter((c) => c.estado === o.value).length,
    })),
  ];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteClientAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Cliente eliminado");
    setDeleting(null);
  };

  const actions = (client: Client) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${client.nombre}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <Link href={`/clientes/${client.id}`}>
            <Eye />
            Ver ficha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openEdit(client)}>
          <Pencil />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(client)}>
          <Trash2 />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={`${clients.length} ${clients.length === 1 ? "registro" : "registros"} entre prospectos y clientes.`}
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Nuevo cliente
          </Button>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no hay clientes"
          description="Registra tu primer prospecto para empezar a llevar proyectos, cotizaciones y cobros."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Agregar cliente
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterChips options={chips} value={filter} onChange={setFilter} />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre, empresa, ciudad…"
              className="w-full lg:w-80"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={SearchX}
              title="Sin resultados"
              description="Prueba con otra búsqueda o cambia el filtro de estado."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setFilter("todos");
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              {/* Escritorio */}
              <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Cliente</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Proyectos</TableHead>
                      <TableHead className="text-right">Por cobrar</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((client) => {
                      const s = summarize(client);
                      return (
                        <TableRow
                          key={client.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/clientes/${client.id}`)}
                        >
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3">
                              <ClientAvatar nombre={client.nombre} empresa={client.empresa} />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{client.empresa || client.nombre}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {client.empresa ? client.nombre : `Desde ${formatDate(client.created_at, "month")}`}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-[13px]">{client.email || "—"}</div>
                            <div className="text-xs text-muted-foreground">{client.telefono || ""}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{client.ciudad || "—"}</TableCell>
                          <TableCell>
                            <Badge tone={CLIENTE_ESTADOS[client.estado].tone} dot>
                              {CLIENTE_ESTADOS[client.estado].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular">
                            {client.projects.length}
                            {s.activeProjects > 0 && (
                              <span className="ml-1 text-xs text-muted-foreground">({s.activeProjects} activos)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular">
                            {s.hasPending ? (
                              <span className={s.overdue ? "font-medium text-destructive" : "font-medium"}>
                                {formatTotals(s.pending)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-3 text-right">{actions(client)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Celular */}
              <div className="space-y-2 md:hidden">
                {filtered.map((client) => {
                  const s = summarize(client);
                  return (
                    <div key={client.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-card">
                      <Link href={`/clientes/${client.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                        <ClientAvatar nombre={client.nombre} empresa={client.empresa} />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div>
                            <div className="truncate font-medium">{client.empresa || client.nombre}</div>
                            {client.empresa && <div className="truncate text-xs text-muted-foreground">{client.nombre}</div>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge tone={CLIENTE_ESTADOS[client.estado].tone} dot>
                              {CLIENTE_ESTADOS[client.estado].label}
                            </Badge>
                            {client.ciudad && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3" />
                                {client.ciudad}
                              </span>
                            )}
                            {s.hasPending && (
                              <span className={s.overdue ? "font-medium text-destructive" : "font-medium text-foreground"}>
                                {formatTotals(s.pending)} por cobrar
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                      {actions(client)}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} goToDetail={!editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar a ${deleting?.empresa || deleting?.nombre}?`}
        description="Se eliminarán también sus cotizaciones y documentos. Si tiene proyectos, primero debes eliminarlos."
        onConfirm={handleDelete}
      />
    </div>
  );
}
