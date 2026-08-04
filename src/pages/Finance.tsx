import { useSearchParams } from 'react-router-dom';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { TransactionsList } from '@/components/finance/TransactionsList';
import { BudgetsList } from '@/components/finance/BudgetsList';
import { CashFlowView } from '@/components/finance/CashFlowView';
import { ProjectPLView } from '@/components/finance/ProjectPLView';
import { useModuleAccess } from '@/hooks/useWorkspacePermission';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IntegrationsPanel } from '@/components/integrations/IntegrationsPanel';
import { Lock } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Genel Bakış' },
  { id: 'transactions', label: 'İşlemler' },
  { id: 'budgets', label: 'Bütçeler' },
  { id: 'cashflow', label: 'Nakit Akışı' },
  { id: 'projects', label: 'Proje P&L' },
] as const;

export default function Finance() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const { allowed, isLoading } = useModuleAccess('finance', 'view');

  if (isLoading) {
    return (
      <DomainWorkspace
        domain="finance"
        title="Finance"
        subtitle="Nakit, burn, runway, bütçe ve proje karlılığı."
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
        subtitle="Nakit, burn, runway, bütçe ve proje karlılığı."
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Lock className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Finans modülüne erişimin yok</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Finansal veriler varsayılan olarak kilitlidir. Erişim gerekiyorsa
              workspace sahibinden Ayarlar → Permissions üzerinden finans
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
      subtitle="Nakit, burn, runway, bütçe ve proje karlılığı — hepsi Company Graph üzerinden bağlı."
    >
      <div className="mb-4"><IntegrationsPanel domain="finance" compact /></div>
      <FinanceOverview />
      <Tabs value={tab} onValueChange={v => setParams({ tab: v })}>
        <TabsList className="flex flex-wrap h-auto">
          {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview" className="mt-4"><CashFlowView /></TabsContent>
        <TabsContent value="transactions" className="mt-4"><TransactionsList /></TabsContent>
        <TabsContent value="budgets" className="mt-4"><BudgetsList /></TabsContent>
        <TabsContent value="cashflow" className="mt-4"><CashFlowView /></TabsContent>
        <TabsContent value="projects" className="mt-4"><ProjectPLView /></TabsContent>
      </Tabs>
    </DomainWorkspace>
  );
}

