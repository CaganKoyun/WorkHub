import { useMemo, useState } from 'react';
import {
  useAutomations, useCreateAutomation, useUpdateAutomation, useDeleteAutomation,
  useAutomationRuns,
  TRIGGER_LABELS, FIELD_LABELS, OP_LABELS, ACTION_LABELS,
  type Automation, type TriggerKind, type ConditionField, type ConditionOp,
  type ActionKind,
} from '@/lib/automations-hooks';
import {
  TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_PRIORITY_LABELS,
  type TaskStatus, type TaskPriority,
} from '@/lib/tasks-types';
import { useWorkspaceMembers } from '@/lib/chat-hooks';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Trash2, Zap, Play, Pause, PlayCircle, CheckCircle2, AlertTriangle,
  CircleSlash, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

interface FormState {
  name: string;
  description: string;
  trigger: TriggerKind;
  conditions: { field: ConditionField; op: ConditionOp; value: string }[];
  actions: { kind: ActionKind; value: string }[];
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  trigger: 'task_status_changed',
  conditions: [],
  actions: [{ kind: 'add_tag', value: '' }],
};

function EditDialog({ open, onOpenChange, initial }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Automation | null;
}) {
  const create = useCreateAutomation();
  const update = useUpdateAutomation();
  const { data: members } = useWorkspaceMembers();
  const [form, setForm] = useState<FormState>(() => {
    if (initial) {
      return {
        name: initial.name,
        description: initial.description ?? '',
        trigger: initial.trigger.kind,
        conditions: initial.conditions.map(c => ({
          field: c.field, op: c.op, value: Array.isArray(c.value) ? c.value.join(',') : String(c.value ?? ''),
        })),
        actions: initial.actions.map(a => ({ kind: a.kind, value: String(a.value) })),
      };
    }
    return EMPTY_FORM;
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Ad zorunlu'); return; }
    if (form.actions.length === 0) { toast.error('En az bir aksiyon ekle'); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      enabled: initial?.enabled ?? true,
      trigger: { kind: form.trigger },
      conditions: form.conditions
        .filter(c => c.value !== '')
        .map(c => c.op === 'in'
          ? { field: c.field, op: c.op, value: c.value.split(',').map(v => v.trim()).filter(Boolean) }
          : { field: c.field, op: c.op, value: c.value }),
      actions: form.actions.filter(a => a.value !== '')
        .map(a => ({ kind: a.kind, value: a.value })),
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success(initial ? 'Otomasyon güncellendi' : 'Otomasyon oluşturuldu');
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const valueEditor = (field: ConditionField | 'set_status' | 'set_priority' | 'assign_to', v: string, onChange: (s: string) => void) => {
    if (field === 'status' || field === 'set_status') {
      return (
        <Select value={v} onValueChange={onChange}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Seç…" /></SelectTrigger>
          <SelectContent>
            {TASK_STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s as TaskStatus]}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (field === 'priority' || field === 'set_priority') {
      return (
        <Select value={v} onValueChange={onChange}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Seç…" /></SelectTrigger>
          <SelectContent>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (field === 'assignee_id' || field === 'assign_to') {
      return (
        <Select value={v} onValueChange={onChange}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Kullanıcı…" /></SelectTrigger>
          <SelectContent>
            {(members ?? []).map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name ?? m.user_id.slice(0, 8)}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return <Input value={v} onChange={e => onChange(e.target.value)} placeholder="Değer" className="h-8" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? 'Otomasyonu düzenle' : 'Yeni otomasyon'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-2">
            <Label>Ad</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus placeholder="Örn: Acil bug otomatik ata" />
          </div>
          <div className="grid gap-2">
            <Label>Açıklama</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opsiyonel" />
          </div>
          <div className="grid gap-2">
            <Label>Ne olduğunda?</Label>
            <Select value={form.trigger} onValueChange={v => setForm(f => ({ ...f, trigger: v as TriggerKind }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TRIGGER_LABELS) as TriggerKind[]).map(k => (
                  <SelectItem key={k} value={k}>{TRIGGER_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Koşullar (VE)</Label>
              <Button
                type="button" size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[11.5px]"
                onClick={() => setForm(f => ({
                  ...f,
                  conditions: [...f.conditions, { field: 'status', op: 'eq', value: '' }],
                }))}
              ><Plus className="h-3 w-3" /> Koşul</Button>
            </div>
            {form.conditions.length === 0 && (
              <div className="text-[11px] text-muted-foreground">Koşul eklemezsen kural tüm eşleşmelerde çalışır.</div>
            )}
            {form.conditions.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5">
                <Select value={c.field} onValueChange={v => setForm(f => ({
                  ...f, conditions: f.conditions.map((x, xi) => xi === i ? { ...x, field: v as ConditionField, value: '' } : x),
                }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FIELD_LABELS) as ConditionField[]).map(k => (
                      <SelectItem key={k} value={k}>{FIELD_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={c.op} onValueChange={v => setForm(f => ({
                  ...f, conditions: f.conditions.map((x, xi) => xi === i ? { ...x, op: v as ConditionOp } : x),
                }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OP_LABELS) as ConditionOp[]).map(k => (
                      <SelectItem key={k} value={k}>{OP_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {valueEditor(c.field, c.value, v => setForm(f => ({
                  ...f, conditions: f.conditions.map((x, xi) => xi === i ? { ...x, value: v } : x),
                })))}
                <Button
                  type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                  onClick={() => setForm(f => ({ ...f, conditions: f.conditions.filter((_, xi) => xi !== i) }))}
                ><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Aksiyonlar</Label>
              <Button
                type="button" size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[11.5px]"
                onClick={() => setForm(f => ({
                  ...f, actions: [...f.actions, { kind: 'add_tag', value: '' }],
                }))}
              ><Plus className="h-3 w-3" /> Aksiyon</Button>
            </div>
            {form.actions.map((a, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-1.5">
                <Select value={a.kind} onValueChange={v => setForm(f => ({
                  ...f, actions: f.actions.map((x, xi) => xi === i ? { ...x, kind: v as ActionKind, value: '' } : x),
                }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACTION_LABELS) as ActionKind[]).map(k => (
                      <SelectItem key={k} value={k}>{ACTION_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {valueEditor(a.kind === 'assign_to' ? 'assign_to' : a.kind === 'set_status' ? 'set_status' : a.kind === 'set_priority' ? 'set_priority' : ('_free' as ConditionField),
                  a.value, v => setForm(f => ({
                    ...f, actions: f.actions.map((x, xi) => xi === i ? { ...x, value: v } : x),
                  })))}
                <Button
                  type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                  onClick={() => setForm(f => ({ ...f, actions: f.actions.filter((_, xi) => xi !== i) }))}
                ><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {initial ? 'Kaydet' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RunsPreview({ automationId }: { automationId: string }) {
  const { data: runs, isLoading } = useAutomationRuns(automationId);
  if (isLoading) return <Skeleton className="h-10" />;
  if (!runs || runs.length === 0) return <div className="text-[11px] text-muted-foreground px-3 py-2">Henüz çalışma kaydı yok.</div>;
  return (
    <div className="divide-y divide-border/40">
      {runs.slice(0, 5).map(r => (
        <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-[11.5px]">
          {r.outcome === 'ok'      ? <CheckCircle2 className="h-3 w-3 text-success" />
            : r.outcome === 'error' ? <AlertTriangle className="h-3 w-3 text-destructive" />
            : <CircleSlash className="h-3 w-3 text-muted-foreground" />}
          <span className="text-muted-foreground w-32 shrink-0">
            {new Date(r.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={cn(
            r.outcome === 'ok' ? 'text-success' : r.outcome === 'error' ? 'text-destructive' : 'text-muted-foreground',
          )}>{r.outcome}</span>
          {r.detail && <span className="truncate text-muted-foreground">— {r.detail}</span>}
        </div>
      ))}
    </div>
  );
}

function AutomationCard({ a }: { a: Automation }) {
  const update = useUpdateAutomation();
  const del = useDeleteAutomation();
  const [editOpen, setEditOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const toggle = async () => {
    try { await update.mutateAsync({ id: a.id, enabled: !a.enabled }); }
    catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async () => {
    if (!confirm(`"${a.name}" otomasyonunu sil?`)) return;
    try { await del.mutateAsync(a.id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="rounded-md border border-border/60 bg-secondary/20">
      <div className="flex items-center gap-3 px-3 py-2">
        <button onClick={() => setExpanded(v => !v)} className="h-5 w-5 grid place-items-center rounded hover:bg-secondary/60">
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-[13px] font-medium truncate', !a.enabled && 'text-muted-foreground')}>{a.name}</span>
            {!a.enabled && <span className="text-[10px] uppercase tracking-wider text-muted-foreground rounded border border-border px-1.5 py-0.5">off</span>}
          </div>
          <div className="text-[11.5px] text-muted-foreground truncate">
            {TRIGGER_LABELS[a.trigger.kind]}
            {a.conditions.length > 0 && ` • ${a.conditions.length} koşul`}
            {` • ${a.actions.length} aksiyon`}
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {a.run_count} çalıştı
          {a.last_run_at && <span> · {new Date(a.last_run_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggle} title={a.enabled ? 'Duraklat' : 'Aktifleştir'}>
          {a.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-[12px]" onClick={() => setEditOpen(true)}>Düzenle</Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={doDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      {expanded && (
        <div className="border-t border-border/40 bg-background/60">
          <RunsPreview automationId={a.id} />
        </div>
      )}
      {editOpen && <EditDialog open={editOpen} onOpenChange={setEditOpen} initial={a} />}
    </div>
  );
}

export default function Automations() {
  const { data, isLoading } = useAutomations();
  const [createOpen, setCreateOpen] = useState(false);
  const active = useMemo(() => (data ?? []).filter(a => a.enabled), [data]);
  const paused = useMemo(() => (data ?? []).filter(a => !a.enabled), [data]);

  return (
    <DomainWorkspace
      domain="company"
      title="Otomasyonlar"
      subtitle="Görevlerde tetikleyici, koşul ve aksiyon. Kural Postgres tarafında çalışır, olay olur olmaz uygulanır."
      showAgent={false}
      headerActions={
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Yeni otomasyon
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
          <PlayCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-[13px] text-muted-foreground">
            Henüz otomasyon yok. Yukarıdan ilk kuralını oluştur.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Aktif ({active.length})</h2>
              {active.map(a => <AutomationCard key={a.id} a={a} />)}
            </section>
          )}
          {paused.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Duraklatılmış ({paused.length})</h2>
              {paused.map(a => <AutomationCard key={a.id} a={a} />)}
            </section>
          )}
        </>
      )}

      {createOpen && <EditDialog open={createOpen} onOpenChange={setCreateOpen} initial={null} />}
    </DomainWorkspace>
  );
}
