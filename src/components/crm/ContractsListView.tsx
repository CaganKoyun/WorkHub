import { useMemo, useState } from 'react';
import {
  useCrmContracts, useCreateCrmContract, useUpdateCrmContract, useCrmCompanies,
} from '@/lib/crm-hooks';
import {
  CONTRACT_STATUS_COLORS, CONTRACT_STATUS_LABELS, CURRENCIES, formatMoney,
} from '@/lib/crm-types';
import type { CrmContractStatus } from '@/lib/crm-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, FileSignature, AlertTriangle } from 'lucide-react';

export function ContractsListView() {
  const { data: contracts, isLoading } = useCrmContracts();
  const { data: companies } = useCrmCompanies();
  const update = useUpdateCrmContract();
  const compMap = useMemo(() => new Map((companies ?? []).map(c => [c.id, c.name])), [companies]);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const upcoming = (contracts ?? []).filter(c => c.status === 'active' && c.renewal_date && c.renewal_date >= today && c.renewal_date <= in60).length;

  async function setStatus(id: string, status: CrmContractStatus) {
    try {
      await update.mutateAsync({ id, status });
      toast({ title: 'Sözleşme güncellendi' });
    } catch (err: unknown) {
      toast({ title: 'Hata', description: (err as Error)?.message, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      {upcoming > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          60 gün içinde <span className="font-semibold">{upcoming}</span> sözleşme yenilenecek.
        </div>
      )}
      <div className="flex items-center justify-end"><NewContractDialog open={open} onOpenChange={setOpen} /></div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Sözleşme</TableHead>
            <TableHead>Şirket</TableHead>
            <TableHead>Değer</TableHead>
            <TableHead>Başlangıç / Bitiş</TableHead>
            <TableHead>Yenileme</TableHead>
            <TableHead>Durum</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Yükleniyor…</TableCell></TableRow>}
            {!isLoading && (contracts ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Henüz sözleşme yok.</TableCell></TableRow>
            )}
            {(contracts ?? []).map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2"><FileSignature className="h-4 w-4 text-muted-foreground" />
                    <div><div>{c.title}</div><div className="text-xs text-muted-foreground">{c.contract_number}</div></div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{c.company_id ? (compMap.get(c.company_id) ?? '—') : (c.counterparty_name ?? '—')}</TableCell>
                <TableCell className="text-sm">{formatMoney(c.value, c.currency ?? 'USD')}</TableCell>
                <TableCell className="text-xs">
                  {c.start_date ? new Date(c.start_date).toLocaleDateString('tr-TR') : '—'}
                  {' → '}
                  {c.end_date ? new Date(c.end_date).toLocaleDateString('tr-TR') : '—'}
                </TableCell>
                <TableCell className="text-xs">
                  {c.renewal_date ? new Date(c.renewal_date).toLocaleDateString('tr-TR') : '—'}
                  {c.auto_renew && <Badge variant="outline" className="ml-1 text-[9px]">Auto</Badge>}
                </TableCell>
                <TableCell>
                  <Select value={c.status} onValueChange={v => setStatus(c.id, v as CrmContractStatus)}>
                    <SelectTrigger className="w-40 h-7"><SelectValue>
                      <Badge className={CONTRACT_STATUS_COLORS[c.status]}>{CONTRACT_STATUS_LABELS[c.status]}</Badge>
                    </SelectValue></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CONTRACT_STATUS_LABELS) as CrmContractStatus[]).map(k => (
                        <SelectItem key={k} value={k}>{CONTRACT_STATUS_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NewContractDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: companies } = useCrmCompanies();
  const create = useCreateCrmContract();
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [renewal, setRenewal] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [risky, setRisky] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  async function submit() {
    if (!title.trim()) { toast({ title: 'Başlık gerekli', variant: 'destructive' }); return; }
    try {
      await create.mutateAsync({
        title: title.trim(),
        company_id: companyId || null,
        value: value ? Number(value) : null,
        currency,
        start_date: start || null,
        end_date: end || null,
        renewal_date: renewal || null,
        auto_renew: autoRenew,
        risky_clauses: risky || null,
        file_url: fileUrl || null,
      });
      toast({ title: 'Sözleşme oluşturuldu' });
      onOpenChange(false);
      setTitle(''); setCompanyId(''); setValue(''); setStart(''); setEnd(''); setRenewal(''); setRisky(''); setFileUrl('');
    } catch (err: unknown) {
      toast({ title: 'Hata', description: (err as Error)?.message, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Sözleşme</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Yeni Sözleşme</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Başlık *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Şirket</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>{(companies ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Değer</Label><Input type="number" value={value} onChange={e => setValue(e.target.value)} /></div>
            <div>
              <Label>Para Birimi</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1"><Label>Otomatik Yenileme</Label><div className="h-9 flex items-center"><Switch checked={autoRenew} onCheckedChange={setAutoRenew} /></div></div>
            </div>
            <div><Label>Başlangıç</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div><Label>Bitiş</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
            <div className="col-span-2"><Label>Yenileme Tarihi</Label><Input type="date" value={renewal} onChange={e => setRenewal(e.target.value)} /></div>
          </div>
          <div><Label>Dosya URL</Label><Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://…" /></div>
          <div><Label>Riskli Maddeler</Label><Textarea rows={3} value={risky} onChange={e => setRisky(e.target.value)} placeholder="Örn: fesih hakkı yok, indemnity sınırsız…" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={create.isPending}>Oluştur</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
