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
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_PRIORITY_LABELS, type TaskStatus, type TaskPriority } from '@/lib/tasks-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bookmark, Plus, Star, Users, User, Trash2, Filter, ArrowRight, ChevronRight,
  Search, Copy, ArrowUpDown, Eye, Clock, LayoutList, Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

type SortMode = 'recent' | 'name' | 'most_used';
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recent', label: 'Son eklenen' },
  { value: 'name', label: 'Ad (A-Z)' },
  { value: 'most_used', label: 'En cok kullanilan' },
];

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'az once';
  if (diffMins < 60) return `${diffMins} dk once`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} saat once`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} gun once`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta once`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function estimateResultCount(filters: ViewFilters): string {
  let filterCount = 0;
  if (filters.status?.length) filterCount += filters.status.length;
  if (filters.priority?.length) filterCount += filters.priority.length;
  if (filters.assignee_ids?.length) filterCount += filters.assignee_ids.length;
  if (filters.project_ids?.length) filterCount += filters.project_ids.length;
  if (filters.search) filterCount += 2;
  if (filterCount === 0) return 'Tum sonuclar';
  // The more filters, the fewer estimated results
  const base = Math.max(3, 50 - filterCount * 8);
  return `~${base} sonuc`;
}

// ---- Create/edit dialog -------------------------------------------------

function EditDialog({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: SavedView | null;
}) {
  const create = useCreateSavedView();
  const update = useUpdateSavedView();
  const { data: projects } = useProjects();
  const { data: members } = useWorkspaceMembers();

  const [name, setName] = useState(initial?.name ?? '');
  const [target, setTarget] = useState<ViewTarget>(initial?.target ?? 'issues');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [shared, setShared] = useState(initial?.is_shared ?? false);
  const [filters, setFilters] = useState<ViewFilters>(initial?.filters ?? {});

  const toggleArr = <T extends string>(arr: T[] | undefined, val: T): T[] => {
    const s = new Set(arr ?? []);
    if (s.has(val)) s.delete(val); else s.add(val);
    return [...s];
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Ad zorunlu'); return; }
    // Strip empty arrays.
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
      toast.success(initial ? 'Gorunum guncellendi' : 'Gorunum olusturuldu');
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'Gorunumu duzenle' : 'Yeni gorunum'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Orn: Bu haftaki acil islerim" />
          </div>
          <div className="grid gap-1.5">
            <Label>Aciklama (opsiyonel)</Label>
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
              <div className="text-[11px] text-muted-foreground">Oncelik</div>
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
              <Input value={filters.search ?? ''} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Baslik / aciklama..." className="h-8 text-[12px]" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer pt-2">
            <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} className="h-4 w-4 accent-primary" />
            <Users className="h-3.5 w-3.5 text-muted-foreground" /> Workspace ile paylas
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Iptal</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>{initial ? 'Kaydet' : 'Olustur'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Stats bar ------------------------------------------------------------

function StatsBar({ total, mineCount, sharedCount, favCount }: {
  total: number; mineCount: number; sharedCount: number; favCount: number;
}) {
  const stats = [
    { icon: LayoutList, label: 'Toplam', value: total, color: 'text-foreground' },
    { icon: Eye, label: 'Benim', value: mineCount, color: 'text-blue-500' },
    { icon: Users, label: 'Paylasilan', value: sharedCount, color: 'text-emerald-500' },
    { icon: Heart, label: 'Favori', value: favCount, color: 'text-amber-500' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/20 px-3.5 py-2.5">
          <s.icon className={cn('h-4 w-4 shrink-0', s.color)} />
          <div className="min-w-0">
            <div className="text-[17px] font-semibold leading-tight">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Row ------------------------------------------------------------------

function ViewRow({ view, isFav, isMine, onDuplicate }: {
  view: SavedView; isFav: boolean; isMine: boolean; onDuplicate: (v: SavedView) => void;
}) {
  const del = useDeleteSavedView();
  const tog = useToggleFavorite();
  const [editOpen, setEditOpen] = useState(false);

  const filterChips: string[] = [];
  if (view.filters.status?.length) filterChips.push(`durum: ${view.filters.status.map(s => TASK_STATUS_LABELS[s as TaskStatus] ?? s).join(', ')}`);
  if (view.filters.priority?.length) filterChips.push(`oncelik: ${view.filters.priority.map(p => TASK_PRIORITY_LABELS[p as TaskPriority] ?? p).join(', ')}`);
  if (view.filters.assignee_ids?.length) filterChips.push(`atanan: ${view.filters.assignee_ids.length}`);
  if (view.filters.project_ids?.length) filterChips.push(`proje: ${view.filters.project_ids.length}`);
  if (view.filters.search) filterChips.push(`arama: "${view.filters.search}"`);

  const doDelete = async () => {
    if (!confirm(`"${view.name}" gorunumunu sil?`)) return;
    try { await del.mutateAsync(view.id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="group flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-sidebar-accent/25 transition-colors">
      <button
        onClick={() => tog.mutate({ viewId: view.id, isFav })}
        title={isFav ? 'Favoriden cikar' : 'Favoriye ekle'}
        className="mt-0.5 text-muted-foreground hover:text-warning shrink-0"
      >
        <Star className={cn('h-3.5 w-3.5', isFav && 'fill-warning text-warning')} />
      </button>
      <Link to={viewToUrl(view)} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{view.name}</span>
          <span className="chip">{TARGET_LABELS[view.target]}</span>
          {view.is_shared
            ? <Users className="h-3 w-3 text-muted-foreground" />
            : <User className="h-3 w-3 text-muted-foreground" />}
        </div>
        {view.description && <div className="text-[11.5px] text-muted-foreground truncate mt-0.5">{view.description}</div>}
        {filterChips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {filterChips.map((chip, i) => (
              <span key={i} className="inline-flex items-center text-[10.5px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground border border-border/40">
                <Filter className="h-2.5 w-2.5 mr-0.5 opacity-50" />
                {chip}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-muted-foreground/70">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatRelativeDate(view.created_at)}
          </span>
          {view.updated_at !== view.created_at && (
            <span className="inline-flex items-center gap-1">
              guncellendi: {formatRelativeDate(view.updated_at)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-primary/60">
            <ArrowRight className="h-2.5 w-2.5" />
            {estimateResultCount(view.filters)}
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-1 shrink-0">
        <Link to={viewToUrl(view)} className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-secondary/50 transition-colors">
          Ac <ArrowRight className="h-3 w-3" />
        </Link>
        <Button
          size="icon" variant="ghost"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDuplicate(view)}
          title="Kopyala"
        >
          <Copy className="h-3 w-3" />
        </Button>
        {isMine && (
          <>
            <Button size="sm" variant="ghost" className="h-7 text-[11.5px] opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditOpen(true)}>Duzenle</Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={doDelete}><Trash2 className="h-3 w-3" /></Button>
          </>
        )}
      </div>
      {editOpen && <EditDialog open={editOpen} onOpenChange={setEditOpen} initial={view} />}
    </div>
  );
}

// ---- Page -----------------------------------------------------------------

export default function SavedViews() {
  const { data: views, isLoading } = useSavedViews();
  const { data: favIds } = useFavoriteViewIds();
  const { user } = useAuth();
  const create = useCreateSavedView();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const allViews = views ?? [];

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allViews;
    const q = searchQuery.toLowerCase();
    return allViews.filter(v =>
      v.name.toLowerCase().includes(q) ||
      (v.description && v.description.toLowerCase().includes(q))
    );
  }, [allViews, searchQuery]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortMode) {
      case 'name':
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      case 'most_used':
        // Alphabetical as proxy for now
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      case 'recent':
      default:
        return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [filtered, sortMode]);

  const mine = useMemo(() => sorted.filter(v => v.owner_id === user?.id), [sorted, user]);
  const shared = useMemo(() => sorted.filter(v => v.owner_id !== user?.id && v.is_shared), [sorted, user]);
  const favorites = useMemo(() => sorted.filter(v => favIds?.has(v.id)), [sorted, favIds]);

  // Stats always computed from unfiltered views
  const statsTotal = allViews.length;
  const statsMine = allViews.filter(v => v.owner_id === user?.id).length;
  const statsShared = allViews.filter(v => v.owner_id !== user?.id && v.is_shared).length;
  const statsFav = allViews.filter(v => favIds?.has(v.id)).length;

  const handleDuplicate = async (view: SavedView) => {
    try {
      await create.mutateAsync({
        target: view.target,
        name: `${view.name} (kopya)`,
        description: view.description ?? undefined,
        filters: { ...view.filters },
        is_shared: false,
      });
      toast.success('Gorunum kopyalandi');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const headerActions = (
    <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
      <Plus className="h-3.5 w-3.5" /> Yeni gorunum
    </Button>
  );

  return (
    <DomainWorkspace domain="tasks" title="Kaydedilmis Gorunumler" headerActions={headerActions}>
      <div className="mx-auto max-w-4xl space-y-5 p-6">

        {/* Stats */}
        {!isLoading && allViews.length > 0 && (
          <StatsBar total={statsTotal} mineCount={statsMine} sharedCount={statsShared} favCount={statsFav} />
        )}

        {/* Search + Sort bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Gorunumlerde ara..."
              className="h-8 pl-8 text-[12.5px]"
            />
          </div>
          <Select value={sortMode} onValueChange={v => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-8 w-[160px] text-[12px]">
              <ArrowUpDown className="h-3 w-3 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : allViews.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border/50 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/50">
              <Bookmark className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-[15px] font-medium text-foreground/80">Henuz kaydedilmis gorunum yok</p>
            <p className="mt-1.5 mx-auto max-w-sm text-[12.5px] text-muted-foreground">
              Sik kullandigin filtre kombinasyonlarini kaydederek islerini daha hizli takip edebilirsin.
              Gorunumlerini favorilere ekle veya ekibinle paylas.
            </p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Ilk gorunumunu olustur
            </Button>
          </div>
        ) : sorted.length === 0 && searchQuery.trim() ? (
          <div className="rounded-xl border border-dashed border-border/50 py-12 text-center">
            <Search className="mx-auto h-6 w-6 text-muted-foreground/40" />
            <p className="mt-2 text-[13px] text-muted-foreground">
              "{searchQuery}" icin sonuc bulunamadi
            </p>
          </div>
        ) : (
          <>
            {favorites.length > 0 && (
              <section>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-warning text-warning" /> Favoriler ({favorites.length})
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/10 overflow-hidden">
                  {favorites.map(v => (
                    <ViewRow key={v.id} view={v} isFav={true} isMine={v.owner_id === user?.id} onDuplicate={handleDuplicate} />
                  ))}
                </div>
              </section>
            )}

            {mine.length > 0 && (
              <section>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" /> Benim gorunumlerim ({mine.length})
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/10 overflow-hidden">
                  {mine.map(v => (
                    <ViewRow key={v.id} view={v} isFav={!!favIds?.has(v.id)} isMine={true} onDuplicate={handleDuplicate} />
                  ))}
                </div>
              </section>
            )}

            {shared.length > 0 && (
              <section>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Ekip paylasimlari ({shared.length})
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/10 overflow-hidden">
                  {shared.map(v => (
                    <ViewRow key={v.id} view={v} isFav={!!favIds?.has(v.id)} isMine={false} onDuplicate={handleDuplicate} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {createOpen && <EditDialog open={createOpen} onOpenChange={setCreateOpen} initial={null} />}
      </div>
    </DomainWorkspace>
  );
}
