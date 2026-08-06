import { useState } from 'react';
import { useCycles, useCreateCycle, useCycleProgress } from '@/lib/cycles-hooks';
import { CYCLE_STATUS_LABELS, type Cycle, type CycleStatus } from '@/lib/cycles-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Calendar, Target, CheckCircle2, Play, Clock } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { toast } from 'sonner';

const STATUS_META: Record<CycleStatus, { icon: React.ElementType; className: string; label: string }> = {
  active:    { icon: Play,          className: 'text-[hsl(var(--status-in-progress))]', label: CYCLE_STATUS_LABELS.active },
  planned:   { icon: Clock,         className: 'text-muted-foreground',                 label: CYCLE_STATUS_LABELS.planned },
  completed: { icon: CheckCircle2,  className: 'text-[hsl(var(--status-done))]',        label: CYCLE_STATUS_LABELS.completed },
};

function CycleCard({ cycle }: { cycle: Cycle }) {
  const { data: progress } = useCycleProgress(cycle.id);
  const meta = STATUS_META[cycle.status];
  const total = progress?.total_tasks ?? 0;
  const done = progress?.done_tasks ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const start = new Date(cycle.start_date);
  const end = new Date(cycle.end_date);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-border">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <meta.icon className={`h-3.5 w-3.5 ${meta.className}`} />
            <span className={`text-[11px] font-medium uppercase tracking-wider ${meta.className}`}>
              {meta.label}
            </span>
            <span className="font-mono text-[10.5px] text-muted-foreground/70">#{cycle.number}</span>
          </div>
          <h3 className="text-[15px] font-semibold text-foreground truncate">{cycle.name}</h3>
          {cycle.goal && (
            <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2 flex items-center gap-1">
              <Target className="h-3 w-3 shrink-0" /> {cycle.goal}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(start, 'MMM d')} → {format(end, 'MMM d')}
        </span>
        {cycle.status === 'active' && daysLeft > 0 && (
          <span className="text-[hsl(var(--status-in-progress))]">
            {daysLeft} gün kaldı
          </span>
        )}
        {cycle.status === 'planned' && (
          <span>{formatDistanceToNowStrict(start, { addSuffix: true })}</span>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-muted-foreground">Progress</span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {done} / {total} <span className="opacity-60">({pct}%)</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {(progress?.total_points ?? 0) > 0 && (
          <div className="mt-1.5 text-[10.5px] text-muted-foreground font-mono tabular-nums">
            {progress?.done_points ?? 0} / {progress?.total_points ?? 0} points
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCycleDialog({ open, onOpenChange, nextNumber }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextNumber: number;
}) {
  const create = useCreateCycle();
  const [name, setName] = useState('');
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [goal, setGoal] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        name: name.trim() || `Cycle ${nextNumber}`,
        start_date: start,
        end_date: end,
        goal: goal.trim() || null,
        number: nextNumber,
      });
      toast.success('Cycle oluşturuldu');
      setName(''); setGoal('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Yeni cycle</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={`Cycle ${nextNumber}`} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Başlangıç</Label>
              <Input type="date" value={start} onChange={e => setStart(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Bitiş</Label>
              <Input type="date" value={end} onChange={e => setEnd(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hedef (opsiyonel)</Label>
            <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Bu cycle'da ne başaracağız?" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending}>Oluştur</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Cycles() {
  const { data: cycles, isLoading } = useCycles();
  const [createOpen, setCreateOpen] = useState(false);

  const grouped = {
    active:    (cycles ?? []).filter(c => c.status === 'active'),
    planned:   (cycles ?? []).filter(c => c.status === 'planned'),
    completed: (cycles ?? []).filter(c => c.status === 'completed'),
  };

  const nextNumber = ((cycles ?? []).reduce((m, c) => Math.max(m, c.number), 0)) + 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Cycles</h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Zaman-kutulu iş dilimleri. Bir cycle ekiplerin bir hafta / iki hafta boyunca odaklandığı şeydir.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni cycle
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-32" />)}</div>
      ) : (cycles?.length ?? 0) === 0 ? (
        <div className="rounded-md border border-border/60 py-16 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-[13px] text-muted-foreground">Henüz cycle yok. İlk cycle'ı oluştur, ekip odağını başlat.</p>
          <Button size="sm" className="mt-4 h-8" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> İlk cycle'ı oluştur
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {(['active', 'planned', 'completed'] as CycleStatus[]).map(s => {
            const list = grouped[s];
            if (list.length === 0) return null;
            const meta = STATUS_META[s];
            return (
              <section key={s}>
                <div className="mb-2 flex items-center gap-2">
                  <meta.icon className={`h-3.5 w-3.5 ${meta.className}`} />
                  <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {meta.label}
                  </h2>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">{list.length}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {list.map(c => <CycleCard key={c.id} cycle={c} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <CreateCycleDialog open={createOpen} onOpenChange={setCreateOpen} nextNumber={nextNumber} />
    </div>
  );
}
