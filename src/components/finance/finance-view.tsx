"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, BarChart3, Loader2, Receipt, Repeat } from "lucide-react";

import type { Moneda, MovimientoTipo } from "@/types/database";
import { receivableStatus } from "@/lib/finance";
import { RecurringTab } from "@/components/finance/recurring-tab";
import { ReceivablesTab } from "@/components/finance/receivables-tab";
import { ReportsTab, type YearTransaction } from "@/components/finance/reports-tab";
import { TransactionsTab } from "@/components/finance/transactions-tab";
import type {
  CategoryOption,
  FinanceProjectOption,
  ReceivableRow,
  RecurringRow,
  TransactionRow,
} from "@/components/finance/types";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type FinanceTab = "movimientos" | "por-cobrar" | "recurrentes" | "reportes";

export function FinanceView({
  tab,
  month,
  currentMonth,
  year,
  currentYear,
  transactions,
  previous,
  receivables,
  recurring,
  paidRecurring,
  yearTransactions,
  categories,
  projects,
}: {
  tab: FinanceTab;
  month: string;
  currentMonth: string;
  year: number;
  currentYear: number;
  transactions: TransactionRow[];
  previous: { tipo: MovimientoTipo; monto: number; moneda: Moneda }[];
  receivables: ReceivableRow[];
  recurring: RecurringRow[];
  paidRecurring: string[];
  yearTransactions: YearTransaction[];
  categories: CategoryOption[];
  projects: FinanceProjectOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<FinanceTab>(tab);

  const buildUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  /** Mes y año cambian los datos: se pide de nuevo la página al servidor. */
  const setParams = (updates: Record<string, string | null>) =>
    startTransition(() => router.replace(buildUrl(updates), { scroll: false }));

  /** La pestaña solo cambia la URL (sin recargar datos), para que el cambio sea instantáneo. */
  const changeTab = (value: string) => {
    setActiveTab(value as FinanceTab);
    window.history.replaceState(null, "", buildUrl({ tab: value === "movimientos" ? null : value }));
  };

  const overdueCount = receivables.filter((r) => receivableStatus(r) === "vencido").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            Finanzas
            {pending && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
          </span>
        }
        description="Ingresos, gastos, cuentas por cobrar, costos fijos y reportes."
      />

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="movimientos">
            <ArrowLeftRight />
            <span className="hidden sm:inline">Movimientos</span>
            <span className="sm:hidden">Mov.</span>
          </TabsTrigger>
          <TabsTrigger value="por-cobrar">
            <Receipt />
            Por cobrar
            {overdueCount > 0 && (
              <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white tabular">{overdueCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recurrentes">
            <Repeat />
            <span className="hidden sm:inline">Recurrentes</span>
            <span className="sm:hidden">Fijos</span>
          </TabsTrigger>
          <TabsTrigger value="reportes">
            <BarChart3 />
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos">
          <TransactionsTab
            transactions={transactions}
            previous={previous}
            month={month}
            currentMonth={currentMonth}
            onMonthChange={(m) => setParams({ mes: m === currentMonth ? null : m })}
            categories={categories}
            projects={projects}
          />
        </TabsContent>
        <TabsContent value="por-cobrar">
          <ReceivablesTab receivables={receivables} categories={categories} projects={projects} />
        </TabsContent>
        <TabsContent value="recurrentes">
          <RecurringTab recurring={recurring} paidThisMonth={paidRecurring} categories={categories} />
        </TabsContent>
        <TabsContent value="reportes">
          <ReportsTab
            transactions={yearTransactions}
            year={year}
            currentYear={currentYear}
            onYearChange={(y) => setParams({ anio: y === currentYear ? null : String(y) })}
            categories={categories}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
