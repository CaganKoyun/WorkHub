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

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'opportunities', label: 'Fırsatlar' },
  { id: 'companies', label: 'Şirketler' },
  { id: 'contacts', label: 'Kişiler' },
  { id: 'customers', label: 'Müşteriler' },
  { id: 'quotes', label: 'Teklifler' },
  { id: 'contracts', label: 'Sözleşmeler' },
  { id: 'forecast', label: 'Forecast' },
] as const;

export default function Crm() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'pipeline';

  return (
    <DomainWorkspace
      domain="crm"
      title="CRM & Revenue"
      subtitle="Lead'den müşteriye tüm satış ve gelir döngüsü."
    >
      <div className="mb-4"><IntegrationsPanel domain="crm" compact /></div>
      <Tabs value={tab} onValueChange={v => setParams({ tab: v })}>
        <TabsList className="flex flex-wrap h-auto">
          {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
        </TabsList>
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
