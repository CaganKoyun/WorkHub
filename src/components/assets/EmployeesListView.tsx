import { useState, useRef } from 'react';
import { useEmployees, useCreateEmployee, useDeleteEmployee, useUpdateEmployee, useBulkCreateEmployees } from '@/lib/assets-hooks';
import { exportToCsv, parseCsvFile } from '@/lib/csv-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Pencil, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleExport = () => {
    const rows = (employees ?? []).map(e => [e.name, e.department ?? '', e.email ?? '']);
    exportToCsv('employees.csv', ['name', 'department', 'email'], rows);
    toast.success('Employees exported');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setImportRows(await parseCsvFile(file)); setImportDialogOpen(true); }
    catch { toast.error('Failed to parse CSV file'); }
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    const mapped = importRows.filter(r => r.name).map(r => ({ name: r.name, department: r.department || null, email: r.email || null }));
    if (mapped.length === 0) { toast.error('No valid rows. Required: name'); return; }
    try { await bulkCreate.mutateAsync(mapped); toast.success(`${mapped.length} employee(s) imported`); setImportDialogOpen(false); setImportRows([]); }
    catch { toast.error('Failed to import employees'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEmployee.mutateAsync({ name, department: department || null, email: email || null });
      toast.success('Employee added');
      setDialogOpen(false); setName(''); setDepartment(''); setEmail('');
    } catch { toast.error('Failed to add employee'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteEmployee.mutateAsync(id); toast.success('Employee removed'); }
    catch { toast.error('Failed to remove employee'); }
  };

  const openEdit = (emp: { id: string; name: string; department: string | null; email: string | null }) => {
    setEditId(emp.id); setEditName(emp.name); setEditDepartment(emp.department ?? ''); setEditEmail(emp.email ?? '');
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateEmployee.mutateAsync({ id: editId, name: editName, department: editDepartment || null, email: editEmail || null });
      toast.success('Employee updated'); setEditDialogOpen(false);
    } catch { toast.error('Failed to update employee'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Employees</h1>
        <div className="grid grid-cols-3 sm:flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!employees?.length}><Download className="mr-1 h-4 w-4" />Export</Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-1 h-4 w-4" />Import</Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Add employee</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add employee</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Smith" /></div>
                <div className="space-y-2"><Label>Department</Label><Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Engineering" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" /></div>
                <Button type="submit" className="w-full" disabled={createEmployee.isPending}>{createEmployee.isPending ? 'Adding...' : 'Add employee'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (employees ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No employees yet</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setDialogOpen(true)}>Add your first employee</Button>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Department</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(employees ?? []).map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{emp.department ?? '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{emp.email ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove employee?</AlertDialogTitle>
                            <AlertDialogDescription>This will also remove their assignment history.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(emp.id)}>Remove</AlertDialogAction>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit employee</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={editName} onChange={e => setEditName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Department</Label><Input value={editDepartment} onChange={e => setEditDepartment(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={updateEmployee.isPending}>{updateEmployee.isPending ? 'Saving...' : 'Save changes'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import employees</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {importRows.length} row(s) found. Required: <strong>name</strong>. Optional: department, email.
            </p>
            <Button onClick={handleImportConfirm} disabled={bulkCreate.isPending} className="w-full">
              {bulkCreate.isPending ? 'Importing...' : `Import ${importRows.length} employee(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
