import { useSearchParams } from 'react-router-dom';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { TransactionsList } from '@/components/finance/TransactionsList';
import { BudgetsList } from '@/components/finance/BudgetsList';
import { CashFlowView } from '@/components/finance/CashFlowView';
import { ProjectPLView } from '@/components/finance/ProjectPLView';
import { useModuleAccess } from '@/hooks/useWorkspacePermission';
import { useFinSummary, useBudgetVariance, useProjectPL, useFinTransactions } from '@/lib/finance-hooks';
import { formatCurrency } from '@/lib/finance-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IntegrationsPanel } from '@/components/integrations/IntegrationsPanel';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Lock, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3,
  FileSpreadsheet, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Genel Bakis' },
  { id: 'transactions', label: 'Islemler' },
  { id: 'budgets', label: 'Butceler' },
  { id: 'cashflow', label: 'Nakit Akisi' },
  { id: 'projects', label: 'Proje P&L' },
] as const;

/* ---------- Overview Tab Content ---------- */
function OverviewTab() {
  const { data: summary, isLoading: sumLoading } = useFinSummary();
  const { data: budgetVars, isLoading: budLoading } = useBudgetVariance();
  const { data: projectPLs, isLoading: projLoading } = useProjectPL();
  const { data: recentTxns, isLoading: txnLoading } = useFinTransactions({ limit: 5 });

  const isLoading = sumLoading || budLoading || projLoading || txnLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const income = summary?.income30d ?? 0;
  const expense = summary?.expense30d ?? 0;
  const pnl = income - expense;
  const activeBudgets = budgetVars?.filter(b => b.utilizationPct > 0) ?? [];
  const topProjects = (projectPLs ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Revenue / Expense / P&L Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          label="30 Gunluk Gelir"
          value={formatCurrency(income, 'USD')}
          tone="positive"
        />
        <SummaryCard
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          label="30 Gunluk Gider"
          value={formatCurrency(expense, 'USD')}
          tone="negative"
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Kar / Zarar (30g)"
          value={formatCurrency(Math.abs(pnl), 'USD')}
          prefix={pnl >= 0 ? '+' : '-'}
          tone={pnl >= 0 ? 'positive' : 'negative'}
        />
        <SummaryCard
          icon={<PieChart className="h-4 w-4 text-blue-500" />}
          label="Nakit Bakiye"
          value={formatCurrency(summary?.cashBase ?? 0, 'USD')}
        />
      </div>

      {/* Budget Utilization */}
      {activeBudgets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Butce Kullanimi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeBudgets.slice(0, 5).map(bv => (
                <div key={bv.budget.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{bv.budget.name}</span>
                    <span className={`text-xs font-medium ${bv.alerted ? 'text-destructive' : 'text-muted-foreground'}`}>
                      %{bv.utilizationPct.toFixed(0)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(bv.utilizationPct, 100)}
                    className={`h-2 ${bv.alerted ? '[&>div]:bg-destructive' : ''}`}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Harcanan: {formatCurrency(bv.actual, 'USD')}</span>
                    <span>Butce: {formatCurrency(Number(bv.budget.amount_base ?? bv.budget.amount), 'USD')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proje Bazli (By Project) */}
      {topProjects.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Proje Bazli Gelir / Gider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proje</TableHead>
                    <TableHead className="text-right">Gelir</TableHead>
                    <TableHead className="text-right">Gider</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Butce Kull.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProjects.map(p => (
                    <TableRow key={p.projectId}>
                      <TableCell className="font-medium">{p.projectName}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCurrency(p.income, 'USD')}</TableCell>
                      <TableCell className="text-right text-red-500">{formatCurrency(p.expense, 'USD')}</TableCell>
                      <TableCell className={`text-right font-medium ${p.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(Math.abs(p.net), 'USD')}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {p.budgetUtilizationPct != null ? `%${p.budgetUtilizationPct.toFixed(0)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Son Islemler */}
      {(recentTxns ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Son Islemler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(recentTxns ?? []).map(txn => (
                <div key={txn.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {txn.type === 'income' ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    ) : txn.type === 'expense' ? (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="truncate max-w-[200px]">{txn.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{txn.txn_date}</span>
                    <span className={`font-medium ${txn.type === 'income' ? 'text-emerald-600' : txn.type === 'expense' ? 'text-red-500' : ''}`}>
                      {formatCurrency(Number(txn.amount_base ?? txn.amount), 'USD')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, prefix, tone }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  prefix?: string;
  tone?: 'positive' | 'negative';
}) {
  const color = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-red-500' : '';
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}{label}
        </div>
        <div className={`text-xl font-semibold ${color}`}>
          {prefix}{value}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Main Page ---------- */
export default function Finance() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const { allowed, isLoading } = useModuleAccess('finance', 'view');

  if (isLoading) {
    return (
      <DomainWorkspace
        domain="finance"
        title="Finance"
        subtitle="Nakit, burn, runway, butce ve proje karliligi."
      >
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </DomainWorkspace>
    );
  }

  if (!allowed) {
    return (
      <DomainWorkspace
        domain="finance"
        title="Finance"
        subtitle="Nakit, burn, runway, butce ve proje karliligi."
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Lock className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Finans modulune erisimin yok</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Finansal veriler varsayilan olarak kilitlidir. Erisim gerekiyorsa
              workspace sahibinden Ayarlar &rarr; Permissions uzerinden finans
              yetkisi vermesini iste.
            </p>
          </CardContent>
        </Card>
      </DomainWorkspace>
    );
  }

  return (
    <DomainWorkspace
      domain="finance"
      title="Finance"
      subtitle="Nakit, burn, runway, butce ve proje karliligi -- hepsi Company Graph uzerinden bagli."
    >
      <div className="mb-4 flex items-center justify-between">
        <IntegrationsPanel domain="finance" compact />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" disabled className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel Ice Aktar
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Yakinda</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <FinanceOverview />
      <Tabs value={tab} onValueChange={v => setParams({ tab: v })}>
        <TabsList className="flex flex-wrap h-auto">
          {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="transactions" className="mt-4"><TransactionsList /></TabsContent>
        <TabsContent value="budgets" className="mt-4"><BudgetsList /></TabsContent>
        <TabsContent value="cashflow" className="mt-4"><CashFlowView /></TabsContent>
        <TabsContent value="projects" className="mt-4"><ProjectPLView /></TabsContent>
      </Tabs>
    </DomainWorkspace>
  );
}
