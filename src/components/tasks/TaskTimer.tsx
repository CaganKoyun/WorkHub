import { useState } from 'react';
import {
  useActiveTimer, useStartTimer, useStopTimer, useAddManualEntry,
  useTimeEntriesForTask, useDeleteTimeEntry,
  useElapsedSeconds, formatSeconds, formatHMS,
} from '@/lib/time-tracking-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Square, Plus, Timer, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
  taskId: string;
}

function ManualEntryDialog({ open, onOpenChange, taskId }: {
  open: boolean; onOpenChange: (o: boolean) => void; taskId: string;
}) {
  const add = useAddManualEntry();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [note, setNote] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startISO = new Date(`${date}T${start}`).toISOString();
      const endISO = new Date(`${date}T${end}`).toISOString();
      if (new Date(endISO) <= new Date(startISO)) {
        toast.error('Bitiş başlangıçtan sonra olmalı');
        return;
      }
      await add.mutateAsync({ task_id: taskId, started_at: startISO, ended_at: endISO, note });
      toast.success('Süre eklendi');
      setNote('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Süre ekle</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tarih</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Başlangıç</Label>
              <Input type="time" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bitiş</Label>
              <Input type="time" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Not (opsiyonel)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ne yaptın?" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={add.isPending}>Ekle</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskTimer({ taskId }: Props) {
  const { data: active } = useActiveTimer();
  const { data: entries } = useTimeEntriesForTask(taskId);
  const start = useStartTimer();
  const stop = useStopTimer();
  const del = useDeleteTimeEntry();
  const [manualOpen, setManualOpen] = useState(false);

  const isMyTimerHere = active?.task_id === taskId;
  const elapsed = useElapsedSeconds(isMyTimerHere ? active?.started_at : null);

  const totalDone = (entries ?? [])
    .filter(e => e.duration_seconds != null)
    .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Timer className="h-3 w-3" /> Süre takibi
          {totalDone > 0 && (
            <span className="ml-1 font-mono normal-case tabular-nums text-muted-foreground/70">
              {formatSeconds(totalDone)} kaydedildi
            </span>
          )}
        </h4>
        <div className="flex items-center gap-1">
          {isMyTimerHere ? (
            <Button size="sm" variant="destructive" onClick={() => stop.mutate()} className="h-7 gap-1.5 text-[12px]">
              <Square className="h-3 w-3" /> Durdur · {formatHMS(elapsed)}
            </Button>
          ) : (
            <Button size="sm" onClick={() => start.mutate({ task_id: taskId })} className="h-7 gap-1.5 text-[12px]">
              <Play className="h-3 w-3" /> Timer başlat
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setManualOpen(true)} className="h-7 gap-1 text-[11.5px]">
            <Plus className="h-3 w-3" /> Manuel
          </Button>
        </div>
      </div>

      {(entries?.length ?? 0) > 0 ? (
        <div className="rounded-md border border-border/60 overflow-hidden divide-y divide-border/60">
          {(entries ?? []).slice(0, 6).map(e => (
            <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-[12px] group">
              <span className="font-mono tabular-nums text-muted-foreground w-14">
                {e.duration_seconds != null ? formatHMS(e.duration_seconds) : '● live'}
              </span>
              <span className="text-muted-foreground truncate flex-1">
                {format(new Date(e.started_at), 'MMM d, HH:mm')}
                {e.note && <span className="ml-2 text-foreground/80">· {e.note}</span>}
              </span>
              <button
                type="button"
                className="h-5 w-5 grid place-items-center opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground"
                onClick={() => del.mutate(e.id)}
                title="Sil"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {(entries?.length ?? 0) > 6 && (
            <div className="px-3 py-1 text-[11px] text-muted-foreground">
              +{(entries?.length ?? 0) - 6} daha…
            </div>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground/70">Henüz süre kaydı yok.</p>
      )}

      <ManualEntryDialog open={manualOpen} onOpenChange={setManualOpen} taskId={taskId} />
    </section>
  );
}
