import { useState } from 'react';
import { useFinSummary } from '@/lib/finance-hooks';
import { formatCurrency, formatMonths } from '@/lib/finance-types';
import { TrendingDown, TrendingUp, Wallet, Timer, AlertTriangle } from 'lucide-react';

export function FinanceOverview() {
  const { data: s, isLoading } = useFinSummary();

  const runwayTone = s?.runwayMonths == null ? undefined
    : s.runwayMonths < 3 ? 'crit'
    : s.runwayMonths < 6 ? 'warn' : 'ok';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile
          icon={<Wallet className="h-4 w-4" />}
          label="Nakit Bakiye (USD)"
          value={isLoading ? '…' : formatCurrency(s?.cashBase, 'USD')}
          sub={`${s?.accountsCount ?? 0} hesap`}
        />
        <MetricTile
          icon={<TrendingDown className="h-4 w-4" />}
          label="Aylık Burn (3ay ort.)"
          value={isLoading ? '…' : formatCurrency(s?.burn3m, 'USD')}
          sub={`6ay: ${formatCurrency(s?.burn6m ?? 0, 'USD')}`}
        />
        <MetricTile
          icon={<Timer className="h-4 w-4" />}
          label="Runway"
          value={isLoading ? '…' : formatMonths(s?.runwayMonths ?? null)}
          sub={`${formatMonths(s?.runwayConservative ?? null)} – ${formatMonths(s?.runwayOptimistic ?? null)}`}
          tone={runwayTone}
        />
        <MetricTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="30g Gelir / Gider"
          value={isLoading ? '…' : `${formatCurrency(s?.income30d, 'USD')}`}
          sub={`Gider: ${formatCurrency(s?.expense30d ?? 0, 'USD')}`}
        />
      </div>
      {s && runwayTone === 'crit' && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Runway 3 ayın altında. Acil aksiyon: burn'ü düşür veya gelir hızlandır.
        </div>
      )}
      {s && runwayTone === 'warn' && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Runway 6 ayın altında. Fundraising / gelir planı öncelikli olmalı.
        </div>
      )}
    </div>
  );
}

function MetricTile({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  tone?: 'ok' | 'warn' | 'crit';
}) {
  const ring = tone === 'crit' ? 'border-destructive/50' : tone === 'warn' ? 'border-warning/40' : 'border-border';
  return (
    <div className={`rounded-lg border ${ring} bg-card p-3`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
