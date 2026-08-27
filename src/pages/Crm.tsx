import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PipelineBoard } from '@/components/crm/PipelineBoard';
import { OpportunitiesListView } from '@/components/crm/OpportunitiesListView';
import { CompaniesListView } from '@/components/crm/CompaniesListView';
import { ContactsListView } from '@/components/crm/ContactsListView';
import { CustomersListView } from '@/components/crm/CustomersListView';
import { QuotesListView } from '@/components/crm/QuotesListView';
import { ContractsListView } from '@/components/crm/ContractsListView';
import { ForecastView } from '@/components/crm/ForecastView';
import { IntegrationsPanel } from '@/components/integrations/IntegrationsPanel';
import {
  useCrmSummary,
  useCrmCustomers,
  useCrmContacts,
  useCrmForecast,
  useCreateCrmCompany,
  useCreateCrmContact,
} from '@/lib/crm-hooks';
import { parseCsvFile } from '@/lib/csv-utils';
import {
  Building2,
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'opportunities', label: 'Fırsatlar' },
  { id: 'companies', label: 'Şirketler' },
  { id: 'contacts', label: 'Kişiler' },
  { id: 'customers', label: 'Müşteriler' },
  { id: 'quotes', label: 'Teklifler' },
  { id: 'contracts', label: 'Sözleşmeler' },
  { id: 'forecast', label: 'Tahmin' },
  { id: 'revenue', label: 'Gelir Analizi' },
  { id: 'import', label: 'İçe Aktar' },
] as const;

/* ------------------------------------------------------------------ */
/*  Summary Stats Bar                                                  */
/* ------------------------------------------------------------------ */
function SummaryStatsBar() {
  const { data, isLoading } = useCrmSummary();

  const fmt = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  const stats = [
    { icon: Building2, label: 'Şirketler', value: data?.totalCompanies ?? 0, isCurrency: false },
    { icon: Users, label: 'Kişiler', value: data?.totalCustomers ?? 0, isCurrency: false },
    { icon: Target, label: 'Açık Fırsatlar', value: data?.openOppCount ?? 0, isCurrency: false },
    { icon: DollarSign, label: 'Pipeline Değeri', value: data?.openPipeline ?? 0, isCurrency: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-3">
          <div className="flex items-center gap-2">
            <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{s.label}</span>
          </div>
          <div className="mt-1 text-lg font-semibold">
            {isLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : s.isCurrency ? (
              fmt(s.value)
            ) : (
              s.value
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Revenue Analytics (Gelir Analizi)                                   */
/* ------------------------------------------------------------------ */
function RevenueAnalytics() {
  const { data: customers, isLoading: custLoading } = useCrmCustomers();
  const { data: forecast, isLoading: forecastLoading } = useCrmForecast('month');

  const isLoading = custLoading || forecastLoading;

  const customerMetrics = useMemo(() => {
    if (!customers) return { totalMRR: 0, totalARR: 0, count: 0 };
    return {
      totalMRR: customers.reduce((s, c) => s + Number(c.mrr ?? 0), 0),
      totalARR: customers.reduce((s, c) => s + Number(c.arr ?? 0), 0),
      count: customers.length,
    };
  }, [customers]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  // Compute max closed_won for bar scaling
  const maxRevenue = useMemo(() => {
    if (!forecast || forecast.length === 0) return 1;
    return Math.max(...forecast.map((b) => b.closed_won), 1);
  }, [forecast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MRR / ARR summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Toplam MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(customerMetrics.totalMRR)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Toplam ARR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(customerMetrics.totalARR)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Müşteri Sayısı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{customerMetrics.count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue trend bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Aylık Gelir Trendi (Kapanan Fırsatlar)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!forecast || forecast.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Henüz veri bulunmuyor.
            </p>
          ) : (
            <div className="space-y-2">
              {forecast.slice(-12).map((bucket) => (
                <div key={bucket.key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0 text-right">
                    {bucket.label}
                  </span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary rounded transition-all"
                      style={{
                        width: `${Math.max((bucket.closed_won / maxRevenue) * 100, 0)}%`,
                        minWidth: bucket.closed_won > 0 ? '4px' : '0px',
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium w-28 shrink-0 text-right">
                    {fmt(bucket.closed_won)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-customer MRR table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Müşteri Bazında MRR/ARR</CardTitle>
        </CardHeader>
        <CardContent>
          {!customers || customers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Henüz müşteri bulunmuyor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Müşteri ID</TableHead>
                    <TableHead>Saglik</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="text-right">ARR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.slice(0, 20).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.health === 'healthy'
                              ? 'default'
                              : c.health === 'at_risk' || c.health === 'critical'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {({healthy:"Sağlıklı",at_risk:"Riskli",critical:"Kritik",churned:"Kayıp"} as Record<string,string>)[c.health] ?? c.health}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmt(Number(c.mrr ?? 0))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(c.arr ?? 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSV Import (Ice Aktar)                                              */
/* ------------------------------------------------------------------ */
type ImportTarget = 'companies' | 'contacts';

const COMPANY_FIELDS = ['name', 'industry', 'website', 'phone', 'country', 'city'] as const;
const CONTACT_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'title'] as const;

function CsvImport() {
  const [target, setTarget] = useState<ImportTarget>('companies');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createCompany = useCreateCrmCompany();
  const createContact = useCreateCrmContact();

  const targetFields = target === 'companies' ? COMPANY_FIELDS : CONTACT_FIELDS;

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setResult(null);
      setError(null);
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const rows = await parseCsvFile(file);
        if (rows.length === 0) {
          setError('Dosya boş veya geçersiz.');
          return;
        }
        setParsedRows(rows);
        const headers = Object.keys(rows[0]);
        setCsvHeaders(headers);
        // Auto-map matching column names
        const autoMap: Record<string, string> = {};
        for (const field of targetFields) {
          const match = headers.find(
            (h) => h.toLowerCase().replace(/[^a-z]/g, '') === field.replace(/_/g, ''),
          );
          if (match) autoMap[field] = match;
        }
        setColumnMap(autoMap);
      } catch {
        setError('Dosya okunamadı.');
      }
    },
    [targetFields],
  );

  const previewRows = parsedRows.slice(0, 3);

  const handleImport = useCallback(async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setResult(null);
    setError(null);
    let ok = 0;
    let fail = 0;

    for (const row of parsedRows) {
      const mapped: Record<string, string> = {};
      for (const [field, csvCol] of Object.entries(columnMap)) {
        if (csvCol && row[csvCol] !== undefined) {
          mapped[field] = row[csvCol];
        }
      }

      try {
        if (target === 'companies') {
          if (!mapped.name) { fail++; continue; }
          await createCompany.mutateAsync({ name: mapped.name, industry: mapped.industry ?? null, website: mapped.website ?? null, phone: mapped.phone ?? null, country: mapped.country ?? null, city: mapped.city ?? null });
        } else {
          await createContact.mutateAsync({ first_name: mapped.first_name ?? null, last_name: mapped.last_name ?? null, email: mapped.email ?? null, phone: mapped.phone ?? null, title: mapped.title ?? null });
        }
        ok++;
      } catch {
        fail++;
      }
    }

    setImporting(false);
    setResult({ ok, fail });
    setParsedRows([]);
    setCsvHeaders([]);
    setColumnMap({});
  }, [parsedRows, columnMap, target, createCompany, createContact]);

  return (
    <div className="space-y-6">
      {/* Target selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            CSV / Excel İçeri Aktar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1.5">
              <Label>Hedef</Label>
              <Select
                value={target}
                onValueChange={(v) => {
                  setTarget(v as ImportTarget);
                  setParsedRows([]);
                  setCsvHeaders([]);
                  setColumnMap({});
                  setResult(null);
                  setError(null);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="companies">Şirketler</SelectItem>
                  <SelectItem value="contacts">Kişiler</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>CSV Dosyası</Label>
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={handleFile}
                className="cursor-pointer"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>
                {result.ok} kayıt başarıyla eklendi
                {result.fail > 0 && `, ${result.fail} hata`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column mapping */}
      {csvHeaders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sütun Eşleştirme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {targetFields.map((field) => (
              <div key={field} className="flex items-center gap-3">
                <span className="text-sm w-32 shrink-0 font-medium">{field}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select
                  value={columnMap[field] ?? '__none__'}
                  onValueChange={(v) =>
                    setColumnMap((prev) => ({
                      ...prev,
                      [field]: v === '__none__' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Seç..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Seçilmedi --</SelectItem>
                    {csvHeaders.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Preview first 3 rows */}
      {previewRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" />
              Ön İzleme (ilk 3 satır)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {csvHeaders.map((h) => (
                        <TableCell key={h} className="text-xs">
                          {row[h] ?? ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Toplam {parsedRows.length} satır
              </span>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {importing ? 'Aktarılıyor...' : `${parsedRows.length} Kayıt Aktar`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main CRM Page                                                       */
/* ------------------------------------------------------------------ */
export default function Crm() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'pipeline';

  return (
    <DomainWorkspace
      domain="crm"
      title="CRM & Gelir"
      subtitle="Lead'den müşteriye tüm satış ve gelir döngüsü."
    >
      <div className="mb-4"><IntegrationsPanel domain="crm" compact /></div>
      <SummaryStatsBar />
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
        <TabsContent value="revenue" className="mt-4"><RevenueAnalytics /></TabsContent>
        <TabsContent value="import" className="mt-4"><CsvImport /></TabsContent>
      </Tabs>
    </DomainWorkspace>
  );
}
