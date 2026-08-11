import { useSearchParams } from 'react-router-dom';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelineBoard } from '@/components/crm/PipelineBoard';
import { OpportunitiesListView } from '@/components/crm/OpportunitiesListView';
import { CompaniesListView } from '@/components/crm/CompaniesListView';
import { ContactsListView } from '@/components/crm/ContactsListView';
import { CustomersListView } from '@/components/crm/CustomersListView';
import { QuotesListView } from '@/components/crm/QuotesListView';
import { ContractsListView } from '@/components/crm/ContractsListView';
import { ForecastView } from '@/components/crm/ForecastView';
import { IntegrationsPanel } from '@/components/integrations/IntegrationsPanel';
import { useCrmSummary, useCrmOpportunities } from '@/lib/crm-hooks';
import { formatCurrency } from '@/lib/finance-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FileSpreadsheet, Users, Target, DollarSign, TrendingUp,
  AlertTriangle, CalendarClock, Handshake, ArrowRight,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Genel Bakis' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'opportunities', label: 'Firsatlar' },
  { id: 'companies', label: 'Sirketler' },
  { id: 'contacts', label: 'Kisiler' },
  { id: 'customers', label: 'Musteriler' },
  { id: 'quotes', label: 'Teklifler' },
  { id: 'contracts', label: 'Sozlesmeler' },
  { id: 'forecast', label: 'Forecast' },
] as const;

/* ---------- CRM Overview Dashboard ---------- */
function CrmOverviewTab() {
  const { data: summary, isLoading: sumLoading } = useCrmSummary();
  const { data: openOpps, isLoading: oppsLoading } = useCrmOpportunities({ status: 'open' });

  const isLoading = sumLoading || oppsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }

  const s = summary;
  // Upcoming closes: open opps sorted by expected_close_date, soonest first
  const now = new Date().toISOString().slice(0, 10);
  const upcomingCloses = (openOpps ?? [])
    .filter(o => o.expected_close_date && o.expected_close_date >= now)
    .sort((a, b) => (a.expected_close_date ?? '').localeCompare(b.expected_close_date ?? ''))
    .slice(0, 5);

  const recentDeals = (openOpps ?? [])
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Pipeline Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="h-4 w-4 text-blue-500" />}
          label="Acik Pipeline"
          value={formatCurrency(s?.openPipeline ?? 0, 'USD')}
          sub={`${s?.openOppCount ?? 0} firsat`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          label="Commit"
          value={formatCurrency(s?.commit ?? 0, 'USD')}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          label="Kazanilan (Toplam)"
          value={formatCurrency(s?.closedWon ?? 0, 'USD')}
        />
        <StatCard
          icon={<Handshake className="h-4 w-4 text-violet-500" />}
          label="MRR / ARR"
          value={formatCurrency(s?.totalMRR ?? 0, 'USD')}
          sub={`ARR: ${formatCurrency(s?.totalARR ?? 0, 'USD')}`}
        />
      </div>

      {/* Customer Relationship Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-4 w-4 text-blue-500" />}
          label="Sirketler"
          value={String(s?.totalCompanies ?? 0)}
        />
        <StatCard
          icon={<Users className="h-4 w-4 text-emerald-500" />}
          label="Musteriler"
          value={String(s?.totalCustomers ?? 0)}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          label="Risk Altinda"
          value={String(s?.atRiskCustomers ?? 0)}
          sub="at_risk + critical"
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4 text-orange-500" />}
          label="Yaklasan Yenileme"
          value={String(s?.renewalsSoon ?? 0)}
          sub="30 gun icinde"
        />
      </div>

      {/* Upcoming Closes */}
      {upcomingCloses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Yaklasan Kapatmalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingCloses.map(opp => (
                <div key={opp.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2 truncate">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{opp.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">{opp.expected_close_date}</span>
                    <span className="font-medium">
                      {formatCurrency(Number(opp.amount_base ?? opp.amount ?? 0), 'USD')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Deals */}
      {recentDeals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Son Guncellenen Firsatlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentDeals.map(opp => (
                <div key={opp.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                      opp.forecast_category === 'commit' ? 'bg-emerald-500'
                      : opp.forecast_category === 'best_case' ? 'bg-blue-500'
                      : 'bg-muted-foreground'
                    }`} />
                    <span className="truncate">{opp.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{opp.forecast_category}</span>
                  </div>
                  <span className="font-medium flex-shrink-0">
                    {formatCurrency(Number(opp.amount_base ?? opp.amount ?? 0), 'USD')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}{label}
        </div>
        <div className="text-xl font-semibold">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

/* ---------- Main Page ---------- */
export default function Crm() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';

  return (
    <DomainWorkspace
      domain="crm"
      title="CRM & Revenue"
      subtitle="Lead'den musteriye tum satis ve gelir dongusu."
    >
      <div className="mb-4 flex items-center justify-between">
        <IntegrationsPanel domain="crm" compact />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" disabled className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Ice Aktar
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Yakinda</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Tabs value={tab} onValueChange={v => setParams({ tab: v })}>
        <TabsList className="flex flex-wrap h-auto">
          {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview" className="mt-4"><CrmOverviewTab /></TabsContent>
        <TabsContent value="pipeline" className="mt-4"><PipelineBoard /></TabsContent>
        <TabsContent value="opportunities" className="mt-4"><OpportunitiesListView /></TabsContent>
        <TabsContent value="companies" className="mt-4"><CompaniesListView /></TabsContent>
        <TabsContent value="contacts" className="mt-4"><ContactsListView /></TabsContent>
        <TabsContent value="customers" className="mt-4"><CustomersListView /></TabsContent>
        <TabsContent value="quotes" className="mt-4"><QuotesListView /></TabsContent>
        <TabsContent value="contracts" className="mt-4"><ContractsListView /></TabsContent>
        <TabsContent value="forecast" className="mt-4"><ForecastView /></TabsContent>
      </Tabs>
    </DomainWorkspace>
  );
}
