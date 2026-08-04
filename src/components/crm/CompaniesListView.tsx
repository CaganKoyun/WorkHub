import { useMemo, useState } from 'react';
import {
  useCrmCompanies, useCreateCrmCompany, useDuplicateCompanies,
} from '@/lib/crm-hooks';
import {
  LIFECYCLE_COLORS, LIFECYCLE_LABELS, HEALTH_COLORS, HEALTH_LABELS,
  CURRENCIES, formatMoney,
} from '@/lib/crm-types';
import type { CrmLifecycle } from '@/lib/crm-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, AlertTriangle, Building2 } from 'lucide-react';

export function CompaniesListView() {
  const [search, setSearch] = useState('');
  const { data: companies, isLoading } = useCrmCompanies(search);
  const [openNew, setOpenNew] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative w-64">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Şirket ara..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <NewCompanyDialog open={openNew} onOpenChange={setOpenNew} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Şirket</TableHead>
              <TableHead>Sektör</TableHead>
              <TableHead>Yaşam Döngüsü</TableHead>
              <TableHead>Sağlık</TableHead>
              <TableHead>Gelir</TableHead>
              <TableHead>Ülke</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Yükleniyor…</TableCell></TableRow>
            )}
            {!isLoading && (companies ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Henüz şirket yok.</TableCell></TableRow>
            )}
            {(companies ?? []).map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{c.name}</div>
                      {c.domain && <div className="text-xs text-muted-foreground">{c.domain}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{c.industry ?? '—'}</TableCell>
                <TableCell><Badge className={LIFECYCLE_COLORS[c.lifecycle]}>{LIFECYCLE_LABELS[c.lifecycle]}</Badge></TableCell>
                <TableCell>{c.health ? <Badge className={HEALTH_COLORS[c.health]}>{HEALTH_LABELS[c.health]}</Badge> : '—'}</TableCell>
                <TableCell className="text-sm">{formatMoney(c.annual_revenue, c.currency ?? 'USD')}</TableCell>
                <TableCell className="text-sm">{c.country ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NewCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [lifecycle, setLifecycle] = useState<CrmLifecycle>('lead');
  const [currency, setCurrency] = useState('USD');
  const [revenue, setRevenue] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateCrmCompany();
  // Duplicate detection — CRM-007
  const { data: dupes } = useDuplicateCompanies(name.length >= 2 ? name : undefined, domain || null);
  const relevantDupes = useMemo(
    () => (dupes ?? []).filter(d => d.name.toLowerCase() !== name.toLowerCase().trim() || !d.id),
    [dupes, name],
  );

  async function submit() {
    if (!name.trim()) { toast({ title: 'İsim gerekli', variant: 'destructive' }); return; }
    try {
      await create.mutateAsync({
        name: name.trim(),
        domain: domain || null,
        industry: industry || null,
        country: country || null,
        lifecycle,
        currency,
        annual_revenue: revenue ? Number(revenue) : null,
        description: description || null,
      });
      toast({ title: 'Şirket oluşturuldu' });
      onOpenChange(false);
      setName(''); setDomain(''); setIndustry(''); setCountry(''); setRevenue(''); setDescription('');
    } catch (err: unknown) {
      toast({ title: 'Hata', description: (err as Error)?.message, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Şirket</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Yeni Şirket</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Ad *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          {relevantDupes.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              <div className="flex items-center gap-1 text-amber-300 font-medium mb-1">
                <AlertTriangle className="h-3 w-3" /> Olası dupe kayıt
              </div>
              <ul className="space-y-0.5">
                {relevantDupes.slice(0, 3).map(d => <li key={d.id}>· {d.name}{d.domain ? ` — ${d.domain}` : ''}</li>)}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Domain</Label><Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="acme.com" /></div>
            <div><Label>Sektör</Label><Input value={industry} onChange={e => setIndustry(e.target.value)} /></div>
            <div><Label>Ülke</Label><Input value={country} onChange={e => setCountry(e.target.value)} /></div>
            <div>
              <Label>Yaşam Döngüsü</Label>
              <Select value={lifecycle} onValueChange={v => setLifecycle(v as CrmLifecycle)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(LIFECYCLE_LABELS) as CrmLifecycle[]).map(k => (
                    <SelectItem key={k} value={k}>{LIFECYCLE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Yıllık Gelir</Label>
              <Input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} />
            </div>
            <div>
              <Label>Para Birimi</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Açıklama</Label><Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={create.isPending}>Oluştur</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
