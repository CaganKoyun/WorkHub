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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>{initial ? 'Kaydet' : 'Oluştur'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Row ------------------------------------------------------------------

function ViewRow({ view, isFav, isMine }: { view: SavedView; isFav: boolean; isMine: boolean }) {
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
    <div className="group flex items-center gap-3 px-3 py-2 border-b border-border/40 last:border-b-0 hover:bg-sidebar-accent/25">
      <button
        onClick={() => tog.mutate({ viewId: view.id, isFav })}
        title={isFav ? 'Favoriden çıkar' : 'Favoriye ekle'}
        className="text-muted-foreground hover:text-amber-400"
      >
        <Star className={cn('h-3.5 w-3.5', isFav && 'fill-amber-400 text-amber-400')} />
      </button>
      <Link to={viewToUrl(view)} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{view.name}</span>
          <span className="chip">{TARGET_LABELS[view.target]}</span>
          {view.is_shared
            ? <Users className="h-3 w-3 text-muted-foreground" />
            : <User className="h-3 w-3 text-muted-foreground" />}
        </div>
        {view.description && <div className="text-[11.5px] text-muted-foreground truncate">{view.description}</div>}
        {filterChips.length > 0 && (
          <div className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{filterChips.join(' · ')}</div>
        )}
      </Link>
      <Link to={viewToUrl(view)} className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground">Aç <ArrowRight className="h-3 w-3" /></Link>
      {isMine && (
        <>
          <Button size="sm" variant="ghost" className="h-7 text-[11.5px] opacity-0 group-hover:opacity-100" onClick={() => setEditOpen(true)}>Düzenle</Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={doDelete}><Trash2 className="h-3 w-3" /></Button>
        </>
      )}
      {editOpen && <EditDialog open={editOpen} onOpenChange={setEditOpen} initial={view} />}
    </div>
  );
}

// ---- Page -----------------------------------------------------------------

export default function SavedViews() {
  const { data: views, isLoading } = useSavedViews();
  const { data: favIds } = useFavoriteViewIds();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const mine = useMemo(() => (views ?? []).filter(v => v.owner_id === user?.id), [views, user]);
  const shared = useMemo(() => (views ?? []).filter(v => v.owner_id !== user?.id && v.is_shared), [views, user]);
  const favorites = useMemo(() => (views ?? []).filter(v => favIds?.has(v.id)), [views, favIds]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-muted-foreground" /> Kaydedilmiş görünümler
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Sık kullandığın filtre + sıralama kombinasyonlarını kaydet, favoriye ekle,
            workspace ile paylaş. Görünüme tıkla → ilgili sayfa filtreli açılır.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Yeni görünüm
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (views ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-[13px] text-muted-foreground">Henüz kayıtlı görünüm yok.</p>
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <section>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Favoriler ({favorites.length})
              </div>
              <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
                {favorites.map(v => (
                  <ViewRow key={v.id} view={v} isFav={true} isMine={v.owner_id === user?.id} />
                ))}
              </div>
            </section>
          )}

          {mine.length > 0 && (
            <section>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" /> Benim görünümlerim ({mine.length})
              </div>
              <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
                {mine.map(v => (
                  <ViewRow key={v.id} view={v} isFav={!!favIds?.has(v.id)} isMine={true} />
                ))}
              </div>
            </section>
          )}

          {shared.length > 0 && (
            <section>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Ekip paylaşımları ({shared.length})
              </div>
              <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
                {shared.map(v => (
                  <ViewRow key={v.id} view={v} isFav={!!favIds?.has(v.id)} isMine={false} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {createOpen && <EditDialog open={createOpen} onOpenChange={setCreateOpen} initial={null} />}
    </div>
  );
}
