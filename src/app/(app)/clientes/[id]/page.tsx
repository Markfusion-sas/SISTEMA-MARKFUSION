import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarPlus,
  CircleDollarSign,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react";

import type { Client, Moneda, Quote } from "@/types/database";
import { getCategoryLabeler } from "@/lib/categories";
import { CLIENTE_ESTADOS, COTIZACION_ESTADOS, PROYECTO_ESTADOS } from "@/lib/constants";
import { formatTotals, receivableStatus, sumByCurrency } from "@/lib/finance";
import { formatDate, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { ClientHeaderActions } from "@/components/clients/client-header-actions";
import { DocumentsPanel, type DocumentRow } from "@/components/documents/documents-panel";
import { ReceivableList, TransactionList, type ReceivableItem, type TransactionItem } from "@/components/finance/money-lists";
import { MeetingList, type MeetingItem } from "@/components/meetings/meeting-list";
import { deliveryInfo, projectProgress } from "@/lib/projects";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Cliente" };
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("nombre, empresa").eq("id", id).maybeSingle();
  return { title: data ? data.empresa || data.nombre : "Cliente" };
}

type ProjectWithTasks = {
  id: string;
  nombre: string;
  estado: keyof typeof PROYECTO_ESTADOS;
  valor_total: number;
  fee_mensual: number;
  moneda: Moneda;
  fecha_entrega: string | null;
  tasks: { estado: string }[];
};

export default async function ClienteDetallePage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: clientData } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!clientData) notFound();
  const client = clientData as Client;

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, nombre, estado, valor_total, fee_mensual, moneda, fecha_entrega, tasks(estado)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  const projects = (projectsData ?? []) as ProjectWithTasks[];
  const projectIds = projects.map((p) => p.id);
  const inProjects = projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"];
  const linkFilter = `client_id.eq.${id},project_id.in.(${inProjects.join(",")})`;

  const [quotesRes, meetingsRes, receivablesRes, transactionsRes, documentsRes, categoryLabel] = await Promise.all([
    supabase.from("quotes").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase
      .from("meetings")
      .select("id, titulo, tipo, estado, fecha_inicio, fecha_fin, link")
      .or(linkFilter)
      .order("fecha_inicio", { ascending: false }),
    supabase
      .from("receivables")
      .select("id, concepto, monto, moneda, fecha_vencimiento, estado, pagado_en, project:projects(id, nombre)")
      .in("project_id", inProjects),
    supabase
      .from("transactions")
      .select("id, tipo, monto, moneda, categoria, descripcion, fecha, metodo_pago, project:projects(id, nombre)")
      .in("project_id", inProjects)
      .eq("tipo", "ingreso")
      .order("fecha", { ascending: false }),
    supabase.from("documents").select("*, project:projects(id, nombre)").or(linkFilter).order("created_at", { ascending: false }),
    getCategoryLabeler(supabase),
  ]);

  const quotes = (quotesRes.data ?? []) as Quote[];
  const meetings = (meetingsRes.data ?? []) as MeetingItem[];
  const receivables = (receivablesRes.data ?? []) as unknown as ReceivableItem[];
  const payments = (transactionsRes.data ?? []) as unknown as TransactionItem[];
  const documents = (documentsRes.data ?? []) as unknown as DocumentRow[];

  const pendingRows = receivables.filter((r) => r.estado === "pendiente");
  const overdueRows = pendingRows.filter((r) => receivableStatus(r) === "vencido");
  const pending = sumByCurrency(pendingRows);
  const collected = sumByCurrency(payments);
  const contracted = sumByCurrency(
    projects.filter((p) => p.estado !== "cancelado").map((p) => ({ monto: p.valor_total, moneda: p.moneda })),
  );
  const activeProjects = projects.filter((p) => ["en_curso", "en_revision", "mantenimiento"].includes(p.estado));
  const monthlyFees = sumByCurrency(
    activeProjects.filter((p) => Number(p.fee_mensual) > 0).map((p) => ({ monto: p.fee_mensual, moneda: p.moneda })),
  );

  const estado = CLIENTE_ESTADOS[client.estado];
  const phoneDigits = client.telefono?.replace(/\D/g, "") ?? "";
  const titulo = client.empresa || client.nombre;

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Clientes
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ClientAvatar nombre={client.nombre} empresa={client.empresa} className="size-14 rounded-xl text-base" />
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{titulo}</h1>
                <Badge tone={estado.tone} dot>
                  {estado.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {client.empresa ? client.nombre : "Persona natural"}
                {client.ciudad ? ` · ${client.ciudad}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClientHeaderActions client={client} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saldo pendiente"
          icon={Receipt}
          tone={overdueRows.length ? "danger" : pendingRows.length ? "warning" : "default"}
          value={formatTotals(pending)}
          hint={
            overdueRows.length
              ? `${formatTotals(sumByCurrency(overdueRows))} vencido`
              : pendingRows.length
                ? `${pendingRows.length} ${pendingRows.length === 1 ? "cobro pendiente" : "cobros pendientes"}`
                : "Al día"
          }
        />
        <StatCard label="Cobrado" icon={CircleDollarSign} tone="success" value={formatTotals(collected)} hint="Ingresos de sus proyectos" />
        <StatCard
          label="Valor contratado"
          icon={Wallet}
          tone="brand"
          value={formatTotals(contracted)}
          hint={Object.keys(monthlyFees).length ? `+ ${formatTotals(monthlyFees)}/mes en fees` : "Sin fees mensuales"}
        />
        <StatCard
          label="Proyectos"
          icon={Briefcase}
          value={projects.length}
          hint={`${activeProjects.length} ${activeProjects.length === 1 ? "activo" : "activos"}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]">
        {/* Ficha */}
        <Card className="h-fit gap-4">
          <CardHeader>
            <CardTitle>Ficha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <InfoRow label="Contacto" value={client.nombre} />
            <InfoRow
              label="Teléfono"
              value={
                client.telefono ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <a href={`tel:${phoneDigits}`} className="inline-flex items-center gap-1.5 hover:text-brand">
                      <Phone className="size-3.5" />
                      {client.telefono}
                    </a>
                    {phoneDigits.length >= 10 && (
                      <a
                        href={`https://wa.me/${phoneDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                      >
                        <MessageCircle className="size-3.5" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                ) : null
              }
            />
            <InfoRow
              label="Correo"
              value={
                client.email ? (
                  <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 break-all hover:text-brand">
                    <Mail className="size-3.5 shrink-0" />
                    {client.email}
                  </a>
                ) : null
              }
            />
            <InfoRow
              label="Ubicación"
              value={
                client.ciudad || client.pais ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {[client.ciudad, client.pais].filter(Boolean).join(", ")}
                  </span>
                ) : null
              }
            />
            <InfoRow
              label="Origen"
              value={
                client.origen ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="size-3.5" />
                    {client.origen}
                  </span>
                ) : null
              }
            />
            <InfoRow
              label="Cliente desde"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <CalendarPlus className="size-3.5" />
                  {formatDate(client.created_at, "long")}
                </span>
              }
            />
            <div className="space-y-1.5 border-t pt-4">
              <div className="text-xs text-muted-foreground">Notas</div>
              <p className="text-sm whitespace-pre-wrap text-foreground/90">
                {client.notas || <span className="text-muted-foreground">Sin notas.</span>}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pestañas */}
        <Tabs defaultValue="proyectos" className="min-w-0">
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="proyectos">
              Proyectos <Count n={projects.length} />
            </TabsTrigger>
            <TabsTrigger value="cotizaciones">
              Cotizaciones <Count n={quotes.length} />
            </TabsTrigger>
            <TabsTrigger value="reuniones">
              Reuniones <Count n={meetings.length} />
            </TabsTrigger>
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
            <TabsTrigger value="documentos">
              Documentos <Count n={documents.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proyectos">
            {projects.length === 0 ? (
              <EmptyState
                compact
                icon={Briefcase}
                title="Sin proyectos"
                description='Usa "Nuevo proyecto" para registrar el primer proyecto de este cliente.'
              />
            ) : (
              <div className="divide-y overflow-hidden rounded-xl border bg-card">
                {projects.map((p) => {
                  const progress = projectProgress(p.tasks);
                  const delivery = deliveryInfo(p);
                  const info = PROYECTO_ESTADOS[p.estado];
                  return (
                    <Link
                      key={p.id}
                      href={`/proyectos/${p.id}`}
                      className="grid gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_160px_auto] sm:items-center sm:gap-6"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-sm font-medium">{p.nombre}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge tone={info.tone} dot className="py-0 text-[11px]">
                            {info.label}
                          </Badge>
                          <span className={delivery.tone === "danger" ? "text-destructive" : ""}>{delivery.label}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {progress.done}/{progress.total} tareas
                          </span>
                          <span className="tabular">{progress.pct}%</span>
                        </div>
                        <Progress value={progress.pct} />
                      </div>
                      <div className="text-sm font-semibold tabular sm:text-right">{formatMoney(p.valor_total, p.moneda)}</div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cotizaciones">
            {quotes.length === 0 ? (
              <EmptyState
                compact
                icon={FileText}
                title="Sin cotizaciones"
                description="Las propuestas enviadas a este cliente aparecerán aquí."
              />
            ) : (
              <div className="divide-y overflow-hidden rounded-xl border bg-card">
                {quotes.map((q) => {
                  const info = COTIZACION_ESTADOS[q.estado];
                  return (
                    <Link
                      key={q.id}
                      href={`/cotizaciones/${q.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm font-medium">{q.numero}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(q.created_at, "medium")} · {q.items.length}{" "}
                          {q.items.length === 1 ? "ítem" : "ítems"}
                        </div>
                      </div>
                      <Badge tone={info.tone} dot className="hidden sm:inline-flex">
                        {info.label}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular">{formatMoney(q.total, q.moneda)}</div>
                        {Number(q.fee_mensual) > 0 && (
                          <div className="text-xs text-muted-foreground tabular">+ {formatMoney(q.fee_mensual, q.moneda)}/mes</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reuniones">
            <MeetingList meetings={meetings} />
          </TabsContent>

          <TabsContent value="pagos" className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Cuentas por cobrar</h3>
              <ReceivableList receivables={receivables} showProject />
            </section>
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Pagos recibidos</h3>
              <TransactionList transactions={payments} categoryLabel={categoryLabel} showProject />
            </section>
          </TabsContent>

          <TabsContent value="documentos">
            <DocumentsPanel
              documents={documents}
              clientId={client.id}
              projectId={null}
              projects={projects.map((p) => ({ id: p.id, nombre: p.nombre }))}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return <span className="rounded-full bg-foreground/[0.07] px-1.5 text-[11px] tabular text-muted-foreground">{n}</span>;
}
