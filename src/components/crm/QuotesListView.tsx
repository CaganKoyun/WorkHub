import { useState } from 'react';
import { useCrmQuotes, useCreateCrmQuote, useCrmOpportunities } from '@/lib/crm-hooks';
import { QUOTE_STATUS_LABELS, CURRENCIES, formatMoney } from '@/lib/crm-types';
import type { CrmQuoteStatus } from '@/lib/crm-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, FileText } from 'lucide-react';

const STATUS_COLORS: Record<CrmQuoteStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-300',
  accepted: 'bg-emerald-500/20 text-emerald-300',
  declined: 'bg-destructive/20 text-destructive-foreground',
  expired: 'bg-amber-500/20 text-amber-300',
  revised: 'bg-[#BFD9FF]/20 text-[#8FBAFF]',
};

export function QuotesListView() {
  const { data: quotes, isLoading } = useCrmQuotes();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end"><NewQuoteDialog open={open} onOpenChange={setOpen} /></div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Teklif</TableHead>
            <TableHead>Versiyon</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Geçerlilik</TableHead>
            <TableHead>Gönderim</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Yükleniyor…</TableCell></TableRow>}
            {!isLoading && (quotes ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Henüz teklif yok.</TableCell></TableRow>
            )}
            {(quotes ?? []).map(q => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{q.quote_number}</div>
                </TableCell>
                <TableCell>v{q.version}</TableCell>
                <TableCell><Badge className={STATUS_COLORS[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge></TableCell>
                <TableCell className="font-semibold text-sm">{formatMoney(q.total, q.currency)}</TableCell>
                <TableCell className="text-xs">{q.valid_until ? new Date(q.valid_until).toLocaleDateString('tr-TR') : '—'}</TableCell>
                <TableCell className="text-xs">{q.sent_at ? new Date(q.sent_at).toLocaleDateString('tr-TR') : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NewQuoteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: opps } = useCrmOpportunities();
  const create = useCreateCrmQuote();
  const [oppId, setOppId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [subtotal, setSubtotal] = useState('0');
  const [discountPct, setDiscountPct] = useState('0');
  const [taxPct, setTaxPct] = useState('0');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');

  const s = Number(subtotal) || 0;
  const d = s * (Number(discountPct) || 0) / 100;
  const t = (s - d) * (Number(taxPct) || 0) / 100;
  const total = s - d + t;

  async function submit() {
    const opp = opps?.find(o => o.id === oppId);
    try {
      await create.mutateAsync({
        opportunity_id: oppId || null,
        company_id: opp?.company_id ?? null,
        currency,
        subtotal: s,
        discount_pct: Number(discountPct) || 0,
        discount_amount: d,
        tax_pct: Number(taxPct) || 0,
        tax_amount: t,
        total,
        valid_until: validUntil || null,
        notes: notes || null,
      });
      toast.success("Teklif olusturuldu");
      onOpenChange(false);
      setOppId(''); setSubtotal('0'); setDiscountPct('0'); setTaxPct('0'); setValidUntil(''); setNotes('');
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Hata");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Teklif</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Yeni Teklif</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Fırsat</Label>
            <Select value={oppId} onValueChange={setOppId}>
              <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
              <SelectContent>{(opps ?? []).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Para Birimi</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Ara Toplam</Label><Input type="number" value={subtotal} onChange={e => setSubtotal(e.target.value)} /></div>
            <div><Label>İndirim %</Label><Input type="number" value={discountPct} onChange={e => setDiscountPct(e.target.value)} /></div>
            <div><Label>Vergi %</Label><Input type="number" value={taxPct} onChange={e => setTaxPct(e.target.value)} /></div>
            <div className="col-span-2"><Label>Geçerlilik Tarihi</Label><Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} /></div>
          </div>
          <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Ara Toplam</span><span>{formatMoney(s, currency)}</span></div>
            <div className="flex justify-between"><span>İndirim</span><span>-{formatMoney(d, currency)}</span></div>
            <div className="flex justify-between"><span>Vergi</span><span>+{formatMoney(t, currency)}</span></div>
            <div className="flex justify-between font-semibold pt-1 border-t border-border"><span>Toplam</span><span>{formatMoney(total, currency)}</span></div>
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
