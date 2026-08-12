import { useMemo, useState } from 'react';
import {
  useCrmContacts, useCreateCrmContact, useDuplicateContacts, useCrmCompanies,
} from '@/lib/crm-hooks';
import {
  LIFECYCLE_COLORS, LIFECYCLE_LABELS,
} from '@/lib/crm-types';
import type { CrmLifecycle } from '@/lib/crm-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Mail, Phone } from 'lucide-react';

export function ContactsListView() {
  const { data: contacts, isLoading } = useCrmContacts();
  const { data: companies } = useCrmCompanies();
  const [openNew, setOpenNew] = useState(false);

  const compMap = useMemo(() => new Map((companies ?? []).map(c => [c.id, c.name])), [companies]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <NewContactDialog open={openNew} onOpenChange={setOpenNew} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kişi</TableHead>
              <TableHead>Şirket</TableHead>
              <TableHead>Ünvan</TableHead>
              <TableHead>İletişim</TableHead>
              <TableHead>Yaşam Döngüsü</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Yükleniyor…</TableCell></TableRow>
            )}
            {!isLoading && (contacts ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Henüz kişi yok.</TableCell></TableRow>
            )}
            {(contacts ?? []).map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {c.full_name}
                  {c.is_decision_maker && <Badge variant="outline" className="ml-2 text-[9px]">DM</Badge>}
                </TableCell>
                <TableCell className="text-sm">{c.company_id ? (compMap.get(c.company_id) ?? '—') : '—'}</TableCell>
                <TableCell className="text-sm">{c.title ?? '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</div>}
                  {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div>}
                </TableCell>
                <TableCell><Badge className={LIFECYCLE_COLORS[c.lifecycle]}>{LIFECYCLE_LABELS[c.lifecycle]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NewContactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [lifecycle, setLifecycle] = useState<CrmLifecycle>('lead');
  const { data: companies } = useCrmCompanies();
  const { data: dupes } = useDuplicateContacts(email && email.includes('@') ? email : null);
  const create = useCreateCrmContact();

  async function submit() {
    if (!firstName.trim() && !lastName.trim() && !email.trim()) {
      toast.error("Isim veya e-posta gerekli"); return;
    }
    try {
      await create.mutateAsync({
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        phone: phone || null,
        title: title || null,
        company_id: companyId || null,
        lifecycle,
      });
      toast.success("Kisi eklendi");
      onOpenChange(false);
      setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setTitle(''); setCompanyId('');
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Hata");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Kişi</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Yeni Kişi</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ad</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
            <div><Label>Soyad</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
          </div>
          <div><Label>E-posta</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          {(dupes ?? []).length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs">
              <div className="flex items-center gap-1 text-warning font-medium mb-1">
                <AlertTriangle className="h-3 w-3" /> Aynı e-posta ile kayıt var
              </div>
              <ul className="space-y-0.5">
                {dupes!.slice(0, 3).map(d => <li key={d.id}>· {d.full_name} — {d.email}</li>)}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefon</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div><Label>Ünvan</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div>
              <Label>Şirket</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {(companies ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
