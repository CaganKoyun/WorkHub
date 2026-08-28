import { useState } from 'react';
import {
  useAllCustomFieldDefs, useCreateCustomFieldDef, useDeleteCustomFieldDef,
  KIND_LABELS, type CustomFieldKind, type EntityType, type CustomFieldDef,
} from '@/lib/custom-fields-hooks';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Settings2, Sigma } from 'lucide-react';
import { toast } from 'sonner';
import { FORMULA_EXAMPLES } from '@/lib/formula-eval';

const ENTITY_LABELS: Record<EntityType, string> = {
  task: 'Görevler',
  project: 'Projeler',
  bug: 'Buglar',
  deal: 'Fırsatlar',
  customer: 'Müşteriler',
};

const KIND_NEEDS_OPTIONS = new Set<CustomFieldKind>(['select', 'multi_select']);

function CreateDefDialog({
  open, onOpenChange, entityType,
}: { open: boolean; onOpenChange: (o: boolean) => void; entityType: EntityType }) {
  const create = useCreateCustomFieldDef();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CustomFieldKind>('text');
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState('');
  const [formula, setFormula] = useState('');
  const [formulaSuffix, setFormulaSuffix] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const config: Record<string, unknown> = {};
    if (KIND_NEEDS_OPTIONS.has(kind)) {
      const opts = optionsText.split('\n').map(l => l.trim()).filter(Boolean).map(label => ({
        value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label,
      }));
      config.options = opts;
    }
    if (kind === 'formula') {
      if (!formula.trim()) { toast.error('Formül zorunlu'); return; }
      config.formula = formula.trim();
      if (formulaSuffix.trim()) config.suffix = formulaSuffix.trim();
    }
    try {
      await create.mutateAsync({
        entity_type: entityType, key, name: name.trim(), kind,
        config, position: 99, required,
      });
      toast.success('Alan eklendi');
      setName(''); setOptionsText(''); setRequired(false);
      setFormula(''); setFormulaSuffix('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Yeni özel alan — {ENTITY_LABELS[entityType]}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Müşteri şirket" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Tip</Label>
            <Select value={kind} onValueChange={v => setKind(v as CustomFieldKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABELS) as CustomFieldKind[]).map(k => (
                  <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {kind === 'formula' && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Sigma className="h-3.5 w-3.5" /> Formül</Label>
              <Input value={formula} onChange={e => setFormula(e.target.value)} placeholder="Örn: sum(subtasks.story_points)" className="font-mono text-[12px]" />
              <div className="flex flex-wrap gap-1 pt-1">
                {FORMULA_EXAMPLES.slice(0, 6).map(ex => (
                  <button key={ex.formula} type="button" onClick={() => setFormula(ex.formula)}
                    className="text-[10.5px] px-1.5 py-0.5 rounded border border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground font-mono">
                    {ex.label}
                  </button>
                ))}
              </div>
              <Label className="text-[11px] text-muted-foreground pt-1">Sonek (opsiyonel)</Label>
              <Input value={formulaSuffix} onChange={e => setFormulaSuffix(e.target.value)} placeholder="Örn: gün, sa, %" className="text-[12px] h-8" />
            </div>
          )}
          {KIND_NEEDS_OPTIONS.has(kind) && (
            <div className="space-y-1.5">
              <Label>Seçenekler (satır başına 1)</Label>
              <textarea
                rows={4}
                value={optionsText}
                onChange={e => setOptionsText(e.target.value)}
                placeholder="Düşük&#10;Orta&#10;Yüksek"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={e => setRequired(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Zorunlu alan
          </label>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending}>Ekle</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DefRow({ def }: { def: CustomFieldDef }) {
  const del = useDeleteCustomFieldDef();
  return (
    <div className="group flex items-center gap-3 border-b border-border/60 px-3 py-2 last:border-b-0 hover:bg-sidebar-accent/30">
      <span className="text-[13px] font-medium truncate flex-1">{def.name}</span>
      <span className="font-mono text-[10.5px] text-muted-foreground">{def.key}</span>
      <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground rounded border border-border bg-secondary/40 px-1.5 py-0.5">
        {KIND_LABELS[def.kind]}
      </span>
      {def.required && (
        <span className="text-[10px] text-destructive">zorunlu</span>
      )}
      <Button
        variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-60 hover:!opacity-100"
        onClick={() => { if (confirm(`"${def.name}" alanını sil?`)) del.mutate(def.id); }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function CustomFields() {
  const { data: defs, isLoading } = useAllCustomFieldDefs();
  const [tab, setTab] = useState<EntityType>('task');
  const [createOpen, setCreateOpen] = useState(false);

  const grouped: Partial<Record<EntityType, CustomFieldDef[]>> = {};
  (defs ?? []).forEach(d => {
    (grouped[d.entity_type] ??= []).push(d);
  });

  return (
    <DomainWorkspace
      domain="company"
      title="Özel Alanlar"
      subtitle="Her entity için kendi alanlarını tanımla. Her tip için ayrı sekme, ekle-sil, çeşitli veri tipleri."
      showAgent={false}
    >
      <Tabs value={tab} onValueChange={v => setTab(v as EntityType)}>
        <TabsList>
          {(Object.keys(ENTITY_LABELS) as EntityType[]).map(t => (
            <TabsTrigger key={t} value={t}>
              {ENTITY_LABELS[t]} ({grouped[t]?.length ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
        {(Object.keys(ENTITY_LABELS) as EntityType[]).map(t => (
          <TabsContent key={t} value={t} className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Yeni alan
              </Button>
            </div>
            {isLoading ? (
              <Skeleton className="h-20" />
            ) : (grouped[t]?.length ?? 0) === 0 ? (
              <div className="rounded-md border border-border/60 py-10 text-center text-[13px] text-muted-foreground">
                Bu tip için henüz özel alan yok.
              </div>
            ) : (
              <div className="rounded-md border border-border/60 overflow-hidden">
                {(grouped[t] ?? []).map(d => <DefRow key={d.id} def={d} />)}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <CreateDefDialog open={createOpen} onOpenChange={setCreateOpen} entityType={tab} />
    </DomainWorkspace>
  );
}
