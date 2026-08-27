import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import {
  useCrmOpportunities, useCrmPipelines, useCrmStages,
  useMoveOpportunityStage, useCrmCompanies, useCreateCrmOpportunity,
} from '@/lib/crm-hooks';
import { formatMoney, FORECAST_COLORS } from '@/lib/crm-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, GripVertical, Building2 } from 'lucide-react';
import { CURRENCIES } from '@/lib/crm-types';

function StageColumn({ stage, opps, companies }: {
  stage: { id: string; name: string; color: string | null; probability: number };
  opps: { id: string; name: string; amount: number; currency: string; company_id: string | null; forecast_category: string; expected_close_date: string | null }[];
  companies: Map<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = opps.reduce((s, o) => s + Number(o.amount ?? 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-lg border border-border bg-card/40 ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: stage.color ?? '#94a3b8' }} />
          <span className="text-sm font-medium truncate">{stage.name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5">%{stage.probability}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{opps.length}</span>
      </div>
      <div className="px-3 py-1 text-xs text-muted-foreground border-b border-border">
        {formatMoney(total, opps[0]?.currency ?? 'USD')}
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-24 overflow-y-auto max-h-[70vh]">
        {opps.map(o => <OppCard key={o.id} opp={o} companyName={o.company_id ? companies.get(o.company_id) : undefined} />)}
        {opps.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">Boş</div>}
      </div>
    </div>
  );
}

function OppCard({ opp, companyName }: {
  opp: { id: string; name: string; amount: number; currency: string; forecast_category: string; expected_close_date: string | null };
  companyName?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: opp.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`rounded-md border border-border bg-background p-2.5 cursor-grab active:cursor-grabbing hover:border-primary transition ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{opp.name}</div>
          {companyName && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" /> {companyName}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-semibold">{formatMoney(opp.amount, opp.currency)}</span>
            <Badge className={`text-[9px] px-1 py-0 ${FORECAST_COLORS[opp.forecast_category as keyof typeof FORECAST_COLORS] ?? ''}`}>
              {opp.forecast_category}
            </Badge>
          </div>
          {opp.expected_close_date && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Kapanış: {new Date(opp.expected_close_date).toLocaleDateString('tr-TR')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PipelineBoard() {
  const { data: pipelines } = useCrmPipelines();
  const [pipelineId, setPipelineId] = useState<string | undefined>();
  const activePipelineId = pipelineId ?? pipelines?.[0]?.id;
  const { data: stages } = useCrmStages(activePipelineId);
  const { data: opps } = useCrmOpportunities({ pipelineId: activePipelineId });
  const { data: companies } = useCrmCompanies();
  const move = useMoveOpportunityStage();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);

  const companyNames = useMemo(
    () => new Map((companies ?? []).map(c => [c.id, c.name])),
    [companies],
  );

  const oppsByStage = useMemo(() => {
    const m = new Map<string, typeof opps>();
    (opps ?? []).forEach(o => {
      const arr = m.get(o.stage_id) ?? [];
      arr.push(o);
      m.set(o.stage_id, arr);
    });
    return m;
  }, [opps]);

  function onDragStart(e: DragStartEvent) { setDraggingId(String(e.active.id)); }
  async function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const oppId = String(e.active.id);
    const targetStageId = e.over?.id ? String(e.over.id) : null;
    if (!targetStageId) return;
    const opp = opps?.find(o => o.id === oppId);
    const stage = stages?.find(s => s.id === targetStageId);
    if (!opp || !stage || opp.stage_id === stage.id) return;
    try {
      await move.mutateAsync({
        id: oppId,
        stage_id: stage.id,
        probability: stage.probability,
        forecast_category: stage.forecast_category,
      });
      if (stage.is_won) toast.success("Kazanıldı!");
      else if (stage.is_lost) toast.success("Kaybedildi");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Taşınamadı");
    }
  }

  const draggingOpp = draggingId ? opps?.find(o => o.id === draggingId) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={activePipelineId} onValueChange={setPipelineId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Pipeline seçin" /></SelectTrigger>
            <SelectContent>
              {(pipelines ?? []).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}{p.is_default ? ' (varsayılan)' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {opps?.length ?? 0} fırsat · toplam {formatMoney((opps ?? []).reduce((s, o) => s + Number(o.amount ?? 0), 0), 'USD')}
          </span>
        </div>
        <NewOpportunityDialog
          open={openNew}
          onOpenChange={setOpenNew}
          pipelineId={activePipelineId}
          stages={stages ?? []}
        />
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {(stages ?? []).map(s => (
            <StageColumn
              key={s.id}
              stage={s}
              opps={oppsByStage.get(s.id) ?? []}
              companies={companyNames}
            />
          ))}
        </div>
        <DragOverlay>
          {draggingOpp ? (
            <div className="rounded-md border border-primary bg-background p-2.5 w-64 shadow-lg">
              <div className="text-sm font-medium">{draggingOpp.name}</div>
              <div className="text-xs font-semibold mt-1">{formatMoney(draggingOpp.amount, draggingOpp.currency)}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function NewOpportunityDialog({ open, onOpenChange, pipelineId, stages }: {
  open: boolean; onOpenChange: (o: boolean) => void; pipelineId?: string;
  stages: { id: string; name: string; probability: number; forecast_category: string; is_won: boolean; is_lost: boolean }[];
}) {
  const { data: companies } = useCrmCompanies();
  const create = useCreateCrmOpportunity();
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState<string>('');
  const [stageId, setStageId] = useState<string>('');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [expectedClose, setExpectedClose] = useState('');
  const [description, setDescription] = useState('');

  async function submit() {
    if (!pipelineId || !stageId || !name.trim()) {
      toast.error("İsim, pipeline ve aşama gerekli");
      return;
    }
    const stage = stages.find(s => s.id === stageId);
    try {
      await create.mutateAsync({
        name: name.trim(),
        pipeline_id: pipelineId,
        stage_id: stageId,
        company_id: companyId || undefined,
        amount: Number(amount) || 0,
        currency,
        probability: stage?.probability ?? 0,
        forecast_category: (stage?.forecast_category ?? 'pipeline') as 'pipeline' | 'best_case' | 'commit' | 'closed_won' | 'closed_lost' | 'omitted',
        expected_close_date: expectedClose || null,
        description: description || null,
      });
      toast.success("Fırsat oluşturuldu");
      onOpenChange(false);
      setName(''); setCompanyId(''); setAmount('0'); setDescription(''); setExpectedClose('');
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Hata");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Fırsat</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Yeni Fırsat</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Ad *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Şirket</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {(companies ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aşama *</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tutar</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Para Birimi</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Beklenen Kapanış</Label>
              <Input type="date" value={expectedClose} onChange={e => setExpectedClose(e.target.value)} />
            </div>
          </div>
          <div><Label>Açıklama</Label><Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={submit} disabled={create.isPending}>Oluştur</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
