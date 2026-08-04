import { useProjectPL } from '@/lib/finance-hooks';
import { formatCurrency } from '@/lib/finance-types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ProjectPLView() {
  const { data: rows, isLoading } = useProjectPL();

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Company Graph bağlantısı: her projeye linkli gelir ve giderler gerçek zamanlı toplanır.
      </div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Proje</TableHead>
            <TableHead>Gelir</TableHead>
            <TableHead>Gider</TableHead>
            <TableHead>Kar/Zarar</TableHead>
            <TableHead>Bütçe</TableHead>
            <TableHead className="w-56">Bütçe Kullanımı</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Yükleniyor…</TableCell></TableRow>}
            {!isLoading && (rows ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Proje yok.</TableCell></TableRow>
            )}
            {(rows ?? []).map(p => {
              const util = p.budgetUtilizationPct;
              const tone = util == null ? '' : util >= 100 ? 'bg-destructive' : util >= 90 ? 'bg-amber-500' : 'bg-emerald-500';
              return (
                <TableRow key={p.projectId}>
                  <TableCell className="font-medium">{p.projectName}</TableCell>
                  <TableCell className="text-sm text-emerald-400">{formatCurrency(p.income, 'USD')}</TableCell>
                  <TableCell className="text-sm text-destructive">{formatCurrency(p.expense, 'USD')}</TableCell>
                  <TableCell>
                    <Badge variant={p.net >= 0 ? 'outline' : 'destructive'} className="text-sm">
                      {p.net >= 0 ? '+' : ''}{formatCurrency(p.net, 'USD')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{p.budget != null ? formatCurrency(p.budget, 'USD') : '—'}</TableCell>
                  <TableCell>
                    {util != null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${tone}`} style={{ width: `${Math.min(util, 100)}%` }} />
                        </div>
                        <span className="text-xs font-medium w-12 text-right">%{util.toFixed(0)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
