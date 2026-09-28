"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Hourglass,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  SearchX,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type { CotizacionEstado } from "@/types/database";
import { COTIZACION_ESTADOS } from "@/lib/constants";
import { formatTotals, sumByCurrency } from "@/lib/finance";
import { formatDate, formatPercent } from "@/lib/format";
import { quoteStatusView, quoteValidUntil } from "@/lib/quotes";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteQuoteAction,
  duplicateQuoteAction,
  setQuoteStatusAction,
} from "@/app/(app)/cotizaciones/actions";
import { ConvertQuoteDialog } from "@/components/quotes/convert-dialog";
import { docFromQuote } from "@/components/quotes/doc-data";
import { downloadQuotePdf } from "@/components/quotes/pdf-download";
import type { BrandDoc, QuoteRow } from "@/components/quotes/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput, normalize } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Filter = CotizacionEstado | "todas";

const VIEW_LABEL = { ...COTIZACION_ESTADOS, vencida: { label: "Vencida", tone: "warning" as const } };

export function QuotesView({ quotes, brand }: { quotes: QuoteRow[]; brand: BrandDoc }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("todas");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<QuoteRow | null>(null);
  const [converting, setConverting] = useState<QuoteRow | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return quotes.filter((quote) => {
      if (filter !== "todas" && quote.estado !== filter) return false;
      if (!q) return true;
      return [
        quote.numero,
        quote.client?.nombre,
        quote.client?.empresa,
        ...quote.items.map((i) => i.descripcion),
      ].some((f) => normalize(f).includes(q));
    });
  }, [quotes, filter, search]);

  const count = (estado: CotizacionEstado) => quotes.filter((q) => q.estado === estado).length;
  const decided = count("aprobada") + count("rechazada");
  const approvalRate = decided ? count("aprobada") / decided : null;
  const pipeline = quotes.filter((q) => q.estado === "enviada").map((q) => ({ monto: q.total, moneda: q.moneda }));
  const approved = quotes.filter((q) => q.estado === "aprobada").map((q) => ({ monto: q.total, moneda: q.moneda }));
  const pendingConversion = quotes.filter((q) => q.estado === "aprobada" && !q.project_id).length;

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (quote: QuoteRow, estado: CotizacionEstado) =>
    withBusy(quote.id, async () => {
      const result = await setQuoteStatusAction(quote.id, estado);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`${quote.numero} marcada como ${COTIZACION_ESTADOS[estado].label.toLowerCase()}`);
    });

  const duplicate = (quote: QuoteRow) =>
    withBusy(quote.id, async () => {
      const result = await duplicateQuoteAction(quote.id);
      if (!result.ok || !result.data) return void toast.error(result.ok ? "No se pudo duplicar" : result.error);
      toast.success(`Copia creada: ${result.data.numero}`);
      router.push(`/cotizaciones/${result.data.id}`);
    });

  const download = (quote: QuoteRow) =>
    withBusy(quote.id, async () => {
      try {
        await downloadQuotePdf(docFromQuote(quote, quote.client), brand);
        toast.success("PDF descargado");
      } catch (error) {
        console.error(error);
        toast.error("No se pudo generar el PDF");
      }
    });

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteQuoteAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success(`Cotización ${deleting.numero} eliminada`);
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotizaciones"
        description="Propuestas económicas con la marca MarkFusion, listas en PDF."
        actions={
          <Button asChild>
            <Link href="/cotizaciones/nueva">
              <Plus />
              Nueva cotización
            </Link>
          </Button>
        }
      />

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aún no hay cotizaciones"
          description="Arma la primera propuesta con sus ítems y descárgala en PDF con la marca de la agencia."
          action={
            <Button asChild>
              <Link href="/cotizaciones/nueva">
                <Plus />
                Crear cotización
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="En espera de respuesta"
              icon={Hourglass}
              tone="warning"
              value={formatTotals(sumByCurrency(pipeline))}
              hint={`${count("enviada")} enviadas`}
            />
            <StatCard
              label="Aprobado"
              icon={CheckCircle2}
              tone="success"
              value={formatTotals(sumByCurrency(approved))}
              hint={pendingConversion ? `${pendingConversion} sin convertir en proyecto` : `${count("aprobada")} aprobadas`}
            />
            <StatCard
              label="Tasa de aprobación"
              icon={Send}
              tone="brand"
              value={approvalRate === null ? "—" : formatPercent(approvalRate)}
              hint={decided ? `${count("aprobada")} de ${decided} decididas` : "Aún sin respuestas"}
            />
            <StatCard label="Borradores" icon={Pencil} value={count("borrador")} hint="Por terminar y enviar" />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterChips
              options={[
                { value: "todas" as Filter, label: "Todas", count: quotes.length },
                ...(
                  [
                    ["borrador", "Borradores"],
                    ["enviada", "Enviadas"],
                    ["aprobada", "Aprobadas"],
                    ["rechazada", "Rechazadas"],
                  ] as [CotizacionEstado, string][]
                ).map(([e, label]) => ({ value: e as Filter, label, count: count(e) })),
              ]}
              value={filter}
              onChange={setFilter}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar número, cliente o ítem…" className="w-full lg:w-72" />
          </div>

          {visible.length === 0 ? (
            <EmptyState compact icon={SearchX} title="Sin resultados" description="Cambia el filtro o la búsqueda." />
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
              {visible.map((quote) => {
                const view = quoteStatusView(quote);
                const info = VIEW_LABEL[view];
                const clientName = quote.client ? quote.client.empresa || quote.client.nombre : "Sin cliente";
                const validUntil = quoteValidUntil(quote.created_at, quote.vigencia_dias);
                const canConvert = quote.estado === "aprobada" && !quote.project_id;
                return (
                  <div
                    key={quote.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/cotizaciones/${quote.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && router.push(`/cotizaciones/${quote.id}`)}
                    className="flex cursor-pointer flex-col gap-3 px-4 py-3.5 transition-colors outline-none hover:bg-muted/30 focus-visible:bg-muted/40 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{quote.numero}</span>
                          <Badge tone={info.tone} dot className="py-0 text-[11px]">
                            {info.label}
                          </Badge>
                          {quote.project && (
                            <Badge tone="brand" className="py-0 text-[11px]">
                              <Briefcase />
                              Proyecto creado
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="truncate font-medium text-foreground/80">{clientName}</span>
                          <span>· {formatDate(quote.created_at, "medium")}</span>
                          {quote.estado === "enviada" && (
                            <span className={cn(view === "vencida" && "text-warning")}>
                              · {view === "vencida" ? "Venció" : "Válida hasta"} el {formatDate(validUntil, "month")}
                            </span>
                          )}
                          <span className="hidden md:inline">
                            · {quote.items.length} {quote.items.length === 1 ? "ítem" : "ítems"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end" onClick={(e) => e.stopPropagation()}>
                      <div className="text-right">
                        <div className="text-base font-semibold tabular">{formatMoney(quote.total, quote.moneda)}</div>
                        {Number(quote.fee_mensual) > 0 && (
                          <div className="text-xs text-muted-foreground tabular">
                            + {formatMoney(quote.fee_mensual, quote.moneda)}/mes
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {canConvert && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setConverting(quote);
                              setConvertOpen(true);
                            }}
                          >
                            Convertir en proyecto
                            <ArrowRight />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => download(quote)}
                          disabled={busy === quote.id}
                          aria-label={`Descargar PDF de ${quote.numero}`}
                        >
                          {busy === quote.id ? <Loader2 className="animate-spin" /> : <Download />}
                        </Button>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${quote.numero}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem asChild>
                              <Link href={`/cotizaciones/${quote.id}`}>
                                <Pencil />
                                Abrir y editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => download(quote)}>
                              <Download />
                              Descargar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => duplicate(quote)}>
                              <Copy />
                              Duplicar
                            </DropdownMenuItem>
                            {quote.project && (
                              <DropdownMenuItem asChild>
                                <Link href={`/proyectos/${quote.project.id}`}>
                                  <Briefcase />
                                  Ver proyecto
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
                            {quote.estado !== "enviada" && (
                              <DropdownMenuItem onSelect={() => setStatus(quote, "enviada")}>
                                <Send />
                                Marcar como enviada
                              </DropdownMenuItem>
                            )}
                            {quote.estado !== "aprobada" && (
                              <DropdownMenuItem onSelect={() => setStatus(quote, "aprobada")}>
                                <CheckCircle2 />
                                Marcar como aprobada
                              </DropdownMenuItem>
                            )}
                            {quote.estado !== "rechazada" && (
                              <DropdownMenuItem onSelect={() => setStatus(quote, "rechazada")}>
                                <XCircle />
                                Marcar como rechazada
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(quote)}>
                              <Trash2 />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <ConvertQuoteDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        quote={converting}
        clientName={converting?.client ? converting.client.empresa || converting.client.nombre : "cliente"}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`¿Eliminar la cotización ${deleting?.numero}?`}
        description={
          deleting?.project_id ? "El proyecto que se creó a partir de ella se conserva." : "Esta acción no se puede deshacer."
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
