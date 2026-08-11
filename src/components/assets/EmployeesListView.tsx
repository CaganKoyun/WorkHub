import { useState, useRef, useMemo } from 'react';
import { useEmployees, useCreateEmployee, useDeleteEmployee, useUpdateEmployee, useBulkCreateEmployees } from '@/lib/assets-hooks';
import { useObjectLinks } from '@/lib/graph-hooks';
import { LINKABLE_LABELS } from '@/lib/graph-types';
import type { LinkableType } from '@/lib/graph-types';
import { exportToCsv, parseCsvFile } from '@/lib/csv-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, Download, Upload, Search, LayoutGrid, List, Users, Building2, UserPlus, Link as LinkIcon, Eye } from 'lucide-react';
import { toast } from 'sonner';

/* ---- Avatar color from name ---- */
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-pink-500', 'bg-lime-600', 'bg-fuchsia-500',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* ---- Profile Sheet sub-component ---- */
function EmployeeProfileSheet({ employee, open, onOpenChange }: {
  employee: { id: string; name: string; department: string | null; email: string | null; created_at: string } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: links, isLoading: linksLoading } = useObjectLinks(
    employee ? 'employee' : undefined,
    employee?.id,
  );

  if (!employee) return null;

  const joinDate = new Date(employee.created_at).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Profil Detayi</SheetTitle>
          <SheetDescription className="sr-only">Calisan profil detaylari</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className={cn('flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white', avatarColor(employee.name))}>
            {initials(employee.name)}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">{employee.name}</h2>
            {employee.department && <Badge variant="secondary" className="mt-1">{employee.department}</Badge>}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <span className="text-muted-foreground font-medium">E-posta</span>
            <span>{employee.email ?? '—'}</span>
            <span className="text-muted-foreground font-medium">Departman</span>
            <span>{employee.department ?? '—'}</span>
            <span className="text-muted-foreground font-medium">Katilma Tarihi</span>
            <span>{joinDate}</span>
          </div>

          {/* Linked objects */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4" />
              Bagli Nesneler
            </h3>
            {linksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (links ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Bagli nesne bulunamadi.</p>
            ) : (
              <div className="space-y-1.5">
                {(links ?? []).map(link => {
                  const isFrom = link.from_type === 'employee' && link.from_id === employee.id;
                  const otherType = (isFrom ? link.to_type : link.from_type) as LinkableType;
                  const label = LINKABLE_LABELS[otherType] ?? otherType;
                  return (
                    <div key={link.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                      <Badge variant="outline" className="text-xs">{label}</Badge>
                      <span className="text-muted-foreground">{link.link_kind ?? 'iliskili'}</span>
                      {link.note && <span className="truncate text-xs text-muted-foreground">— {link.note}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned assets placeholder */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Zimmetli Varliklar</h3>
            <p className="text-sm text-muted-foreground">
              Zimmetli varlik bilgisi varlik yonetimi sayfasindan goruntulenebilir.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---- Main component ---- */
export function EmployeesListView() {
  const { data: employees, isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const updateEmployee = useUpdateEmployee();
  const bulkCreate = useBulkCreateEmployees();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [profileEmployee, setProfileEmployee] = useState<{
    id: string; name: string; department: string | null; email: string | null; created_at: string;
  } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Derived data
  const allDepartments = useMemo(() => {
    const deps = new Set<string>();
    (employees ?? []).forEach(e => { if (e.department) deps.add(e.department); });
    return Array.from(deps).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    let list = employees ?? [];
    if (departmentFilter !== 'all') {
      list = list.filter(e => e.department === departmentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.email && e.email.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [employees, departmentFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const all = employees ?? [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const recentHires = all.filter(e => new Date(e.created_at) >= thirtyDaysAgo).length;
    return {
      total: all.length,
      departments: new Set(all.map(e => e.department).filter(Boolean)).size,
      recentHires,
    };
  }, [employees]);

  const handleExport = () => {
    const rows = (employees ?? []).map(e => [e.name, e.department ?? '', e.email ?? '']);
    exportToCsv('employees.csv', ['name', 'department', 'email'], rows);
    toast.success('Calisanlar disari aktarildi');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setImportRows(await parseCsvFile(file)); setImportDialogOpen(true); }
    catch { toast.error('CSV dosyasi islenemedi'); }
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    const mapped = importRows.filter(r => r.name).map(r => ({ name: r.name, department: r.department || null, email: r.email || null }));
    if (mapped.length === 0) { toast.error('Gecerli satir yok. Gerekli: name'); return; }
    try { await bulkCreate.mutateAsync(mapped); toast.success(`${mapped.length} calisan ice aktarildi`); setImportDialogOpen(false); setImportRows([]); }
    catch { toast.error('Calisanlar ice aktarilamadi'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEmployee.mutateAsync({ name, department: department || null, email: email || null });
      toast.success('Calisan eklendi');
      setDialogOpen(false); setName(''); setDepartment(''); setEmail('');
    } catch { toast.error('Calisan eklenemedi'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteEmployee.mutateAsync(id); toast.success('Calisan silindi'); }
    catch { toast.error('Calisan silinemedi'); }
  };

  const openEdit = (emp: { id: string; name: string; department: string | null; email: string | null }) => {
    setEditId(emp.id); setEditName(emp.name); setEditDepartment(emp.department ?? ''); setEditEmail(emp.email ?? '');
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateEmployee.mutateAsync({ id: editId, name: editName, department: editDepartment || null, email: editEmail || null });
      toast.success('Calisan guncellendi'); setEditDialogOpen(false);
    } catch { toast.error('Calisan guncellenemedi'); }
  };

  const openProfile = (emp: { id: string; name: string; department: string | null; email: string | null; created_at: string }) => {
    setProfileEmployee(emp);
    setProfileOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Calisanlar</h1>
        <div className="grid grid-cols-3 sm:flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!employees?.length}>
            <Download className="mr-1 h-4 w-4" />Disa Aktar
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />Ice Aktar
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />Yeni Calisan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Calisan Ekle</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2"><Label>Isim *</Label><Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ahmet Yilmaz" /></div>
                <div className="space-y-2"><Label>Departman</Label><Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Muhendislik" /></div>
                <div className="space-y-2"><Label>E-posta</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmet@sirket.com" /></div>
                <Button type="submit" className="w-full" disabled={createEmployee.isPending}>{createEmployee.isPending ? 'Ekleniyor...' : 'Calisan Ekle'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && (employees ?? []).length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Toplam Calisan</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.departments}</p>
                <p className="text-xs text-muted-foreground">Departman</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.recentHires}</p>
                <p className="text-xs text-muted-foreground">Son 30 Gun</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & view toggle */}
      {!isLoading && (employees ?? []).length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Isim veya e-posta ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Departman" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum Departmanlar</SelectItem>
              {allDepartments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 border rounded-md p-0.5">
            <Button
              size="sm"
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (employees ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">Henuz calisan eklenmedi</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setDialogOpen(true)}>Ilk calisaninizi ekleyin</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">Aramanizla eslesen calisan bulunamadi</p>
        </div>
      ) : viewMode === 'card' ? (
        /* ---- Card / Grid view ---- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <Card key={emp.id} className="group relative">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', avatarColor(emp.name))}>
                    {initials(emp.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{emp.name}</h3>
                    {emp.department && (
                      <Badge variant="secondary" className="mt-1 text-xs">{emp.department}</Badge>
                    )}
                    {emp.email && (
                      <p className="mt-1 text-sm text-muted-foreground truncate">{emp.email}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openProfile(emp)}>
                    <Eye className="mr-1 h-3.5 w-3.5" />Profili Gor
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(emp)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Calisan silinsin mi?</AlertDialogTitle>
                        <AlertDialogDescription>Bu islem zimmet gecmisini de silecektir.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Iptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(emp.id)}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ---- List / Table view ---- */
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Isim</TableHead>
                <TableHead className="hidden sm:table-cell">Departman</TableHead>
                <TableHead className="hidden md:table-cell">E-posta</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', avatarColor(emp.name))}>
                        {initials(emp.name)}
                      </div>
                      <span className="font-medium">{emp.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{emp.department ?? '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{emp.email ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openProfile(emp)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(emp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Calisan silinsin mi?</AlertDialogTitle>
                            <AlertDialogDescription>Bu islem zimmet gecmisini de silecektir.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Iptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(emp.id)}>Sil</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Calisani Duzenle</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2"><Label>Isim *</Label><Input value={editName} onChange={e => setEditName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Departman</Label><Input value={editDepartment} onChange={e => setEditDepartment(e.target.value)} /></div>
            <div className="space-y-2"><Label>E-posta</Label><Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={updateEmployee.isPending}>{updateEmployee.isPending ? 'Kaydediliyor...' : 'Degisiklikleri Kaydet'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Calisanlari Ice Aktar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {importRows.length} satir bulundu. Gerekli: <strong>name</strong>. Opsiyonel: department, email.
            </p>
            <Button onClick={handleImportConfirm} disabled={bulkCreate.isPending} className="w-full">
              {bulkCreate.isPending ? 'Ice aktariliyor...' : `${importRows.length} calisan ice aktar`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile sheet */}
      <EmployeeProfileSheet
        employee={profileEmployee}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </div>
  );
}
