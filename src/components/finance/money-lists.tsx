import { ArrowDownLeft, ArrowUpRight, Receipt, Wallet } from "lucide-react";

import type { Receivable, Transaction } from "@/types/database";
import { COBRO_ESTADOS } from "@/lib/constants";
import { receivableStatus } from "@/lib/finance";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";

export type ReceivableItem = Pick<
  Receivable,
  "id" | "concepto" | "monto" | "moneda" | "fecha_vencimiento" | "estado" | "pagado_en"
> & { project?: { id: string; nombre: string } | null; cliente?: string | null };

export type TransactionItem = Pick<
  Transaction,
  "id" | "tipo" | "monto" | "moneda" | "categoria" | "descripcion" | "fecha" | "metodo_pago"
> & { project?: { id: string; nombre: string } | null };

/** Cuentas por cobrar con su estado calculado (pendiente, vencido o pagado). */
export function ReceivableList({ receivables, showProject = false }: { receivables: ReceivableItem[]; showProject?: boolean }) {
  if (receivables.length === 0) {
    return (
      <EmptyState
        compact
        icon={Receipt}
        title="Sin cuentas por cobrar"
        description="Los cobros programados (anticipos, saldos, fees) aparecerán aquí."
      />
    );
  }

  const order = { vencido: 0, pendiente: 1, pagado: 2 } as const;
  const sorted = [...receivables].sort((a, b) => {
    const sa = order[receivableStatus(a)];
    const sb = order[receivableStatus(b)];
    if (sa !== sb) return sa - sb;
    return a.fecha_vencimiento.localeCompare(b.fecha_vencimiento);
  });

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {sorted.map((r) => {
        const status = receivableStatus(r);
        const info = COBRO_ESTADOS[status];
        return (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.concepto}</div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {showProject && (r.project || r.cliente) && <span className="truncate">{r.project?.nombre ?? r.cliente}</span>}
                <span>
                  {status === "pagado" && r.pagado_en
                    ? `Pagado el ${formatDate(r.pagado_en, "medium")}`
                    : `Vence el ${formatDate(r.fecha_vencimiento, "medium")}`}
                </span>
              </div>
            </div>
            <Badge tone={info.tone} dot className="hidden sm:inline-flex">
              {info.label}
            </Badge>
            <div
              className={cn(
                "text-right text-sm font-semibold tabular",
                status === "vencido" && "text-destructive",
                status === "pagado" && "text-muted-foreground",
              )}
            >
              {formatMoney(r.monto, r.moneda)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Movimientos (ingresos y gastos). `categoryLabel` traduce el slug a su nombre. */
export function TransactionList({
  transactions,
  categoryLabel,
  showProject = false,
}: {
  transactions: TransactionItem[];
  categoryLabel: (slug: string, tipo: TransactionItem["tipo"]) => string;
  showProject?: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        compact
        icon={Wallet}
        title="Sin movimientos"
        description="Los ingresos y gastos ligados aparecerán aquí."
      />
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {transactions.map((t) => {
        const income = t.tipo === "ingreso";
        return (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                income ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {income ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.descripcion || categoryLabel(t.categoria, t.tipo)}</div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{categoryLabel(t.categoria, t.tipo)}</span>
                {showProject && t.project && <span className="truncate">· {t.project.nombre}</span>}
                <span>· {formatDate(t.fecha, "medium")}</span>
              </div>
            </div>
            <div className={cn("text-right text-sm font-semibold tabular", income ? "text-success" : "text-foreground")}>
              {income ? "+" : "-"}
              {formatMoney(t.monto, t.moneda)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
