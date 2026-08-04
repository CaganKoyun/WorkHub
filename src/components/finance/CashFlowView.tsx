import { useState } from 'react';
import { useFinCashFlow } from '@/lib/finance-hooks';
import { formatCurrency } from '@/lib/finance-types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export function CashFlowView() {
  const [months, setMonths] = useState(6);
  const { data: buckets, isLoading } = useFinCashFlow(months);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Ufuk:</span>
        {[3, 6, 12].map(m => (
          <Button key={m} size="sm" variant={months === m ? 'default' : 'outline'} onClick={() => setMonths(m)}>{m}ay</Button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          Baseline: son 3ay ort. gelir/gider + CRM pipeline (commit %90 · best case %60 · pipeline %25)
        </span>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium mb-2">Nakit Akışı Projeksiyonu</div>
        <div className="h-72">
          {isLoading || !buckets?.length ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Yükleniyor…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v, 'USD')} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" fill="#10b981" name="Gelir" />
                <Bar dataKey="expense" fill="#ef4444" name="Gider" />
                <Line type="monotone" dataKey="closing" stroke="#38bdf8" strokeWidth={2} name="Kapanış Nakit" dot />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Ay</TableHead>
            <TableHead>Açılış</TableHead>
            <TableHead>Beklenen Gelir</TableHead>
            <TableHead>Beklenen Gider</TableHead>
            <TableHead>Net</TableHead>
            <TableHead>Kapanış</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(buckets ?? []).map(b => (
              <TableRow key={b.key}>
                <TableCell className="font-medium">{b.label}</TableCell>
                <TableCell className="text-sm">{formatCurrency(b.opening, 'USD')}</TableCell>
                <TableCell className="text-sm text-emerald-400">{formatCurrency(b.income, 'USD')}</TableCell>
                <TableCell className="text-sm text-destructive">-{formatCurrency(b.expense, 'USD')}</TableCell>
                <TableCell className={`text-sm font-medium ${b.net >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                  {b.net >= 0 ? '+' : ''}{formatCurrency(b.net, 'USD')}
                </TableCell>
                <TableCell className="text-sm font-semibold">{formatCurrency(b.closing, 'USD')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
