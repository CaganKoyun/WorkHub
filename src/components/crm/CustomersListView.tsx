import { useMemo } from 'react';
import { useCrmCustomers, useCrmCompanies, useUpdateCrmCustomer } from '@/lib/crm-hooks';
import { HEALTH_COLORS, HEALTH_LABELS, formatMoney } from '@/lib/crm-types';
import type { CrmCustomerHealth } from '@/lib/crm-types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

// Health score inputs (product usage, tickets, payments, last contact, NPS, renewal, incidents, AM assessment)
// v1: manual health selection + derived score display. Extend as usage telemetry lands.
export function CustomersListView() {
  const { data: customers, isLoading } = useCrmCustomers();
  const { data: companies } = useCrmCompanies();
  const update = useUpdateCrmCustomer();
  const compMap = useMemo(() => new Map((companies ?? []).map(c => [c.id, c])), [companies]);

  async function setHealth(id: string, health: CrmCustomerHealth) {
    try {
      await update.mutateAsync({ id, health });
      toast({ title: 'Sağlık güncellendi' });
    } catch (err: unknown) {
      toast({ title: 'Hata', description: (err as Error)?.message, variant: 'destructive' });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const rows = customers ?? [];
    return {
      count: rows.length,
      mrr: rows.reduce((s, c) => s + Number(c.mrr ?? 0), 0),
      arr: rows.reduce((s, c) => s + Number(c.arr ?? 0), 0),
      atRisk: rows.filter(c => c.health === 'at_risk' || c.health === 'critical').length,
      renewalsSoon: rows.filter(c => c.renewal_date && c.renewal_date >= today && c.renewal_date <= in30).length,
    };
  }, [customers, today, in30]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Müşteri" value={stats.count.toString()} />
        <Metric label="MRR" value={formatMoney(stats.mrr, 'USD')} />
        <Metric label="ARR" value={formatMoney(stats.arr, 'USD')} />
        <Metric label="Riskli" value={stats.atRisk.toString()} tone={stats.atRisk > 0 ? 'warn' : undefined} />
        <Metric label="30g Yenileme" value={stats.renewalsSoon.toString()} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Müşteri</TableHead>
              <TableHead>MRR / ARR</TableHead>
              <TableHead>NPS</TableHead>
              <TableHead>Yenileme</TableHead>
              <TableHead>Son İletişim</TableHead>
              <TableHead>Sağlık</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Yükleniyor…</TableCell></TableRow>}
            {!isLoading && (customers ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Henüz müşteri yok. Bir fırsatı "Closed Won" stage'ine taşıyarak otomatik oluşturabilirsin.
              </TableCell></TableRow>
            )}
            {(customers ?? []).map(c => {
              const comp = c.company_id ? compMap.get(c.company_id) : null;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{comp?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    {formatMoney(c.mrr, c.currency ?? 'USD')} / {formatMoney(c.arr, c.currency ?? 'USD')}
                  </TableCell>
                  <TableCell className="text-sm">{c.nps ?? '—'}</TableCell>
                  <TableCell className="text-xs">{c.renewal_date ? new Date(c.renewal_date).toLocaleDateString('tr-TR') : '—'}</TableCell>
                  <TableCell className="text-xs">{c.last_contact_at ? new Date(c.last_contact_at).toLocaleDateString('tr-TR') : '—'}</TableCell>
                  <TableCell>
                    <Select value={c.health} onValueChange={v => setHealth(c.id, v as CrmCustomerHealth)}>
                      <SelectTrigger className="w-32 h-7">
                        <SelectValue>
                          <Badge className={HEALTH_COLORS[c.health]}>{HEALTH_LABELS[c.health]}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(HEALTH_LABELS) as CrmCustomerHealth[]).map(k => (
                          <SelectItem key={k} value={k}>{HEALTH_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-3 ${tone === 'warn' ? 'border-warning/40' : ''}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
