import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAssets, useCategories, useEmployees, useAssignAsset, useBulkCreateAssets, useAllActiveAssignments } from '@/lib/assets-hooks';
import { calculateDepreciation, CONDITION_LABELS, CONDITION_COLORS } from '@/lib/assets-types';
import type { AssetCondition } from '@/lib/assets-types';
import { exportToCsv, parseCsvFile } from '@/lib/csv-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  UserPlus, X, Download, Upload, LayoutGrid, List, Package,
  TrendingDown, DollarSign, BarChart3, User,
} from 'lucide-react';
import { toast } from 'sonner';

type SortKey = 'name' | 'category' | 'condition' | 'purchase_date' | 'current_value' | 'purchase_cost' | 'assigned_to';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';

const PAGE_SIZE = 50;

const CONDITION_BADGE_COLORS: Record<AssetCondition, string> = {
  excellent: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  good: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  fair: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  poor: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  retired: 'bg-muted text-muted-foreground border-border',
};

const CONDITION_LABELS_TR: Record<AssetCondition, string> = {
  excellent: 'Yeni',
  good: 'Iyi',
  fair: 'Orta',
  poor: 'Kotu',
  retired: 'Emekli',
};

const CATEGORY_BADGE_COLORS = [
  'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
  'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  'bg-lime-500/15 text-lime-600 dark:text-lime-400 border-lime-500/30',
];

const CATEGORY_BAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-teal-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-lime-500',
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);
}

export function AssetsListView() {
  const { data: assets, isLoading } = useAssets();
  const { data: categories } = useCategories();
  const { data: employees } = useEmployees();
  const { data: activeAssignments } = useAllActiveAssignments();
  const assignAsset = useAssignAsset();
  const bulkCreate = useBulkCreateAssets();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkEmployee, setBulkEmployee] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build a map: asset_id -> employee name
  const assignmentMap = useMemo(() => {
    const m = new Map<string, string>();
    (activeAssignments ?? []).forEach(a => {
      if (a.employees?.name) m.set(a.asset_id, a.employees.name);
    });
    return m;
  }, [activeAssignments]);

  const handleExport = () => {
    const rows = (assets ?? []).map(a => [
      a.name, a.asset_categories?.name ?? '', a.serial_number ?? '',
      a.purchase_date, a.purchase_cost, a.condition, a.location ?? '',
      a.useful_life_years, a.residual_value_percent, a.notes ?? '',
      assignmentMap.get(a.id) ?? '',
    ]);
    exportToCsv('assets.csv', ['name','category','serial_number','purchase_date','purchase_cost','condition','location','useful_life_years','residual_value_percent','notes','assigned_to'], rows);
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
    if (mapped.length === 0) { toast.error('Gecerli satir bulunamadi. Gerekli: name, purchase_date, purchase_cost'); return; }
    try {
      await bulkCreate.mutateAsync(mapped);
      toast.success(`${mapped.length} varlik iceri aktarildi`);
      setImportDialogOpen(false); setImportRows([]);
    } catch { toast.error('Varliklar iceri aktarilamadi'); }
  };

  const assetsWithDep = useMemo(() => (assets ?? []).map(a => ({
    ...a,
    dep: calculateDepreciation(Number(a.purchase_cost), a.purchase_date, a.useful_life_years, Number(a.residual_value_percent)),
    assignedTo: assignmentMap.get(a.id) ?? null,
  })), [assets, assignmentMap]);

  // --- Summary stats ---
  const stats = useMemo(() => {
    const totalCount = assetsWithDep.length;
    const totalCost = assetsWithDep.reduce((s, a) => s + Number(a.purchase_cost), 0);
    const totalCurrentValue = assetsWithDep.reduce((s, a) => s + a.dep.currentValue, 0);
    const totalDepreciation = assetsWithDep.reduce((s, a) => s + a.dep.totalDepreciation, 0);
    const conditionCounts: Record<AssetCondition, number> = { excellent: 0, good: 0, fair: 0, poor: 0, retired: 0 };
    assetsWithDep.forEach(a => { conditionCounts[a.condition]++; });
    const categoryCounts: { name: string; count: number }[] = [];
    const catCountMap = new Map<string, number>();
    assetsWithDep.forEach(a => {
      const catName = a.asset_categories?.name ?? 'Kategorisiz';
      catCountMap.set(catName, (catCountMap.get(catName) ?? 0) + 1);
    });
    catCountMap.forEach((count, name) => categoryCounts.push({ name, count }));
    categoryCounts.sort((a, b) => b.count - a.count);
    return { totalCount, totalCost, totalCurrentValue, totalDepreciation, conditionCounts, categoryCounts };
  }, [assetsWithDep]);

  const filtered = useMemo(() => {
    let result = assetsWithDep;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.serial_number?.toLowerCase().includes(q) ?? false) ||
        (a.location?.toLowerCase().includes(q) ?? false) ||
        (a.asset_categories?.name?.toLowerCase().includes(q) ?? false) ||
        (a.assignedTo?.toLowerCase().includes(q) ?? false)
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
        case 'purchase_cost': cmp = Number(a.purchase_cost) - Number(b.purchase_cost); break;
        case 'assigned_to': cmp = (a.assignedTo ?? '').localeCompare(b.assignedTo ?? ''); break;
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

  // Category color helper
  const categoryColorIndex = useMemo(() => {
    const m = new Map<string, number>();
    (categories ?? []).forEach((c, i) => m.set(c.id, i % CATEGORY_BADGE_COLORS.length));
    return m;
  }, [categories]);

  const getCatBadgeColor = (catId: string | null) =>
    catId ? CATEGORY_BADGE_COLORS[categoryColorIndex.get(catId) ?? 0] : 'bg-muted text-muted-foreground border-border';

  const getCatBarColor = (idx: number) => CATEGORY_BAR_COLORS[idx % CATEGORY_BAR_COLORS.length];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Varliklar</h1>
        <div className="grid grid-cols-3 sm:flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!assets?.length}>
            <Download className="mr-1 h-4 w-4" />Disa Aktar
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />Iceri Aktar
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          <Link to="/assets/new">
            <Button size="sm" className="w-full"><Plus className="mr-1 h-4 w-4" />Yeni Varlik</Button>
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && assetsWithDep.length > 0 && (
        <div className="space-y-4">
          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2.5">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Varlik</p>
                  <p className="text-xl font-bold">{stats.totalCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2.5">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalCost)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2.5">
                  <BarChart3 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guncel Deger</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalCurrentValue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2.5">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Amortisman</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalDepreciation)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Condition breakdown + Category distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Condition breakdown */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">Durum Dagilimi</p>
                <div className="flex flex-wrap gap-2">
                  {(['excellent','good','fair','poor','retired'] as AssetCondition[]).map(c => (
                    <button
                      key={c}
                      onClick={() => { setFilterCondition(filterCondition === c ? 'all' : c); setPage(0); }}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-all',
                        CONDITION_BADGE_COLORS[c],
                        filterCondition === c && 'ring-2 ring-offset-1 ring-offset-background ring-primary',
                      )}
                    >
                      <span className="font-semibold">{stats.conditionCounts[c]}</span>
                      <span>{CONDITION_LABELS_TR[c]}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category distribution bar chart */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">Kategori Dagilimi</p>
                <div className="space-y-2">
                  {stats.categoryCounts.slice(0, 6).map((cat, i) => {
                    const pct = stats.totalCount > 0 ? Math.round((cat.count / stats.totalCount) * 100) : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 truncate" title={cat.name}>{cat.name}</span>
                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', getCatBarColor(i))}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-12 text-right">{cat.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                  {stats.categoryCounts.length === 0 && (
                    <p className="text-xs text-muted-foreground">Kategori bulunamadi</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Varlik, seri no, konum, sorumlu ara..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={v => { setFilterCategory(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum Kategoriler</SelectItem>
            {(categories ?? []).map(c => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span className={cn('inline-block w-2 h-2 rounded-full', getCatBarColor(categoryColorIndex.get(c.id) ?? 0))} />
                  {c.name}
                </span>
              </SelectItem>
            ))}
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
        <div className="flex border rounded-md overflow-hidden">
          <button
            className={cn('px-2.5 py-1.5 transition-colors', viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent')}
            onClick={() => setViewMode('table')}
            title="Tablo gorunumu"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            className={cn('px-2.5 py-1.5 transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent')}
            onClick={() => setViewMode('grid')}
            title="Kart gorunumu"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-md border bg-accent p-3">
          <span className="text-sm font-medium">{selected.size} secili</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setBulkDialogOpen(true)}><UserPlus className="mr-1 h-4 w-4" />Secilenleri Ata</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="mr-1 h-4 w-4" />Temizle</Button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">Varlik bulunamadi</p>
          <Link to="/assets/new" className="mt-2">
            <Button variant="outline" size="sm">Ilk varliginizi ekleyin</Button>
          </Link>
        </div>
      ) : viewMode === 'table' ? (
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
                  <TableHead className="hidden xl:table-cell cursor-pointer select-none" onClick={() => handleSort('assigned_to')}>Sorumlu Kisi<SortIcon col="assigned_to" /></TableHead>
                  <TableHead className="hidden lg:table-cell">Konum</TableHead>
                  <TableHead className="text-right hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('purchase_cost')}>Maliyet<SortIcon col="purchase_cost" /></TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('current_value')}>Guncel Deger<SortIcon col="current_value" /></TableHead>
                  <TableHead className="hidden xl:table-cell w-32">Amortisman</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(asset => (
                  <TableRow key={asset.id} className={cn(selected.has(asset.id) && 'bg-accent/50')}>
                    <TableCell>
                      <Checkbox checked={selected.has(asset.id)} onCheckedChange={() => toggleSelect(asset.id)} />
                    </TableCell>
                    <TableCell>
                      <Link to={`/assets/${asset.id}`} className="font-medium text-foreground hover:text-primary">{asset.name}</Link>
                      {asset.serial_number && <span className="ml-2 font-mono text-xs text-muted-foreground">{asset.serial_number}</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {asset.asset_categories?.name ? (
                        <Badge variant="outline" className={cn('text-xs', getCatBadgeColor(asset.category_id))}>
                          {asset.asset_categories.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={cn('text-xs', CONDITION_BADGE_COLORS[asset.condition])}>
                        {CONDITION_LABELS_TR[asset.condition]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {asset.assignedTo ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {asset.assignedTo}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Atanmamis</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{asset.location ?? '--'}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell font-mono text-sm">{formatCurrency(Number(asset.purchase_cost))}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(asset.dep.currentValue)}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <Progress value={asset.dep.percentDepreciated} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8 text-right">%{asset.dep.percentDepreciated}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{filtered.length} varlik - Sayfa {page + 1} / {totalPages}</p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" />Onceki</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sonraki<ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Grid / Card View */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginated.map(asset => (
              <Card key={asset.id} className={cn('transition-shadow hover:shadow-md', selected.has(asset.id) && 'ring-2 ring-primary')}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <Checkbox checked={selected.has(asset.id)} onCheckedChange={() => toggleSelect(asset.id)} className="mt-1" />
                      <div className="min-w-0">
                        <Link to={`/assets/${asset.id}`} className="font-medium text-foreground hover:text-primary block truncate">{asset.name}</Link>
                        {asset.serial_number && <p className="font-mono text-xs text-muted-foreground truncate">{asset.serial_number}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-xs shrink-0', CONDITION_BADGE_COLORS[asset.condition])}>
                      {CONDITION_LABELS_TR[asset.condition]}
                    </Badge>
                  </div>

                  {asset.asset_categories?.name && (
                    <Badge variant="outline" className={cn('text-xs', getCatBadgeColor(asset.category_id))}>
                      {asset.asset_categories.name}
                    </Badge>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Maliyet</p>
                      <p className="font-mono font-medium">{formatCurrency(Number(asset.purchase_cost))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Guncel Deger</p>
                      <p className="font-mono font-medium">{formatCurrency(asset.dep.currentValue)}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Amortisman</span>
                      <span>%{asset.dep.percentDepreciated}</span>
                    </div>
                    <Progress value={asset.dep.percentDepreciated} className="h-2" />
                  </div>

                  {asset.assignedTo ? (
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{asset.assignedTo}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Atanmamis</p>
                  )}

                  {asset.location && (
                    <p className="text-xs text-muted-foreground truncate" title={asset.location}>{asset.location}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{filtered.length} varlik - Sayfa {page + 1} / {totalPages}</p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" />Onceki</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sonraki<ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected.size} varligi ata</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Calisan</Label>
              <Select value={bulkEmployee} onValueChange={setBulkEmployee}>
                <SelectTrigger><SelectValue placeholder="Calisan secin" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}{e.department ? ` - ${e.department}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleBulkAssign} disabled={!bulkEmployee || bulkAssigning} className="w-full">
              {bulkAssigning ? 'Ataniyor...' : `${selected.size} varligi ata`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Varliklari Iceri Aktar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {importRows.length} satir bulundu. Gerekli alanlar: <strong>name, purchase_date, purchase_cost</strong>.
            </p>
            <Button onClick={handleImportConfirm} disabled={bulkCreate.isPending} className="w-full">
              {bulkCreate.isPending ? 'Iceri aktariliyor...' : `${importRows.length} varligi iceri aktar`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
