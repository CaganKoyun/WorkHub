import { useMemo } from 'react';
import { useCrmOpportunities, useCrmStages, useCrmPipelines, useStuckOpportunities, useCrmCompanies } from '@/lib/crm-hooks';
import { formatMoney, FORECAST_COLORS, FORECAST_LABELS, OPP_STATUS_LABELS } from '@/lib/crm-types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Clock } from 'lucide-react';

export function OpportunitiesListView() {
  const { data: opps, isLoading } = useCrmOpportunities();
  const { data: pipelines } = useCrmPipelines();
  const defaultPid = pipelines?.[0]?.id;
  const { data: stages } = useCrmStages(defaultPid);
  const { data: companies } = useCrmCompanies();
  const { data: stuck } = useStuckOpportunities();

  const allStages = useMemo(() => new Map((stages ?? []).map(s => [s.id, s])), [stages]);
  const compMap = useMemo(() => new Map((companies ?? []).map(c => [c.id, c.name])), [companies]);
  const stuckIds = useMemo(() => new Set((stuck ?? []).map(s => s.opportunity.id)), [stuck]);

  return (
    <div className="space-y-4">
      {(stuck ?? []).length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-warning mb-1">
            <AlertTriangle className="h-4 w-4" /> {stuck!.length} fırsat stage SLA'sını aştı
          </div>
          <div className="text-xs text-muted-foreground">
            En uzun: {stuck![0].opportunity.name} · {stuck![0].daysInStage} gündür {stuck![0].stage.name} stage'inde
          </div>
        </div>
      )}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fırsat</TableHead>
              <TableHead>Şirket</TableHead>
              <TableHead>Aşama</TableHead>
              <TableHead>Tahmin</TableHead>
              <TableHead>Tutar</TableHead>
              <TableHead>Kapanış</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Yükleniyor…</TableCell></TableRow>}
            {!isLoading && (opps ?? []).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Henüz fırsat yok.</TableCell></TableRow>
            )}
            {(opps ?? []).map(o => {
              const s = allStages.get(o.stage_id);
              const isStuck = stuckIds.has(o.id);
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    {o.name}
                    {isStuck && <Clock className="inline h-3 w-3 ml-2 text-warning" />}
                  </TableCell>
                  <TableCell className="text-sm">{o.company_id ? (compMap.get(o.company_id) ?? '—') : '—'}</TableCell>
                  <TableCell className="text-sm">{s?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={FORECAST_COLORS[o.forecast_category]}>{FORECAST_LABELS[o.forecast_category]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">{formatMoney(o.amount, o.currency)}</TableCell>
                  <TableCell className="text-xs">{o.expected_close_date ? new Date(o.expected_close_date).toLocaleDateString('tr-TR') : '—'}</TableCell>
                  <TableCell className="text-sm">{OPP_STATUS_LABELS[o.status]}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
