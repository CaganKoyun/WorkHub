import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAssets, useCategories, useEmployees, useAssignAsset, useBulkCreateAssets } from '@/lib/assets-hooks';
import { calculateDepreciation, CONDITION_LABELS, CONDITION_COLORS } from '@/lib/assets-types';
import type { AssetCondition } from '@/lib/assets-types';
import { exportToCsv, parseCsvFile } from '@/lib/csv-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, UserPlus, X, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

type SortKey = 'name' | 'category' | 'condition' | 'purchase_date' | 'current_value';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;

export function AssetsListView() {
  const { data: assets, isLoading } = useAssets();
  const { data: categories } = useCategories();
  const { data: employees } = useEmployees();
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

  const handleExport = () => {
    const rows = (assets ?? []).map(a => [
      a.name, a.asset_categories?.name ?? '', a.serial_number ?? '',
      a.purchase_date, a.purchase_cost, a.condition, a.location ?? '',
      a.useful_life_years, a.residual_value_percent, a.notes ?? '',
    ]);
    exportToCsv('assets.csv', ['name','category','serial_number','purchase_date','purchase_cost','condition','location','useful_life_years','residual_value_percent','notes'], rows);
    toast.success('Assets exported');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseCsvFile(file);
      setImportRows(rows);
      setImportDialogOpen(true);
    } catch { toast.error('Failed to parse CSV file'); }
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
    if (mapped.length === 0) { toast.error('No valid rows. Required: name, purchase_date, purchase_cost'); return; }
    try {
      await bulkCreate.mutateAsync(mapped);
      toast.success(`${mapped.length} asset(s) imported`);
      setImportDialogOpen(false); setImportRows([]);
    } catch { toast.error('Failed to import assets'); }
  };

  const assetsWithDep = useMemo(() => (assets ?? []).map(a => ({
    ...a,
    dep: calculateDepreciation(Number(a.purchase_cost), a.purchase_date, a.useful_life_years, Number(a.residual_value_percent)),
  })), [assets]);

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
      toast.success(`${selected.size} asset(s) assigned`);
      setSelected(new Set()); setBulkDialogOpen(false); setBulkEmployee('');
    } catch { toast.error('Failed to assign some assets'); }
    finally { setBulkAssigning(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Assets</h1>
        <div className="grid grid-cols-3 sm:flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!assets?.length}>
            <Download className="mr-1 h-4 w-4" />Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />Import
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          <Link to="/assets/new">
            <Button size="sm" className="w-full"><Plus className="mr-1 h-4 w-4" />Add asset</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={v => { setFilterCategory(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCondition} onValueChange={v => { setFilterCondition(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Condition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All conditions</SelectItem>
            {(['excellent','good','fair','poor','retired'] as const).map(c => (
              <SelectItem key={c} value={c}>{CONDITION_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-md border bg-accent p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setBulkDialogOpen(true)}><UserPlus className="mr-1 h-4 w-4" />Assign selected</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="mr-1 h-4 w-4" />Clear</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No assets found</p>
          <Link to="/assets/new" className="mt-2">
            <Button variant="outline" size="sm">Add your first asset</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={paginated.length > 0 && selected.size === paginated.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>Name<SortIcon col="name" /></TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort('category')}>Category<SortIcon col="category" /></TableHead>
                  <TableHead className="hidden sm:table-cell cursor-pointer select-none" onClick={() => handleSort('condition')}>Condition<SortIcon col="condition" /></TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('current_value')}>Current value<SortIcon col="current_value" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(asset.id)} onCheckedChange={() => toggleSelect(asset.id)} />
                    </TableCell>
                    <TableCell>
                      <Link to={`/assets/${asset.id}`} className="font-medium text-foreground hover:text-primary">{asset.name}</Link>
                      {asset.serial_number && <span className="ml-2 font-mono text-xs text-muted-foreground">{asset.serial_number}</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{asset.asset_categories?.name ?? '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge className={`text-xs border ${CONDITION_COLORS[asset.condition]}`}>{CONDITION_LABELS[asset.condition]}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{asset.location ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono">${asset.dep.currentValue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{filtered.length} asset{filtered.length !== 1 ? 's' : ''} · Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next<ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign {selected.size} asset(s)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={bulkEmployee} onValueChange={setBulkEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}{e.department ? ` — ${e.department}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleBulkAssign} disabled={!bulkEmployee || bulkAssigning} className="w-full">
              {bulkAssigning ? 'Assigning...' : `Assign ${selected.size} asset(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import assets</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {importRows.length} row(s) found. Required: <strong>name, purchase_date, purchase_cost</strong>.
            </p>
            <Button onClick={handleImportConfirm} disabled={bulkCreate.isPending} className="w-full">
              {bulkCreate.isPending ? 'Importing...' : `Import ${importRows.length} asset(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
