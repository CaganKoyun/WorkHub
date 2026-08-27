import { useMemo, useState } from 'react';
import {
  useFinTransactions, useCreateFinTransaction, useFinCategories, useFinAccounts, useCreateFinAccount,
} from '@/lib/finance-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { useCrmCustomers, useCrmCompanies, useCrmContracts } from '@/lib/crm-hooks';
import {
  TXN_TYPE_COLORS, TXN_TYPE_LABELS, TXN_STATUS_LABELS, FIN_CURRENCIES, ACCOUNT_TYPE_LABELS,
  formatCurrency,
} from '@/lib/finance-types';
import type { FinTxnType, FinTxnStatus, FinAccountType } from '@/lib/finance-types';
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
import { toast } from 'sonner';
import { Plus, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

export function TransactionsList() {
  const [typeFilter, setTypeFilter] = useState<FinTxnType | 'all'>('all');
  const { data: txns, isLoading } = useFinTransactions(typeFilter === 'all' ? undefined : { type: typeFilter });
  const { data: projects } = useProjects();
  const { data: customers } = useCrmCustomers();
  const { data: companies } = useCrmCompanies();

  const projMap = useMemo(() => new Map((projects ?? []).map(p => [p.id, p.name])), [projects]);
  const custMap = useMemo(() => {
    const cm = new Map((companies ?? []).map(c => [c.id, c.name]));
    return new Map((customers ?? []).map(c => [c.id, c.company_id ? (cm.get(c.company_id) ?? 'Müşteri') : 'Müşteri']));
  }, [customers, companies]);

  const [openNewTxn, setOpenNewTxn] = useState(false);
  const [openNewAcc, setOpenNewAcc] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as FinTxnType | 'all')}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="income">Gelir</SelectItem>
              <SelectItem value="expense">Gider</SelectItem>
              <SelectItem value="transfer">Havale</SelectItem>
            </SelectContent>
          </Select>
          <AccountsButton openDialog={openNewAcc} setOpenDialog={setOpenNewAcc} />
        </div>
        <NewTransactionDialog open={openNewTxn} onOpenChange={setOpenNewTxn} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead>Tür</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Proje / Müşteri</TableHead>
            <TableHead>Durum</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Yükleniyor…</TableCell></TableRow>}
            {!isLoading && (txns ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Henüz işlem yok.</TableCell></TableRow>
            )}
            {(txns ?? []).map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">{new Date(t.txn_date).toLocaleDateString('tr-TR')}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{t.description}</div>
                  {t.vendor_name && <div className="text-xs text-muted-foreground">{t.vendor_name}</div>}
                </TableCell>
                <TableCell>
                  <Badge className={TXN_TYPE_COLORS[t.type]}>
                    {t.type === 'income' ? <ArrowUpRight className="inline h-3 w-3 mr-1" /> : t.type === 'expense' ? <ArrowDownRight className="inline h-3 w-3 mr-1" /> : null}
                    {TXN_TYPE_LABELS[t.type]}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-sm">
                  {formatCurrency(t.amount, t.currency)}
                  {t.currency !== 'USD' && (
                    <div className="text-[10px] text-muted-foreground font-normal">
                      ≈ {formatCurrency(t.amount_base, 'USD')}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {t.project_id && <div>Proje: {projMap.get(t.project_id) ?? '—'}</div>}
                  {t.crm_customer_id && <div>Müşteri: {custMap.get(t.crm_customer_id) ?? '—'}</div>}
                  {t.department && <div>Dept: {t.department}</div>}
                </TableCell>
                <TableCell className="text-xs">{TXN_STATUS_LABELS[t.status]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AccountsButton({ openDialog, setOpenDialog }: { openDialog: boolean; setOpenDialog: (v: boolean) => void }) {
  const { data: accounts } = useFinAccounts();
  const total = (accounts ?? []).length;
  const create = useCreateFinAccount();
  const [name, setName] = useState('');
  const [type, setType] = useState<FinAccountType>('bank');
  const [currency, setCurrency] = useState('USD');
  const [opening, setOpening] = useState('0');

  async function submit() {
    if (!name.trim()) { toast.error("İsim gerekli"); return; }
    try {
      await create.mutateAsync({ name: name.trim(), type, currency, opening_balance: Number(opening) || 0 });
      toast.success("Hesap eklendi");
      setOpenDialog(false); setName(''); setOpening('0');
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Hata");
    }
  }

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Wallet className="h-4 w-4 mr-1" /> Hesaplar ({total})</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Hesaplar</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="max-h-40 overflow-y-auto border border-border rounded-md">
            {(accounts ?? []).length === 0 && <div className="p-3 text-xs text-muted-foreground">Henüz hesap yok.</div>}
            {(accounts ?? []).map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 text-sm border-b border-border last:border-0">
                <span>{a.name} <span className="text-xs text-muted-foreground">({ACCOUNT_TYPE_LABELS[a.type]})</span></span>
                <span className="text-xs">{formatCurrency(a.opening_balance, a.currency)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <div className="text-xs font-medium">Yeni hesap</div>
            <Input placeholder="Ad" value={name} onChange={e => setName(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Select value={type} onValueChange={v => setType(v as FinAccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ACCOUNT_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIN_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Açılış bakiye" value={opening} onChange={e => setOpening(e.target.value)} />
            </div>
            <Button size="sm" onClick={submit} disabled={create.isPending} className="w-full">Ekle</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewTransactionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [type, setType] = useState<FinTxnType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [txnDate, setTxnDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<FinTxnStatus>('posted');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [department, setDepartment] = useState('');
  const [contractId, setContractId] = useState('');
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const { data: categories } = useFinCategories(type);
  const { data: accounts } = useFinAccounts();
  const { data: projects } = useProjects();
  const { data: customers } = useCrmCustomers();
  const { data: companies } = useCrmCompanies();
  const { data: contracts } = useCrmContracts();
  const compMap = useMemo(() => new Map((companies ?? []).map(c => [c.id, c.name])), [companies]);
  const create = useCreateFinTransaction();

  async function submit() {
    if (!description.trim() || !amount) {
      toast.error("Açıklama ve tutar gerekli"); return;
    }
    try {
      await create.mutateAsync({
        type, description: description.trim(), amount: Number(amount), currency,
        txn_date: txnDate, status,
        account_id: accountId || null,
        category_id: categoryId || null,
        project_id: projectId || null,
        crm_customer_id: customerId || null,
        department: department || null,
        contract_id: contractId || null,
        vendor_name: vendor || null,
        invoice_number: invoiceNumber || null,
        notes: notes || null,
      });
      toast.success("Kaydedildi");
      onOpenChange(false);
      setDescription(''); setAmount(''); setVendor(''); setInvoiceNumber(''); setNotes('');
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Hata");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> İşlem</Button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Yeni İşlem</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tür</Label>
              <Select value={type} onValueChange={v => setType(v as FinTxnType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Gider</SelectItem>
                  <SelectItem value="income">Gelir</SelectItem>
                  <SelectItem value="transfer">Havale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tarih</Label>
              <Input type="date" value={txnDate} onChange={e => setTxnDate(e.target.value)} />
            </div>
            <div>
              <Label>Durum</Label>
              <Select value={status} onValueChange={v => setStatus(v as FinTxnStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TXN_STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Açıklama *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Tutar *</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Para Birimi</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIN_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hesap</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proje</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Müşteri</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_id ? (compMap.get(c.company_id) ?? 'Müşteri') : 'Müşteri'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Departman</Label>
              <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Engineering, Sales…" />
            </div>
            <div>
              <Label>Sözleşme</Label>
              <Select value={contractId} onValueChange={setContractId}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {(contracts ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.contract_number} — {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor / Kaynak</Label>
              <Input value={vendor} onChange={e => setVendor(e.target.value)} />
            </div>
            <div>
              <Label>Fatura No</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notlar</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={create.isPending}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
