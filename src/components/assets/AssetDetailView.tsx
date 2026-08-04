import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAsset, useAssetAssignments, useCurrentAssignment, useAssignAsset, useUnassignAsset, useArchiveAsset, useEmployees } from '@/lib/assets-hooks';
import { calculateDepreciation, CONDITION_LABELS, CONDITION_COLORS } from '@/lib/assets-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserPlus, UserMinus, Archive, Calendar, DollarSign, MapPin, Hash, Pencil } from 'lucide-react';
import { format, addYears, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function generateDepreciationData(purchaseCost: number, purchaseDate: string, usefulLifeYears: number, residualPercent: number) {
  const purchase = new Date(purchaseDate);
  const endDate = addYears(purchase, usefulLifeYears);
  const residualValue = purchaseCost * (residualPercent / 100);
  const depreciableAmount = purchaseCost - residualValue;
  const totalDays = differenceInDays(endDate, purchase);
  const points = 12;
  const data = [];
  for (let i = 0; i <= points; i++) {
    const fraction = i / points;
    const days = Math.round(fraction * totalDays);
    const date = new Date(purchase.getTime() + days * 86400000);
    const depFraction = Math.min(1, days / totalDays);
    const value = Math.max(residualValue, purchaseCost - depreciableAmount * depFraction);
    data.push({ date: format(date, 'MMM yyyy'), value: Math.round(value) });
  }
  return data;
}

export function AssetDetailView({ assetId }: { assetId: string }) {
  const navigate = useNavigate();
  const { data: asset, isLoading } = useAsset(assetId);
  const { data: assignments } = useAssetAssignments(assetId);
  const { data: currentAssignment } = useCurrentAssignment(assetId);
  const { data: employees } = useEmployees();
  const assignAsset = useAssignAsset();
  const unassignAsset = useUnassignAsset();
  const archiveAsset = useArchiveAsset();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!asset) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Asset not found</p>
      <Link to="/assets"><Button variant="outline" className="mt-4">Back to assets</Button></Link>
    </div>
  );

  const dep = calculateDepreciation(Number(asset.purchase_cost), asset.purchase_date, asset.useful_life_years, Number(asset.residual_value_percent));
  const depChartData = generateDepreciationData(Number(asset.purchase_cost), asset.purchase_date, asset.useful_life_years, Number(asset.residual_value_percent));

  const handleAssign = async () => {
    if (!selectedEmployee) return;
    try {
      await assignAsset.mutateAsync({ asset_id: assetId, employee_id: selectedEmployee, notes: assignNotes || null });
      toast.success('Asset assigned');
      setAssignDialogOpen(false); setSelectedEmployee(''); setAssignNotes('');
    } catch { toast.error('Failed to assign asset'); }
  };

  const handleUnassign = async () => {
    if (!currentAssignment) return;
    try {
      await unassignAsset.mutateAsync({ assignmentId: currentAssignment.id, assetId });
      toast.success('Asset unassigned');
    } catch { toast.error('Failed to unassign asset'); }
  };

  const handleArchive = async () => {
    try { await archiveAsset.mutateAsync(assetId); toast.success('Asset archived'); navigate('/assets'); }
    catch { toast.error('Failed to archive asset'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <Link to="/assets"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{asset.name}</h1>
          {asset.serial_number && <p className="font-mono text-sm text-muted-foreground truncate">{asset.serial_number}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/assets/${assetId}/edit`}>
            <Button variant="outline" size="sm"><Pencil className="mr-1 h-4 w-4" />Edit</Button>
          </Link>
          <Badge className={`border ${CONDITION_COLORS[asset.condition]}`}>{CONDITION_LABELS[asset.condition]}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Purchase cost" value={`$${Number(asset.purchase_cost).toLocaleString()}`} />
            <InfoRow icon={<Calendar className="h-4 w-4" />} label="Purchase date" value={format(new Date(asset.purchase_date), 'MMM d, yyyy')} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location" value={asset.location ?? '—'} />
            <InfoRow icon={<Hash className="h-4 w-4" />} label="Category" value={asset.asset_categories?.name ?? '—'} />
            {asset.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{asset.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Depreciation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Current value</p>
                <p className="text-xl font-bold font-mono">${dep.currentValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Depreciation</p>
                <p className="text-xl font-bold font-mono text-destructive">${dep.totalDepreciation.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${100 - dep.percentDepreciated}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {dep.percentDepreciated}% depreciated · {asset.useful_life_years} year useful life
              {dep.isFullyDepreciated && ' · Fully depreciated'}
            </p>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={depChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Value']} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-base">Assignment</CardTitle>
          <div className="flex gap-2">
            {currentAssignment ? (
              <Button variant="outline" size="sm" onClick={handleUnassign} disabled={unassignAsset.isPending}>
                <UserMinus className="mr-1 h-4 w-4" />Unassign
              </Button>
            ) : (
              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><UserPlus className="mr-1 h-4 w-4" />Assign</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign asset</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Employee</Label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                        <SelectContent>
                          {(employees ?? []).map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}{e.department ? ` — ${e.department}` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Input value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="e.g. Onboarding" />
                    </div>
                    <Button onClick={handleAssign} disabled={!selectedEmployee || assignAsset.isPending} className="w-full">
                      {assignAsset.isPending ? 'Assigning...' : 'Assign'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentAssignment ? (
            <div className="rounded-md bg-accent p-3">
              <p className="text-sm font-medium">Currently assigned to <span className="text-primary">{currentAssignment.employees?.name}</span></p>
              <p className="text-xs text-muted-foreground">
                Since {format(new Date(currentAssignment.assigned_date), 'MMM d, yyyy')}
                {currentAssignment.notes && ` · ${currentAssignment.notes}`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not currently assigned</p>
          )}
        </CardContent>
      </Card>

      {(assignments ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Assignment history</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(assignments ?? []).map(a => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p>
                      <span className="font-medium">{a.employees?.name}</span>{' '}
                      <span className="text-muted-foreground">
                        {format(new Date(a.assigned_date), 'MMM d, yyyy')}
                        {a.returned_date ? ` → ${format(new Date(a.returned_date), 'MMM d, yyyy')}` : ' → Present'}
                      </span>
                    </p>
                    {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive"><Archive className="mr-1 h-4 w-4" />Archive asset</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive this asset?</AlertDialogTitle>
              <AlertDialogDescription>This will remove it from the active asset list.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm text-muted-foreground sm:w-28">{label}</span>
      </div>
      <span className="text-sm font-medium pl-6 sm:pl-0">{value}</span>
    </div>
  );
}
