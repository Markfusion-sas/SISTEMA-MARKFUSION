import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CalendarCheck,
  CircleDollarSign,
  Receipt,
  Repeat,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import type { Project } from "@/types/database";
import { getCategoryLabeler } from "@/lib/categories";
import { PROYECTO_TIPOS } from "@/lib/constants";
import { receivableStatus } from "@/lib/finance";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { DocumentsPanel, type DocumentRow } from "@/components/documents/documents-panel";
import { ReceivableList, TransactionList, type ReceivableItem, type TransactionItem } from "@/components/finance/money-lists";
import { MeetingList, type MeetingItem } from "@/components/meetings/meeting-list";
import { deliveryInfo, projectProgress } from "@/lib/projects";
import { ProjectHeaderActions } from "@/components/projects/project-header-actions";
import type { ClientOption } from "@/components/projects/project-form-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectTasks } from "@/components/tasks/project-tasks";
import type { TaskItem } from "@/components/tasks/task-checklist";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Proyecto" };
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("nombre").eq("id", id).maybeSingle();
  return { title: data?.nombre ?? "Proyecto" };
}

type ProjectWithClient = Project & { client: { id: string; nombre: string; empresa: string | null } | null };

export default async function ProyectoDetallePage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: projectData } = await supabase
    .from("projects")
    .select("*, client:clients(id, nombre, empresa)")
    .eq("id", id)
    .maybeSingle();
  if (!projectData) notFound();
  const project = projectData as ProjectWithClient;

  const [tasksRes, meetingsRes, receivablesRes, transactionsRes, documentsRes, clientsRes, categoryLabel] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, titulo, estado, prioridad, fecha_limite, responsable_id, descripcion")
      .eq("project_id", id)
      .order("orden"),
    supabase
      .from("meetings")
      .select("id, titulo, tipo, estado, fecha_inicio, fecha_fin, link")
      .eq("project_id", id)
      .order("fecha_inicio", { ascending: false }),
    supabase
      .from("receivables")
      .select("id, concepto, monto, moneda, fecha_vencimiento, estado, pagado_en")
      .eq("project_id", id)
      .order("fecha_vencimiento"),
    supabase
      .from("transactions")
      .select("id, tipo, monto, moneda, categoria, descripcion, fecha, metodo_pago")
      .eq("project_id", id)
      .order("fecha", { ascending: false }),
    supabase.from("documents").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("clients").select("id, nombre, empresa").order("empresa"),
    getCategoryLabeler(supabase),
  ]);

  const tasks = (tasksRes.data ?? []) as TaskItem[];
  const meetings = (meetingsRes.data ?? []) as MeetingItem[];
  const receivables = (receivablesRes.data ?? []) as ReceivableItem[];
  const transactions = (transactionsRes.data ?? []) as TransactionItem[];
  const documents = (documentsRes.data ?? []) as DocumentRow[];
  const clients = (clientsRes.data ?? []) as ClientOption[];

  // Finanzas en la moneda del proyecto (los montos en otra moneda se listan pero no se suman).
  const m = project.moneda;
  const sameCurrency = <T extends { moneda: string }>(rows: T[]) => rows.filter((r) => r.moneda === m);
  const cobrado = sameCurrency(transactions.filter((t) => t.tipo === "ingreso")).reduce((s, t) => s + Number(t.monto), 0);
  const gastos = sameCurrency(transactions.filter((t) => t.tipo === "gasto")).reduce((s, t) => s + Number(t.monto), 0);
  const pendientes = sameCurrency(receivables.filter((r) => r.estado === "pendiente"));
  const porCobrar = pendientes.reduce((s, r) => s + Number(r.monto), 0);
  const vencido = pendientes.filter((r) => receivableStatus(r) === "vencido").reduce((s, r) => s + Number(r.monto), 0);
  const margen = cobrado - gastos;
  const margenPct = cobrado > 0 ? margen / cobrado : 0;
  const valorTotal = Number(project.valor_total);
  const cobradoPct = valorTotal > 0 ? Math.min(100, (cobrado / valorTotal) * 100) : 0;

  const progress = projectProgress(tasks);
  const delivery = deliveryInfo(project);
  const tipo = PROYECTO_TIPOS[project.tipo];
  const clientLabel = project.client ? project.client.empresa || project.client.nombre : "Sin cliente";

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <Link
          href="/proyectos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Proyectos
        </Link>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tipo.tone}>{tipo.label}</Badge>
              {project.client && (
                <Link href={`/clientes/${project.client.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                  {clientLabel}
                </Link>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[28px]">{project.nombre}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck className="size-4" />
                Inicio {formatDate(project.fecha_inicio, "medium")}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5",
                  delivery.tone === "danger" && "font-medium text-destructive",
                  delivery.tone === "warning" && "font-medium text-warning",
                )}
              >
                <CalendarClock className="size-4" />
                {delivery.label}
              </span>
              {Number(project.fee_mensual) > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Repeat className="size-4" />
                  {formatMoney(project.fee_mensual, m)}/mes
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProjectHeaderActions key={project.updated_at} project={project} clients={clients} />
          </div>
        </div>
      </div>

      {/* Finanzas del proyecto */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cobrado"
          icon={CircleDollarSign}
          tone="success"
          value={formatMoney(cobrado, m)}
          hint={valorTotal > 0 ? `${Math.round(cobradoPct)}% de ${formatMoney(valorTotal, m)}` : "Sin valor total definido"}
        />
        <StatCard
          label="Por cobrar"
          icon={Receipt}
          tone={vencido > 0 ? "danger" : porCobrar > 0 ? "warning" : "default"}
          value={formatMoney(porCobrar, m)}
          hint={vencido > 0 ? `${formatMoney(vencido, m)} vencido` : `${pendientes.length} ${pendientes.length === 1 ? "cobro" : "cobros"} pendientes`}
        />
        <StatCard
          label="Gastos del proyecto"
          icon={TrendingDown}
          value={formatMoney(gastos, m)}
          hint="Freelancers, pauta, herramientas…"
        />
        <StatCard
          label="Margen"
          icon={TrendingUp}
          tone={margen < 0 ? "danger" : "brand"}
          value={formatMoney(margen, m)}
          hint={cobrado > 0 ? `${formatPercent(margenPct)} sobre lo cobrado` : "Cobrado menos gastos"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tabs defaultValue="tareas" className="min-w-0">
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="tareas">
              Tareas <Count n={tasks.length} />
            </TabsTrigger>
            <TabsTrigger value="reuniones">
              Reuniones <Count n={meetings.length} />
            </TabsTrigger>
            <TabsTrigger value="finanzas">Finanzas</TabsTrigger>
            <TabsTrigger value="documentos">
              Documentos <Count n={documents.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tareas">
            <ProjectTasks tasks={tasks} project={{ id: project.id, nombre: project.nombre, cliente: clientLabel }} />
          </TabsContent>

          <TabsContent value="reuniones">
            <MeetingList meetings={meetings} />
          </TabsContent>

          <TabsContent value="finanzas" className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Cuentas por cobrar</h3>
              <ReceivableList receivables={receivables} />
            </section>
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Movimientos del proyecto</h3>
              <TransactionList transactions={transactions} categoryLabel={categoryLabel} />
            </section>
          </TabsContent>

          <TabsContent value="documentos">
            <DocumentsPanel documents={documents} clientId={project.client_id} projectId={project.id} />
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Avance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-semibold tracking-tight tabular">{progress.pct}%</span>
                <span className="text-sm text-muted-foreground">
                  {progress.done} de {progress.total} tareas
                </span>
              </div>
              <Progress value={progress.pct} className="h-2" />
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Cobro del proyecto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Row label="Valor total" value={formatMoney(valorTotal, m)} strong />
              <SegmentedBar cobrado={cobrado} programado={porCobrar} total={valorTotal} moneda={m} />
              <div className="space-y-2 border-t pt-3">
                <Row label="Gastos del proyecto" value={formatMoney(gastos, m)} />
                <Row
                  label="Margen sobre lo cobrado"
                  value={cobrado > 0 ? `${formatMoney(margen, m)} · ${formatPercent(margenPct)}` : "—"}
                  strong
                  className={margen < 0 ? "text-destructive" : ""}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-foreground/90">
                {project.descripcion || <span className="text-muted-foreground">Sin descripción.</span>}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular", strong && "font-semibold", className)}>{value}</span>
    </div>
  );
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return <span className="rounded-full bg-foreground/[0.07] px-1.5 text-[11px] tabular text-muted-foreground">{n}</span>;
}
