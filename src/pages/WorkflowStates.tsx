import { useState } from 'react';
import {
  useWorkflowStates, useCreateWorkflowState, useUpdateWorkflowState,
  useDeleteWorkflowState, useReorderWorkflowStates,
  CATEGORY_LABELS, CATEGORY_ORDER,
  type WorkflowStateCategory, type WorkflowState,
} from '@/lib/workflow-states-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_COLOR_HINT: Record<WorkflowStateCategory, string> = {
  backlog: '#8a8f98',
  unstarted: '#a1a1aa',
  started: '#f5a524',
  completed: '#5e6ad2',
  canceled: '#71717a',
};

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateWorkflowState();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WorkflowStateCategory>('unstarted');
  const [color, setColor] = useState('#a1a1aa');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await create.mutateAsync({
        name: name.trim(),
        key: name.trim().toLowerCase().replace(/\s+/g, '_'),
        category,
        color,
      });
      toast.success('Workflow state eklendi');
      setName('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Yeni workflow state</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Waiting on QA" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={v => {
              const c = v as WorkflowStateCategory;
              setCategory(c);
              setColor(CATEGORY_COLOR_HINT[c]);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map(c => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Metrikler, filtreler ve otomasyonlar bu kategorilere göre çalışır.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Renk</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-12 rounded border border-border bg-transparent cursor-pointer" />
              <span className="font-mono text-[11px] text-muted-foreground">{color}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending}>Ekle</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StateRow({
  state, canMoveUp, canMoveDown, onMove,
}: {
  state: WorkflowState;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
}) {
  const update = useUpdateWorkflowState();
  const del = useDeleteWorkflowState();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.name);
  const [color, setColor] = useState(state.color);

  const save = () => {
    update.mutate({ id: state.id, name: name.trim() || state.name, color });
    setEditing(false);
  };

  return (
    <div className="group flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0 hover:bg-sidebar-accent/30">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab" />
      {editing ? (
        <>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-5 w-6 rounded border border-border/60 bg-transparent cursor-pointer"
          />
          <Input value={name} onChange={e => setName(e.target.value)} className="h-7 text-[12.5px] flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') save(); }} />
          <Button size="sm" onClick={save} className="h-7 text-[11px]">Kaydet</Button>
          <Button size="sm" variant="ghost" onClick={() => { setName(state.name); setColor(state.color); setEditing(false); }} className="h-7 text-[11px]">İptal</Button>
        </>
      ) : (
        <>
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: state.color }} />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-[13px] font-medium hover:underline"
          >
            {state.name}
          </button>
          <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground rounded border border-border bg-secondary/40 px-1.5 py-0.5">
            {CATEGORY_LABELS[state.category]}
          </span>
          {state.is_default && (
            <span className="text-[10px] text-muted-foreground/60">default</span>
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveUp} onClick={() => onMove(-1)}>
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveDown} onClick={() => onMove(1)}>
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => {
                if (confirm(`"${state.name}" durumunu silmek istiyor musun?`)) {
                  del.mutate(state.id);
                }
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function WorkflowStates() {
  const { data: states, isLoading } = useWorkflowStates();
  const reorder = useReorderWorkflowStates();
  const [open, setOpen] = useState(false);

  const move = (index: number, dir: -1 | 1) => {
    if (!states) return;
    const list = [...states].sort((a, b) => a.position - b.position);
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const [a, b] = [list[index], list[target]];
    reorder.mutate([
      { id: a.id, position: b.position },
      { id: b.id, position: a.position },
    ]);
  };

  const grouped = (states ?? []).reduce<Record<WorkflowStateCategory, WorkflowState[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {} as any);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Workflow states</h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Ekibinin gerçek iş akışını yansıt. Her state bir kategoriye bağlıdır
            (backlog / unstarted / started / completed / canceled), metrikler
            ve otomasyonlar buna göre çalışır.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni state
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-9" />)}</div>
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.map(cat => {
            const list = (grouped[cat] ?? []).sort((a, b) => a.position - b.position);
            if (list.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="mb-1.5 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: CATEGORY_COLOR_HINT[cat] }}
                  />
                  {CATEGORY_LABELS[cat]}
                  <span className="font-mono tabular-nums text-muted-foreground/60">{list.length}</span>
                </h2>
                <div className="rounded-md border border-border/60 overflow-hidden">
                  {list.map((s, i) => (
                    <StateRow
                      key={s.id}
                      state={s}
                      canMoveUp={i > 0}
                      canMoveDown={i < list.length - 1}
                      onMove={(dir) => {
                        const globalList = (states ?? []).slice().sort((a, b) => a.position - b.position);
                        const globalIdx = globalList.findIndex(x => x.id === s.id);
                        move(globalIdx, dir);
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <CreateDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
