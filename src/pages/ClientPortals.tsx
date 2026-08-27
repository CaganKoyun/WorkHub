import { useMemo, useState } from 'react';
import {
  useClientPortals, useCreateClientPortal, useUpdateClientPortal, useDeleteClientPortal,
  type ClientPortal,
} from '@/lib/client-portal-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Trash2, Copy, ExternalLink, ShieldOff, MessageCircle, MessageCircleOff, UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DomainWorkspace } from "@/components/DomainWorkspace";

function CreateDialog({ open, onOpenChange }: {
  open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const create = useCreateClientPortal();
  const { data: projects } = useProjects();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [projectIds, setProjectIds] = useState<Set<string>>(new Set());
  const [canComment, setCanComment] = useState(true);
  const [ttlDays, setTtlDays] = useState<number>(90);

  const toggle = (id: string) => {
    setProjectIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { toast.error('Ad ve e-posta zorunlu'); return; }
    if (projectIds.size === 0) { toast.error('En az bir proje seç'); return; }
    const exp = ttlDays > 0 ? new Date(Date.now() + ttlDays * 86_400_000).toISOString() : null;
    try {
      await create.mutateAsync({
        name: name.trim(),
        client_email: email.trim(),
        project_ids: [...projectIds],
        can_comment: canComment,
        expires_at: exp,
      });
      toast.success('Portal oluşturuldu');
      setName(''); setEmail(''); setProjectIds(new Set()); setCanComment(true); setTtlDays(90);
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const TTLS = [30, 90, 365, 0];
  const TTL_LBL = ['30 gün', '90 gün', '1 yıl', 'Süresiz'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Yeni müşteri portalı</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Portal adı</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Acme Corp — Q1 proje" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label>Müşteri e-postası</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="musteri@ornek.com" />
          </div>
          <div className="grid gap-1.5">
            <Label>Erişilebilir projeler</Label>
            <div className="max-h-32 overflow-y-auto rounded-md border border-border/60 p-2 space-y-1">
              {(projects ?? []).length === 0 && <div className="text-[11.5px] text-muted-foreground">Proje yok.</div>}
              {(projects ?? []).map(p => (
                <label key={p.id} className="flex items-center gap-2 text-[12.5px] cursor-pointer">
                  <input type="checkbox" checked={projectIds.has(p.id)} onChange={() => toggle(p.id)} className="h-3.5 w-3.5 accent-primary" />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Geçerlilik</Label>
            <div className="flex gap-1.5">
              {TTLS.map((d, i) => (
                <button key={d} type="button" onClick={() => setTtlDays(d)} className={cn(
                  'text-[12px] px-2.5 py-1 rounded border',
                  ttlDays === d
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-secondary/40 border-border text-muted-foreground',
                )}>{TTL_LBL[i]}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer">
            <input type="checkbox" checked={canComment} onChange={e => setCanComment(e.target.checked)} className="h-4 w-4 accent-primary" />
            Müşteri yorum yazabilsin
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={create.isPending}>Oluştur</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PortalRow({ p }: { p: ClientPortal }) {
  const update = useUpdateClientPortal();
  const del = useDeleteClientPortal();

  const url = `${window.location.origin}/portal/${p.token}`;
  const revoked = !!p.revoked_at;
  const expired = p.expires_at && new Date(p.expires_at) < new Date();

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Link kopyalandı'); }
    catch { toast.error('Kopyalanamadı'); }
  };
  const revoke = async () => {
    if (!confirm(`"${p.name}" portalını iptal et?`)) return;
    try { await update.mutateAsync({ id: p.id, revoked_at: new Date().toISOString() }); }
    catch (e: any) { toast.error(e.message); }
  };
  const doDelete = async () => {
    if (!confirm(`"${p.name}" portalını ve tüm yorumlarını sil?`)) return;
    try { await del.mutateAsync(p.id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className={cn(
      'group flex items-center gap-3 px-3 py-2 border-b border-border/40 last:border-b-0',
      (revoked || expired) && 'opacity-60',
    )}>
      <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{p.name}</span>
          {p.can_comment
            ? <MessageCircle className="h-3 w-3 text-primary" />
            : <MessageCircleOff className="h-3 w-3 text-muted-foreground" />}
          {revoked && <span className="chip bad">Revoked</span>}
          {expired && !revoked && <span className="chip warn">Expired</span>}
        </div>
        <div className="text-[11.5px] text-muted-foreground truncate">
          {p.client_email} · {p.project_ids.length} proje
          {p.expires_at && !expired && <> · sonu {new Date(p.expires_at).toLocaleDateString('tr-TR')}</>}
        </div>
      </div>
      <button onClick={copy} title="Link kopyala" className="h-7 w-7 grid place-items-center rounded hover:bg-secondary/60 text-muted-foreground">
        <Copy className="h-3.5 w-3.5" />
      </button>
      <a href={url} target="_blank" rel="noreferrer" title="Portalı aç" className="h-7 w-7 grid place-items-center rounded hover:bg-secondary/60 text-muted-foreground">
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      {!revoked && (
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11.5px] text-destructive opacity-0 group-hover:opacity-100" onClick={revoke}>
          <ShieldOff className="h-3 w-3" /> İptal et
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={doDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function ClientPortals() {
  const { data, isLoading } = useClientPortals();
  const [createOpen, setCreateOpen] = useState(false);

  const { active, inactive } = useMemo(() => {
    const rows = data ?? [];
    return {
      active:   rows.filter(p => !p.revoked_at && !(p.expires_at && new Date(p.expires_at) < new Date())),
      inactive: rows.filter(p =>  p.revoked_at ||  (p.expires_at && new Date(p.expires_at) < new Date())),
    };
  }, [data]);

  return (
    <DomainWorkspace
      domain="crm"
      title="Müşteri Portalları"
      subtitle="Dış paydaşlara login olmadan belirli projeleri gösteren token'lı sayfa."
      showAgent={false}
      maxWidth="max-w-3xl"
      headerActions={
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Yeni portal
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-1.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
          <UserRound className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-[13px] text-muted-foreground">Henüz portal yok.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Aktif ({active.length})</div>
              <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
                {active.map(p => <PortalRow key={p.id} p={p} />)}
              </div>
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">İptal / süresi geçmiş ({inactive.length})</div>
              <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
                {inactive.map(p => <PortalRow key={p.id} p={p} />)}
              </div>
            </section>
          )}
        </>
      )}

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </DomainWorkspace>
  );
}
