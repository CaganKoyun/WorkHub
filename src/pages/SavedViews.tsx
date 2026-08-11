import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useSavedViews, useFavoriteViewIds, useCreateSavedView, useUpdateSavedView,
  useDeleteSavedView, useToggleFavorite, viewToUrl,
  TARGET_LABELS, type SavedView, type ViewTarget, type ViewFilters,
} from '@/lib/saved-views-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { useWorkspaceMembers } from '@/lib/chat-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_PRIORITY_LABELS, type TaskStatus, type TaskPriority } from '@/lib/tasks-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bookmark, Plus, Star, Users, User, Trash2, Filter, ArrowRight, ChevronRight,
  LayoutGrid, Table2, Calendar, Clock, BarChart3, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

// ---- Template definitions ---------------------------------------------------

interface ViewTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  target: ViewTarget;
  filters: ViewFilters;
  preview: React.ReactNode;
}

function KanbanPreview() {
  return (
    <div className="flex gap-1 h-full items-end p-1.5">
      {[3, 2, 4, 1].map((count, col) => (
        <div key={col} className="flex-1 flex flex-col gap-0.5 justify-end">
          <div className="h-1 w-full rounded-sm bg-muted-foreground/20" />
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-2.5 w-full rounded-sm bg-primary/20 border border-primary/15" />
          ))}
        </div>
      ))}
    </div>
  );
}

function TablePreview() {
  return (
    <div className="flex flex-col gap-0.5 p-1.5 h-full justify-center">
      <div className="flex gap-1">
        <div className="h-1.5 flex-[2] rounded-sm bg-muted-foreground/30" />
        <div className="h-1.5 flex-1 rounded-sm bg-muted-foreground/30" />
        <div className="h-1.5 flex-1 rounded-sm bg-muted-foreground/30" />
      </div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-1">
          <div className="h-1.5 flex-[2] rounded-sm bg-primary/15" />
          <div className="h-1.5 flex-1 rounded-sm bg-primary/10" />
          <div className="h-1.5 flex-1 rounded-sm bg-primary/10" />
        </div>
      ))}
    </div>
  );
}

function CalendarPreview() {
  return (
    <div className="p-1.5 h-full flex flex-col gap-0.5 justify-center">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-1 flex-1 rounded-sm bg-muted-foreground/20" />
        ))}
      </div>
      {[1, 2, 3].map(row => (
        <div key={row} className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(col => (
            <div key={col} className={cn(
              'h-3 flex-1 rounded-sm border',
              (row === 1 && col === 3) || (row === 2 && col === 1)
                ? 'bg-primary/20 border-primary/25'
                : 'bg-muted/30 border-border/30',
            )} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TimelinePreview() {
  return (
    <div className="p-1.5 h-full flex flex-col gap-1 justify-center">
      {[{ w: '70%', x: '5%' }, { w: '45%', x: '30%' }, { w: '60%', x: '15%' }, { w: '35%', x: '50%' }].map((bar, i) => (
        <div key={i} className="relative h-2 w-full">
          <div
            className="absolute h-full rounded-sm bg-primary/25 border border-primary/20"
            style={{ width: bar.w, left: bar.x }}
          />
        </div>
      ))}
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="p-1.5 h-full grid grid-cols-2 grid-rows-2 gap-0.5">
      <div className="rounded-sm bg-primary/15 border border-primary/10 flex items-center justify-center">
        <div className="h-1.5 w-3/4 rounded-sm bg-primary/25" />
      </div>
      <div className="rounded-sm bg-muted/30 border border-border/30 flex items-end p-0.5 gap-px">
        {[60, 80, 45, 90, 70].map((h, i) => (
          <div key={i} className="flex-1 bg-primary/20 rounded-t-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="rounded-sm bg-muted/30 border border-border/30 flex items-center justify-center">
        <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary/60" />
      </div>
      <div className="rounded-sm bg-primary/10 border border-primary/10 flex flex-col gap-0.5 p-0.5 justify-center">
        <div className="h-1 w-full rounded-sm bg-primary/20" />
        <div className="h-1 w-3/4 rounded-sm bg-primary/15" />
        <div className="h-1 w-1/2 rounded-sm bg-primary/10" />
      </div>
    </div>
  );
}

function GroupedPreview() {
  return (
    <div className="p-1.5 h-full flex flex-col gap-1 justify-center">
      {[2, 3].map((count, g) => (
        <div key={g} className="space-y-0.5">
          <div className="h-1 w-1/3 rounded-sm bg-muted-foreground/25" />
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-2 w-full rounded-sm bg-primary/15 border border-primary/10 ml-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

const TEMPLATES: ViewTemplate[] = [
  {
    id: 'kanban',
    title: 'Kanban Board',
    description: 'Duruma göre sütunlar halinde görevleri görüntüler',
    icon: LayoutGrid,
    target: 'issues',
    filters: { status: ['open', 'in_progress', 'in_review'] as TaskStatus[] },
    preview: <KanbanPreview />,
  },
  {
    id: 'table',
    title: 'Tablo Görünümü',
    description: 'Tüm görevleri satırlar halinde listeler',
    icon: Table2,
    target: 'issues',
    filters: {},
    preview: <TablePreview />,
  },
  {
    id: 'calendar',
    title: 'Takvim',
    description: 'Son tarihlere göre takvim görünümü',
    icon: Calendar,
    target: 'issues',
    filters: { status: ['open', 'in_progress'] as TaskStatus[] },
    preview: <CalendarPreview />,
  },
  {
    id: 'timeline',
    title: 'Zaman Çizelgesi',
    description: 'Başlangıç ve bitiş tarihlerine göre zaman şeridi',
    icon: Clock,
    target: 'issues',
    filters: { status: ['open', 'in_progress', 'in_review'] as TaskStatus[] },
    preview: <TimelinePreview />,
  },
  {
    id: 'dashboard',
    title: 'Özet Panosu',
    description: 'İstatistik ve grafik özetleriyle genel bakış',
    icon: BarChart3,
    target: 'issues',
    filters: {},
    preview: <DashboardPreview />,
  },
  {
    id: 'grouped',
    title: 'Grup Görünümü',
    description: 'Proje veya öncelik bazında gruplu listeleme',
    icon: Layers,
    target: 'issues',
    filters: { priority: ['high', 'urgent'] as TaskPriority[] },
    preview: <GroupedPreview />,
  },
];

// ---- Create/edit dialog -------------------------------------------------

function EditDialog({ open, onOpenChange, initial, prefill }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: SavedView | null;
  prefill?: { name?: string; target?: ViewTarget; filters?: ViewFilters; description?: string } | null;
}) {
  const create = useCreateSavedView();
  const update = useUpdateSavedView();
  const { data: projects } = useProjects();
  const { data: members } = useWorkspaceMembers();

  const [name, setName] = useState(initial?.name ?? prefill?.name ?? '');
  const [target, setTarget] = useState<ViewTarget>(initial?.target ?? prefill?.target ?? 'issues');
  const [description, setDescription] = useState(initial?.description ?? prefill?.description ?? '');
  const [shared, setShared] = useState(initial?.is_shared ?? false);
  const [filters, setFilters] = useState<ViewFilters>(initial?.filters ?? prefill?.filters ?? {});

  const toggleArr = <T extends string>(arr: T[] | undefined, val: T): T[] => {
    const s = new Set(arr ?? []);
    if (s.has(val)) s.delete(val); else s.add(val);
    return [...s];
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Ad zorunlu'); return; }
    const cleanFilters: ViewFilters = {};
    (['status', 'priority', 'assignee_ids', 'project_ids', 'tags'] as const).forEach(k => {
      const v = filters[k];
      if (Array.isArray(v) && v.length > 0) (cleanFilters[k] as unknown) = v;
    });
    if (filters.search?.trim()) cleanFilters.search = filters.search.trim();
    const payload = {
      target,
      name: name.trim(),
      description: description.trim() || undefined,
      filters: cleanFilters,
      is_shared: shared,
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success(initial ? 'Görünüm güncellendi' : 'Görünüm oluşturuldu');
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'Görünümü düzenle' : 'Yeni görünüm'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Örn: Bu haftaki acil işlerim" />
          </div>
          <div className="grid gap-1.5">
            <Label>Açıklama (opsiyonel)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Hedef</Label>
            <Select value={target} onValueChange={v => setTarget(v as ViewTarget)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TARGET_LABELS) as ViewTarget[]).map(t => (
                  <SelectItem key={t} value={t}>{TARGET_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 pt-1">
            <Label className="flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> Filtreler</Label>

            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground">Durum</div>
              <div className="flex flex-wrap gap-1.5">
                {TASK_STATUS_ORDER.map(s => (
                  <button
                    key={s} type="button"
                    onClick={() => setFilters(f => ({ ...f, status: toggleArr(f.status, s) }))}
                    className={cn(
                      'text-[11.5px] px-2 py-1 rounded border',
                      filters.status?.includes(s)
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-secondary/40 border-border text-muted-foreground',
                    )}
                  >{TASK_STATUS_LABELS[s as TaskStatus]}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground">Öncelik</div>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map(p => (
                  <button
                    key={p} type="button"
                    onClick={() => setFilters(f => ({ ...f, priority: toggleArr(f.priority, p) }))}
                    className={cn(
                      'text-[11.5px] px-2 py-1 rounded border',
                      filters.priority?.includes(p)
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-secondary/40 border-border text-muted-foreground',
                    )}
                  >{TASK_PRIORITY_LABELS[p]}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground">Atanan</div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {(members ?? []).map(m => (
                  <button
                    key={m.user_id} type="button"
                    onClick={() => setFilters(f => ({ ...f, assignee_ids: toggleArr(f.assignee_ids, m.user_id) }))}
                    className={cn(
                      'text-[11.5px] px-2 py-1 rounded border',
                      filters.assignee_ids?.includes(m.user_id)
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-secondary/40 border-border text-muted-foreground',
                    )}
                  >{m.full_name ?? m.user_id.slice(0, 8)}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground">Proje</div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {(projects ?? []).map(p => (
                  <button
                    key={p.id} type="button"
                    onClick={() => setFilters(f => ({ ...f, project_ids: toggleArr(f.project_ids, p.id) }))}
                    className={cn(
                      'text-[11.5px] px-2 py-1 rounded border',
                      filters.project_ids?.includes(p.id)
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-secondary/40 border-border text-muted-foreground',
                    )}
                  >{p.name}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="text-[11px] text-muted-foreground">Metin arama</div>
              <Input value={filters.search ?? ''} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Başlık / açıklama…" className="h-8 text-[12px]" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer pt-2">
            <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} className="h-4 w-4 accent-primary" />
            <Users className="h-3.5 w-3.5 text-muted-foreground" /> Workspace ile paylaş
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Iptal</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>{initial ? 'Kaydet' : 'Oluştur'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Template card ----------------------------------------------------------

function TemplateCard({ template, onSelect }: { template: ViewTemplate; onSelect: (t: ViewTemplate) => void }) {
  const Icon = template.icon;
  return (
    <button
      onClick={() => onSelect(template)}
      className={cn(
        'group relative flex flex-col rounded-lg border border-border/60 bg-card',
        'hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
        'transition-all duration-200 text-left overflow-hidden',
      )}
    >
      <div className="h-20 w-full bg-muted/30 border-b border-border/40 group-hover:bg-primary/[0.03] transition-colors">
        {template.preview}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-[13px] font-medium">{template.title}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{template.description}</p>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 font-medium">
          <Plus className="h-2.5 w-2.5" /> Kullan
        </div>
      </div>
    </button>
  );
}

// ---- View card (replaces ViewRow) -------------------------------------------

function ViewCard({ view, isFav, isMine }: { view: SavedView; isFav: boolean; isMine: boolean }) {
  const del = useDeleteSavedView();
  const tog = useToggleFavorite();
  const [editOpen, setEditOpen] = useState(false);

  const filterChips: string[] = [];
  if (view.filters.status?.length) filterChips.push(`durum: ${view.filters.status.map(s => TASK_STATUS_LABELS[s as TaskStatus] ?? s).join(', ')}`);
  if (view.filters.priority?.length) filterChips.push(`öncelik: ${view.filters.priority.map(p => TASK_PRIORITY_LABELS[p as TaskPriority] ?? p).join(', ')}`);
  if (view.filters.assignee_ids?.length) filterChips.push(`atanan: ${view.filters.assignee_ids.length}`);
  if (view.filters.project_ids?.length) filterChips.push(`proje: ${view.filters.project_ids.length}`);
  if (view.filters.search) filterChips.push(`arama: "${view.filters.search}"`);

  const doDelete = async () => {
    if (!confirm(`"${view.name}" görünümünü sil?`)) return;
    try { await del.mutateAsync(view.id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="group relative rounded-lg border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-150">
      <div className="flex items-start gap-3 p-3.5">
        <button
          onClick={() => tog.mutate({ viewId: view.id, isFav })}
          title={isFav ? 'Favoriden çıkar' : 'Favoriye ekle'}
          className="mt-0.5 text-muted-foreground hover:text-warning shrink-0"
        >
          <Star className={cn('h-4 w-4', isFav && 'fill-warning text-warning')} />
        </button>
        <Link to={viewToUrl(view)} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13.5px] font-medium">{view.name}</span>
            <span className="inline-flex items-center text-[10.5px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground font-medium">
              {TARGET_LABELS[view.target]}
            </span>
            {view.is_shared
              ? <Users className="h-3 w-3 text-muted-foreground/60" />
              : <User className="h-3 w-3 text-muted-foreground/60" />}
          </div>
          {view.description && (
            <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{view.description}</p>
          )}
          {filterChips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {filterChips.map((chip, i) => (
                <span key={i} className="text-[10.5px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/80">
                  {chip}
                </span>
              ))}
            </div>
          )}
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to={viewToUrl(view)}
            className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary/50 transition-colors"
          >
            Aç <ArrowRight className="h-3 w-3" />
          </Link>
          {isMine && (
            <>
              <Button
                size="sm" variant="ghost"
                className="h-7 text-[11.5px] opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditOpen(true)}
              >
                Düzenle
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={doDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      {editOpen && <EditDialog open={editOpen} onOpenChange={setEditOpen} initial={view} />}
    </div>
  );
}

// ---- Section wrapper --------------------------------------------------------

function Section({ icon: Icon, label, count, accent, children }: {
  icon: React.ElementType;
  label: string;
  count: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', accent ? 'fill-warning text-warning' : 'text-muted-foreground')} />
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h2>
        <span className="text-[11px] text-muted-foreground/60">({count})</span>
      </div>
      <div className="grid gap-2">
        {children}
      </div>
    </section>
  );
}

// ---- Page -----------------------------------------------------------------

export default function SavedViews() {
  const { data: views, isLoading } = useSavedViews();
  const { data: favIds } = useFavoriteViewIds();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [templatePrefill, setTemplatePrefill] = useState<ViewTemplate | null>(null);

  const mine = useMemo(() => (views ?? []).filter(v => v.owner_id === user?.id), [views, user]);
  const shared = useMemo(() => (views ?? []).filter(v => v.owner_id !== user?.id && v.is_shared), [views, user]);
  const favorites = useMemo(() => (views ?? []).filter(v => favIds?.has(v.id)), [views, favIds]);

  const handleTemplateSelect = (template: ViewTemplate) => {
    setTemplatePrefill(template);
    setCreateOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setCreateOpen(open);
    if (!open) setTemplatePrefill(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight flex items-center gap-2.5">
            <Bookmark className="h-5.5 w-5.5 text-primary/70" /> Kaydedilmiş görünümler
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-lg leading-relaxed">
            Sık kullandığın filtre + sıralama kombinasyonlarını kaydet, favoriye ekle,
            workspace ile paylaş. Görünüme tıkla &rarr; ilgili sayfa filtreli açılır.
          </p>
        </div>
        <Button className="h-9 gap-1.5 shadow-sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Yeni görünüm
        </Button>
      </div>

      {/* Templates section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-3.5 w-3.5 text-primary/70" />
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Şablonlar
          </h2>
        </div>
        <p className="text-[12px] text-muted-foreground -mt-1">
          Hazır şablonlardan birini seç, filtrelerini ihtiyacına göre düzenle.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TEMPLATES.map(t => (
            <TemplateCard key={t.id} template={t} onSelect={handleTemplateSelect} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Saved views */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (views ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-[13.5px] text-muted-foreground">Henüz kayıtlı görünüm yok.</p>
          <p className="mt-1 text-[12px] text-muted-foreground/60">
            Yukarıdaki şablonlardan birini kullanarak veya sıfırdan yeni bir görünüm oluştur.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {favorites.length > 0 && (
            <Section icon={Star} label="Favoriler" count={favorites.length} accent>
              {favorites.map(v => (
                <ViewCard key={v.id} view={v} isFav={true} isMine={v.owner_id === user?.id} />
              ))}
            </Section>
          )}

          {mine.length > 0 && (
            <Section icon={ChevronRight} label="Benim görünümlerim" count={mine.length}>
              {mine.map(v => (
                <ViewCard key={v.id} view={v} isFav={!!favIds?.has(v.id)} isMine={true} />
              ))}
            </Section>
          )}

          {shared.length > 0 && (
            <Section icon={Users} label="Ekip paylaşımları" count={shared.length}>
              {shared.map(v => (
                <ViewCard key={v.id} view={v} isFav={!!favIds?.has(v.id)} isMine={false} />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* Create/edit dialog */}
      {createOpen && (
        <EditDialog
          open={createOpen}
          onOpenChange={handleDialogClose}
          initial={null}
          prefill={templatePrefill ? {
            name: templatePrefill.title,
            target: templatePrefill.target,
            filters: templatePrefill.filters,
            description: templatePrefill.description,
          } : null}
        />
      )}
    </div>
  );
}
