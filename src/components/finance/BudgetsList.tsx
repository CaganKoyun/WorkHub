import { useState } from 'react';
import {
  useBudgetVariance, useCreateFinBudget, useFinCategories,
} from '@/lib/finance-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { FIN_CURRENCIES, BUDGET_PERIOD_LABELS, formatCurrency } from '@/lib/finance-types';
import type { FinBudgetPeriod } from '@/lib/finance-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, AlertTriangle } from 'lucide-react';

export function BudgetsList() {
  const { data: variance, isLoading } = useBudgetVariance();
  const [open, setOpen] = useState(false);
  const alerted = (variance ?? []).filter(v => v.alerted);

  return (
    <div className="space-y-4">
      {alerted.length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <div className="flex items-center gap-2 text-warning font-medium">
            <AlertTriangle className="h-4 w-4" /> {alerted.length} bütçe uyarı eşiğini geçti
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            En yüksek sapma: {alerted[0].budget.name} · %{alerted[0].utilizationPct.toFixed(0)} kullanım
          </div>
        </div>
      )}

      <div className="flex justify-end"><NewBudgetDialog open={open} onOpenChange={setOpen} /></div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Bütçe</TableHead>
            <TableHead>Dönem</TableHead>
            <TableHead>Bütçe / Gerçekleşen</TableHead>
            <TableHead className="w-64">Kullanım</TableHead>
            <TableHead>Sapma</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Yükleniyor…</TableCell></TableRow>}
            {!isLoading && (variance ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Henüz bütçe yok.</TableCell></TableRow>
            )}
            {(variance ?? []).map(v => {
              const pct = Math.min(v.utilizationPct, 999);
              const barPct = Math.min(v.utilizationPct, 100);
              const tone = v.utilizationPct >= 100 ? 'bg-destructive' : v.alerted ? 'bg-warning' : 'bg-success';
              return (
                <TableRow key={v.budget.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{v.budget.name}</div>
                    <div className="text-xs text-muted-foreground">{BUDGET_PERIOD_LABELS[v.budget.period]}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(v.budget.period_start).toLocaleDateString('tr-TR')} → {new Date(v.budget.period_end).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-semibold">{formatCurrency(v.budget.amount, v.budget.currency)}</div>
                    <div className="text-xs text-muted-foreground">Gerçekleşen: {formatCurrency(v.actual, 'USD')}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${tone}`} style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">%{pct.toFixed(0)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.variance < 0 ? 'destructive' : 'outline'} className="text-xs">
                      {v.variance >= 0 ? '+' : ''}{formatCurrency(v.variance, 'USD')}
                    </Badge>
                    {v.alerted && <AlertTriangle className="inline h-3 w-3 ml-1 text-warning" />}
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

function NewBudgetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<FinBudgetPeriod>('monthly');
  const [start, setStart] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [end, setEnd] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [department, setDepartment] = useState('');
  const [threshold, setThreshold] = useState('90');

  const { data: categories } = useFinCategories('expense');
  const { data: projects } = useProjects();
  const create = useCreateFinBudget();

  async function submit() {
    if (!name.trim() || !amount) { toast.error("İsim ve tutar gerekli"); return; }
    try {
      await create.mutateAsync({
        name: name.trim(), period,
        period_start: start, period_end: end,
        amount: Number(amount), currency,
        category_id: categoryId || null,
        project_id: projectId || null,
        department: department || null,
        alert_threshold_pct: Number(threshold) || 90,
      });
      toast.success("Bütçe oluşturuldu");
      onOpenChange(false); setName(''); setAmount(''); setCategoryId(''); setProjectId(''); setDepartment('');
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Hata");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Bütçe</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Yeni Bütçe</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Ad *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dönem</Label>
              <Select value={period} onValueChange={v => setPeriod(v as FinBudgetPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(BUDGET_PERIOD_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Para Birimi</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIN_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Başlangıç *</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div><Label>Bitiş *</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
            <div className="col-span-2"><Label>Tutar *</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div>
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Tümü" /></SelectTrigger>
                <SelectContent>{(categories ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proje</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Yok" /></SelectTrigger>
                <SelectContent>{(projects ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Departman</Label><Input value={department} onChange={e => setDepartment(e.target.value)} /></div>
            <div><Label>Uyarı Eşiği %</Label><Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={create.isPending}>Oluştur</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
