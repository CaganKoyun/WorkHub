import { useState } from 'react';
import { useCrmForecast, useCrmSummary } from '@/lib/crm-hooks';
import { formatMoney } from '@/lib/crm-types';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export function ForecastView() {
  const [sliceBy, setSliceBy] = useState<'month' | 'quarter'>('month');
  const { data: buckets, isLoading } = useCrmForecast(sliceBy);
  const { data: summary } = useCrmSummary();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="Açık Pipeline" value={formatMoney(summary?.openPipeline ?? 0, 'USD')} sub={`${summary?.openOppCount ?? 0} fırsat`} />
        <Tile label="Commit" value={formatMoney(summary?.commit ?? 0, 'USD')} />
        <Tile label="Kazanılan" value={formatMoney(summary?.closedWon ?? 0, 'USD')} />
        <Tile label="MRR" value={formatMoney(summary?.totalMRR ?? 0, 'USD')} />
        <Tile label="ARR" value={formatMoney(summary?.totalARR ?? 0, 'USD')} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Dilim:</span>
        <Button size="sm" variant={sliceBy === 'month' ? 'default' : 'outline'} onClick={() => setSliceBy('month')}>Aylık</Button>
        <Button size="sm" variant={sliceBy === 'quarter' ? 'default' : 'outline'} onClick={() => setSliceBy('quarter')}>Çeyreklik</Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium mb-2">Gelir Tahmini</div>
        <div className="h-72">
          {isLoading || !buckets?.length ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {isLoading ? 'Yükleniyor…' : 'Beklenen kapanış tarihi olan fırsat yok.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatMoney(v, 'USD')} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="closed_won" stackId="a" fill="hsl(var(--success))" name="Closed Won" />
                <Bar dataKey="commit" stackId="a" fill="hsl(var(--warning))" name="Commit" />
                <Bar dataKey="best_case" stackId="a" fill="hsl(var(--info))" name="Best Case" />
                <Bar dataKey="pipeline" stackId="a" fill="hsl(var(--muted-foreground))" name="Pipeline" />
                <Bar dataKey="closed_lost" stackId="a" fill="hsl(var(--destructive))" name="Closed Lost" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
