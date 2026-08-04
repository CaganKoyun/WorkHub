import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useDocs, useDoc, useCreateDoc, useUpdateDoc, useDeleteDoc,
  buildDocTree, type Doc, type DocNode,
} from '@/lib/docs-hooks';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronRight, ChevronDown, Plus, FileText, Trash2, Search, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function TreeRow({
  node, depth, activeId, expanded, onToggle, onSelect, onAddChild, onDelete,
}: {
  node: DocNode; depth: number; activeId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isActive = activeId === node.id;
  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        className={cn(
          'group flex items-center gap-1 rounded-md pr-1 py-1 cursor-pointer text-[13px]',
          isActive ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground',
        )}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
          className={cn(
            'h-4 w-4 grid place-items-center rounded hover:bg-secondary/60 shrink-0',
            !hasChildren && 'invisible',
          )}
        >
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {node.icon
          ? <span className="text-[13px] w-4 text-center">{node.icon}</span>
          : <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />}
        <span className="truncate flex-1">{node.title || 'Adsız sayfa'}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
          title="Alt sayfa ekle"
          className="h-5 w-5 grid place-items-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-secondary/60"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          title="Sil"
          className="h-5 w-5 grid place-items-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-secondary/60 text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {isOpen && node.children.map(c => (
        <TreeRow
          key={c.id}
          node={c}
          depth={depth + 1}
          activeId={activeId}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function DocEditor({ doc }: { doc: Doc }) {
  const update = useUpdateDoc();
  const [title, setTitle] = useState(doc.title);
  const [icon, setIcon] = useState(doc.icon ?? '');
  const [body, setBody] = useState(doc.body);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(doc.title);
    setIcon(doc.icon ?? '');
    setBody(doc.body);
    setDirty(false);
  }, [doc.id]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await update.mutateAsync({
          id: doc.id,
          title: title.trim() || 'Adsız sayfa',
          icon: icon.trim() || null,
          body,
        });
        setDirty(false);
      } catch (e: any) {
        toast.error(e.message ?? 'Kaydedilemedi');
      } finally {
        setSaving(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [title, icon, body, dirty, doc.id]);

  const change = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={icon}
          onChange={e => change(setIcon)(e.target.value)}
          placeholder="🗒️"
          maxLength={4}
          className="w-10 text-2xl bg-transparent focus:outline-none text-center"
        />
        <input
          value={title}
          onChange={e => change(setTitle)(e.target.value)}
          placeholder="Adsız sayfa"
          className="flex-1 text-[28px] font-semibold tracking-tight bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
        />
        <span className={cn(
          'text-[11px] transition-opacity',
          saving ? 'text-muted-foreground opacity-100'
            : dirty ? 'text-amber-500 opacity-100'
            : 'opacity-0',
        )}>
          {saving ? 'Kaydediliyor…' : dirty ? 'Kaydedilmedi' : ''}
        </span>
      </div>
      <RichTextEditor
        value={body}
        onChange={change(setBody)}
        placeholder="Buradan yazmaya başla…"
        minHeight={480}
        className="border-none bg-transparent"
      />
    </div>
  );
}

export default function Docs() {
  const { id: routeId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { data: docs, isLoading } = useDocs();
  const createDoc = useCreateDoc();
  const deleteDoc = useDeleteDoc();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');

  const tree = useMemo(() => buildDocTree(docs ?? []), [docs]);
  const filteredTree = useMemo(() => {
    if (!q.trim()) return tree;
    const needle = q.toLowerCase();
    const filter = (nodes: DocNode[]): DocNode[] =>
      nodes.map(n => {
        const kids = filter(n.children);
        if (n.title.toLowerCase().includes(needle) || kids.length) {
          return { ...n, children: kids };
        }
        return null;
      }).filter((n): n is DocNode => n !== null);
    return filter(tree);
  }, [tree, q]);

  const activeId = routeId ?? (tree[0]?.id ?? null);
  const { data: activeDoc, isFetching: docFetching } = useDoc(activeId ?? undefined);

  useEffect(() => {
    if (!routeId && tree[0]) navigate(`/docs/${tree[0].id}`, { replace: true });
  }, [routeId, tree, navigate]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addRoot = async () => {
    try {
      const d = await createDoc.mutateAsync({});
      navigate(`/docs/${d.id}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const addChild = async (parentId: string) => {
    try {
      const d = await createDoc.mutateAsync({ parent_id: parentId });
      setExpanded(prev => new Set(prev).add(parentId));
      navigate(`/docs/${d.id}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async (id: string) => {
    if (!confirm('Sayfayı ve tüm alt sayfalarını sil?')) return;
    try {
      await deleteDoc.mutateAsync(id);
      if (activeId === id) navigate('/docs');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex h-[calc(100vh-52px)]">
      <aside className="w-[260px] shrink-0 border-r border-border/60 flex flex-col">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <div className="flex items-center gap-1.5 text-[13px] font-medium">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            Docs
          </div>
          <Button
            size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[11.5px]"
            onClick={addRoot} disabled={createDoc.isPending}
          >
            <Plus className="h-3 w-3" /> Yeni
          </Button>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Sayfa ara…"
              className="h-7 pl-6 text-[12px]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {isLoading ? (
            <div className="space-y-1.5 px-1 py-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              {q ? 'Eşleşme yok.' : 'Henüz sayfa yok. Yukarıdan “Yeni” ile başla.'}
            </div>
          ) : (
            filteredTree.map(n => (
              <TreeRow
                key={n.id}
                node={n}
                depth={0}
                activeId={activeId}
                expanded={expanded}
                onToggle={toggle}
                onSelect={id => navigate(`/docs/${id}`)}
                onAddChild={addChild}
                onDelete={doDelete}
              />
            ))
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {!activeId ? (
          <div className="mx-auto max-w-lg pt-32 text-center text-muted-foreground">
            <BookOpen className="mx-auto h-8 w-8 opacity-40" />
            <p className="mt-3 text-[13px]">Bir sayfa seç veya soldan yeni bir tane oluştur.</p>
          </div>
        ) : docFetching && !activeDoc ? (
          <div className="mx-auto max-w-3xl px-8 py-10 space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-64" />
          </div>
        ) : activeDoc ? (
          <DocEditor key={activeDoc.id} doc={activeDoc} />
        ) : (
          <div className="mx-auto max-w-lg pt-32 text-center text-[13px] text-muted-foreground">
            Sayfa bulunamadı.
          </div>
        )}
      </main>
    </div>
  );
}
