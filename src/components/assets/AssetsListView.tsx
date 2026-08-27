import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAssets, useCategories, useEmployees, useAssignAsset, useBulkCreateAssets } from '@/lib/assets-hooks';
import { useAllCurrentAssignments } from '@/lib/assets-hooks';
import { calculateDepreciation, CONDITION_COLORS } from '@/lib/assets-types';
import type { AssetCondition } from '@/lib/assets-types';
import { exportToCsv, parseCsvFile } from '@/lib/csv-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  UserPlus, X, Download, Upload, DollarSign, TrendingDown, BarChart3, Percent,
} from 'lucide-react';
import { toast } from 'sonner';

const CONDITION_LABELS_TR: Record<AssetCondition, string> = {
  excellent: 'Mukemmel',
  good: 'Iyi',
  fair: 'Orta',
  poor: 'Kotu',
  retired: 'Emekli',
};

const CATEGORY_BADGE_COLORS = [
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'bg-lime-500/20 text-lime-300 border-lime-500/30',
];

type SortKey = 'name' | 'category' | 'condition' | 'purchase_date' | 'current_value';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;

export function AssetsListView() {
  const { data: assets, isLoading } = useAssets();
  const { data: categories } = useCategories();
  const { data: employees } = useEmployees();
  const { data: allAssignments } = useAllCurrentAssignments();
  const assignAsset = useAssignAsset();
  const bulkCreate = useBulkCreateAssets();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkEmployee, setBulkEmployee] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map asset_id -> employee name for current assignments
  const assignmentMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of allAssignments ?? []) {
      if (a.employees?.name) {
        m.set(a.asset_id, a.employees.name);
      }
    }
    return m;
  }, [allAssignments]);

  // Map category_id -> color index
  const categoryColorMap = useMemo(() => {
    const m = new Map<string, string>();
    (categories ?? []).forEach((c, i) => {
      m.set(c.id, CATEGORY_BADGE_COLORS[i % CATEGORY_BADGE_COLORS.length]);
    });
    return m;
  }, [categories]);

  const handleExport = () => {
    const rows = (assets ?? []).map(a => [
      a.name, a.asset_categories?.name ?? '', a.serial_number ?? '',
      a.purchase_date, a.purchase_cost, a.condition, a.location ?? '',
      a.useful_life_years, a.residual_value_percent, a.notes ?? '',
    ]);
    exportToCsv('assets.csv', ['name','category','serial_number','purchase_date','purchase_cost','condition','location','useful_life_years','residual_value_percent','notes'], rows);
    toast.success('Varliklar disa aktarildi');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseCsvFile(file);
      setImportRows(rows);
      setImportDialogOpen(true);
    } catch { toast.error('CSV dosyasi okunamadi'); }
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    const catMap = new Map((categories ?? []).map(c => [c.name.toLowerCase(), c]));
    const validConditions = ['excellent','good','fair','poor','retired'];
    const mapped = importRows
      .filter(r => r.name && r.purchase_date && r.purchase_cost)
      .map(r => {
        const cat = catMap.get((r.category ?? '').toLowerCase());
        const condition = validConditions.includes(r.condition?.toLowerCase()) ? r.condition.toLowerCase() as AssetCondition : 'good';
        return {
          name: r.name,
          category_id: cat?.id ?? null,
          serial_number: r.serial_number || null,
          purchase_date: r.purchase_date,
          purchase_cost: Number(r.purchase_cost) || 0,
          condition,
          location: r.location || null,
          notes: r.notes || null,
          useful_life_years: Number(r.useful_life_years) || cat?.default_useful_life_years || 5,
          residual_value_percent: Number(r.residual_value_percent) || Number(cat?.residual_value_percent ?? 0),
        };
      });
    if (mapped.length === 0) { toast.error('Gecerli satir yok. Gerekli: name, purchase_date, purchase_cost'); return; }
    try {
      await bulkCreate.mutateAsync(mapped);
      toast.success(`${mapped.length} varlik ice aktarildi`);
      setImportDialogOpen(false); setImportRows([]);
    } catch { toast.error('Varliklar ice aktarilamadi'); }
  };

  const assetsWithDep = useMemo(() => (assets ?? []).map(a => ({
    ...a,
    dep: calculateDepreciation(Number(a.purchase_cost), a.purchase_date, a.useful_life_years, Number(a.residual_value_percent)),
  })), [assets]);

  // Cost summary stats
  const costSummary = useMemo(() => {
    const list = assetsWithDep;
    const totalPurchase = list.reduce((s, a) => s + Number(a.purchase_cost), 0);
    const totalCurrent = list.reduce((s, a) => s + a.dep.currentValue, 0);
    const totalDep = list.reduce((s, a) => s + a.dep.totalDepreciation, 0);
    const avgDepPct = list.length > 0
      ? Math.round(list.reduce((s, a) => s + a.dep.percentDepreciated, 0) / list.length)
      : 0;
    return { totalPurchase, totalCurrent, totalDep, avgDepPct };
  }, [assetsWithDep]);

  const filtered = useMemo(() => {
    let result = assetsWithDep;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.serial_number?.toLowerCase().includes(q) ?? false) ||
        (a.location?.toLowerCase().includes(q) ?? false) ||
        (a.asset_categories?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterCategory !== 'all') result = result.filter(a => a.category_id === filterCategory);
    if (filterCondition !== 'all') result = result.filter(a => a.condition === filterCondition);
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'category': cmp = (a.asset_categories?.name ?? '').localeCompare(b.asset_categories?.name ?? ''); break;
        case 'condition': cmp = a.condition.localeCompare(b.condition); break;
        case 'purchase_date': cmp = a.purchase_date.localeCompare(b.purchase_date); break;
        case 'current_value': cmp = a.dep.currentValue - b.dep.currentValue; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [assetsWithDep, search, filterCategory, filterCondition, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? null : sortDir === 'asc' ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />;

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(a => a.id)));

  const handleBulkAssign = async () => {
    if (!bulkEmployee || selected.size === 0) return;
    setBulkAssigning(true);
    try {
      for (const assetId of selected) {
        await assignAsset.mutateAsync({ asset_id: assetId, employee_id: bulkEmployee });
      }
      toast.success(`${selected.size} varlik atandi`);
      setSelected(new Set()); setBulkDialogOpen(false); setBulkEmployee('');
    } catch { toast.error('Bazi varliklar atanamadi'); }
    finally { setBulkAssigning(false); }
  };

  const fmtCurrency = (v: number) =>
    v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Varliklar</h1>
        <div className="grid grid-cols-3 sm:flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!assets?.length}>
            <Download className="mr-1 h-4 w-4" />Disa Aktar
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />Ice Aktar
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          <Link to="/assets/new">
            <Button size="sm" className="w-full"><Plus className="mr-1 h-4 w-4" />Varlik Ekle</Button>
          </Link>
        </div>
      </div>

      {/* Cost summary cards */}
      {!isLoading && assetsWithDep.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-emerald-500/10 p-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Toplam Alis Maliyeti</p>
                <p className="text-lg font-bold truncate">{fmtCurrency(costSummary.totalPurchase)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-primary/10 p-2">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Toplam Guncel Deger</p>
                <p className="text-lg font-bold truncate">{fmtCurrency(costSummary.totalCurrent)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-amber-500/10 p-2">
                <TrendingDown className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Toplam Amortsman</p>
                <p className="text-lg font-bold truncate">{fmtCurrency(costSummary.totalDep)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-violet-500/10 p-2">
                <Percent className="h-5 w-5 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Ort. Amortsman %</p>
                <p className="text-lg font-bold">%{costSummary.avgDepPct}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Varlik ara..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={v => { setFilterCategory(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum Kategoriler</SelectItem>
            {(categories ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCondition} onValueChange={v => { setFilterCondition(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum Durumlar</SelectItem>
            {(['excellent','good','fair','poor','retired'] as const).map(c => (
              <SelectItem key={c} value={c}>{CONDITION_LABELS_TR[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-md border bg-accent p-3">
          <span className="text-sm font-medium">{selected.size} secili</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setBulkDialogOpen(true)}><UserPlus className="mr-1 h-4 w-4" />Secilenleri Ata</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="mr-1 h-4 w-4" />Temizle</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">Varlik bulunamadi</p>
          <Link to="/assets/new" className="mt-2">
            <Button variant="outline" size="sm">Ilk varligini ekle</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={paginated.length > 0 && selected.size === paginated.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>Ad<SortIcon col="name" /></TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort('category')}>Kategori<SortIcon col="category" /></TableHead>
                  <TableHead className="hidden sm:table-cell cursor-pointer select-none" onClick={() => handleSort('condition')}>Durum<SortIcon col="condition" /></TableHead>
                  <TableHead className="hidden lg:table-cell">Konum</TableHead>
                  <TableHead className="hidden lg:table-cell">Sorumlu</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('current_value')}>Guncel Deger<SortIcon col="current_value" /></TableHead>
                  <TableHead className="hidden md:table-cell w-28">Amortsman</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(asset => {
                  const catColor = asset.category_id ? categoryColorMap.get(asset.category_id) : undefined;
                  const responsible = assignmentMap.get(asset.id);
                  return (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(asset.id)} onCheckedChange={() => toggleSelect(asset.id)} />
                      </TableCell>
                      <TableCell>
                        <Link to={`/assets/${asset.id}`} className="font-medium text-foreground hover:text-primary">{asset.name}</Link>
                        {asset.serial_number && <span className="ml-2 font-mono text-xs text-muted-foreground">{asset.serial_number}</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {asset.asset_categories?.name ? (
                          <Badge className={`text-xs border ${catColor ?? 'bg-muted text-muted-foreground border-border'}`}>
                            {asset.asset_categories.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={`text-xs border ${CONDITION_COLORS[asset.condition]}`}>{CONDITION_LABELS_TR[asset.condition]}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{asset.location ?? '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{responsible ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{fmtCurrency(asset.dep.currentValue)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Progress value={asset.dep.percentDepreciated} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-8 text-right">%{asset.dep.percentDepreciated}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{filtered.length} varlik · Sayfa {page + 1} / {totalPages}</p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" />Onceki</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sonraki<ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected.size} varlik ata</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Calisan</Label>
              <Select value={bulkEmployee} onValueChange={setBulkEmployee}>
                <SelectTrigger><SelectValue placeholder="Calisan sec" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}{e.department ? ` — ${e.department}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleBulkAssign} disabled={!bulkEmployee || bulkAssigning} className="w-full">
              {bulkAssigning ? 'Ataniyor...' : `${selected.size} varlik ata`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Varlik Ice Aktar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {importRows.length} satir bulundu. Gerekli: <strong>name, purchase_date, purchase_cost</strong>.
            </p>
            <Button onClick={handleImportConfirm} disabled={bulkCreate.isPending} className="w-full">
              {bulkCreate.isPending ? 'Ice aktariliyor...' : `${importRows.length} varlik ice aktar`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
