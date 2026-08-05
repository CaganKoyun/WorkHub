import { useMemo, useState } from 'react';
import {
  useApiTokens, useCreateApiToken, useRevokeApiToken, useDeleteApiToken,
  SCOPE_LABELS, type ApiToken, type TokenScope,
} from '@/lib/api-tokens-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  KeyRound, Plus, Copy, Trash2, AlertTriangle, Check, ShieldOff, Clock, Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SCOPE_OPTIONS: TokenScope[] = ['read', 'write', 'admin'];
const TTL_OPTIONS = [
  { label: '30 gün',   days: 30 },
  { label: '90 gün',   days: 90 },
  { label: '1 yıl',    days: 365 },
  { label: 'Süresiz',  days: 0 },
];

function daysFromNow(days: number): string | null {
  if (days === 0) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}sn önce`;
  if (s < 3600) return `${Math.round(s / 60)}dk önce`;
  if (s < 86400) return `${Math.round(s / 3600)}sa önce`;
  return `${Math.round(s / 86400)}g önce`;
}

// ---- Reveal dialog (shown once after creation) --------------------------

function RevealDialog({ token, onClose }: { token: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error('Kopyalanamadı'); }
  };
  return (
    <Dialog open={true} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Yeni API token oluşturuldu</DialogTitle></DialogHeader>
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12.5px] flex gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
          <div>Token yalnızca <strong>şimdi</strong> gösterilecek. Kaydet — sayfayı kapatınca bir daha erişemezsin.</div>
        </div>
        <div className="rounded-md border border-border/60 bg-background px-3 py-2 mt-2 font-mono text-[12px] break-all">{token}</div>
        <div className="flex justify-between items-center mt-3">
          <Button size="sm" variant="ghost" onClick={copy} className="h-8 gap-1.5">
            {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Kopyalandı</> : <><Copy className="h-3.5 w-3.5" /> Kopyala</>}
          </Button>
          <Button size="sm" onClick={onClose}>Kaydettim, kapat</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Create dialog ------------------------------------------------------

function CreateDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onCreated: (raw: string) => void;
}) {
  const create = useCreateApiToken();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Set<TokenScope>>(new Set(['read']));
  const [ttlDays, setTtlDays] = useState<number>(90);

  const toggleScope = (s: TokenScope) => {
    setScopes(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      if (next.size === 0) next.add('read');
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Ad zorunlu'); return; }
    try {
      const r = await create.mutateAsync({
        name: name.trim(),
        scopes: [...scopes],
        expires_at: daysFromNow(ttlDays),
      });
      setName(''); setScopes(new Set(['read'])); setTtlDays(90);
      onOpenChange(false);
      onCreated(r.token);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Yeni API token</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Zapier entegrasyonu" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label>Yetkiler</Label>
            <div className="flex gap-1.5">
              {SCOPE_OPTIONS.map(s => (
                <button
                  key={s} type="button" onClick={() => toggleScope(s)}
                  className={cn(
                    'text-[12px] px-2.5 py-1 rounded border',
                    scopes.has(s)
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-secondary/40 border-border text-muted-foreground',
                  )}
                >{SCOPE_LABELS[s]}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Geçerlilik</Label>
            <div className="flex gap-1.5">
              {TTL_OPTIONS.map(o => (
                <button
                  key={o.days} type="button" onClick={() => setTtlDays(o.days)}
                  className={cn(
                    'text-[12px] px-2.5 py-1 rounded border',
                    ttlDays === o.days
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-secondary/40 border-border text-muted-foreground',
                  )}
                >{o.label}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={create.isPending}>Oluştur</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Row ---------------------------------------------------------------

function TokenRow({ t }: { t: ApiToken }) {
  const revoke = useRevokeApiToken();
  const del = useDeleteApiToken();
  const revoked = !!t.revoked_at;
  const expired = t.expires_at && new Date(t.expires_at).getTime() < Date.now();

  const doRevoke = async () => {
    if (!confirm(`"${t.name}" token'ını iptal et? Anında geçersiz olur.`)) return;
    try { await revoke.mutateAsync(t.id); toast.success('İptal edildi'); }
    catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async () => {
    if (!confirm(`"${t.name}" kaydını tamamen sil? (Audit izi kaybolur.)`)) return;
    try { await del.mutateAsync(t.id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className={cn(
      'group flex items-center gap-3 px-3 py-2 border-b border-border/40 last:border-b-0',
      (revoked || expired) && 'opacity-60',
    )}>
      <KeyRound className={cn('h-3.5 w-3.5 shrink-0', revoked || expired ? 'text-muted-foreground' : 'text-primary')} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{t.name}</span>
          {t.scopes.map(s => <span key={s} className="text-[10px] uppercase tracking-wider rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-muted-foreground">{SCOPE_LABELS[s]}</span>)}
          {revoked && <span className="text-[10px] uppercase tracking-wider rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-destructive">Revoked</span>}
          {expired && !revoked && <span className="text-[10px] uppercase tracking-wider rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-400">Expired</span>}
        </div>
        <div className="text-[11.5px] text-muted-foreground flex items-center gap-3 mt-0.5">
          <span className="font-mono text-muted-foreground/80">{t.token_prefix}…</span>
          <span>Oluşturuldu: {new Date(t.created_at).toLocaleDateString('tr-TR')}</span>
          {t.last_used_at && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Son kullanım: {timeAgo(t.last_used_at)}</span>}
          {t.expires_at && !expired && <span>Sonu: {new Date(t.expires_at).toLocaleDateString('tr-TR')}</span>}
        </div>
      </div>
      {!revoked && !expired && (
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11.5px] text-destructive opacity-0 group-hover:opacity-100" onClick={doRevoke}>
          <ShieldOff className="h-3 w-3" /> İptal et
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={doDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ---- Page --------------------------------------------------------------

export default function ApiTokens() {
  const { data: tokens, isLoading } = useApiTokens();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTokenRaw, setNewTokenRaw] = useState<string | null>(null);

  const { active, inactive } = useMemo(() => {
    const rows = tokens ?? [];
    return {
      active:   rows.filter(t => !t.revoked_at && !(t.expires_at && new Date(t.expires_at) < new Date())),
      inactive: rows.filter(t =>  t.revoked_at ||  (t.expires_at && new Date(t.expires_at) < new Date())),
    };
  }, [tokens]);

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? 'https://<project>.supabase.co';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" /> API tokens
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Kişisel access token'lar (PAT) — otomasyon, script, Zapier gibi
            harici entegrasyonlar için. Token yalnızca oluşturma anında bir kez
            gösterilir; SHA-256 hash olarak saklanır. Kaybedilen token yeniden
            gösterilemez — iptal edip yenisini oluştur.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Yeni token
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (tokens ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-[13px] text-muted-foreground">Henüz token yok.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Aktif ({active.length})</div>
              <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
                {active.map(t => <TokenRow key={t.id} t={t} />)}
              </div>
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">İptal / süresi geçmiş ({inactive.length})</div>
              <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
                {inactive.map(t => <TokenRow key={t.id} t={t} />)}
              </div>
            </section>
          )}
        </>
      )}

      <section className="rounded-md border border-border/60 bg-secondary/10 p-4 mt-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Terminal className="h-3 w-3" /> Kullanım (curl örneği)</div>
        <p className="text-[12px] text-muted-foreground mb-2">
          Token'ı <code className="font-mono text-[11px] bg-background border border-border rounded px-1">Authorization: Bearer &lt;token&gt;</code> başlığında yolla. Örnek: aktif task'ları çek.
        </p>
        <pre className="rounded-md bg-background border border-border p-3 text-[11px] font-mono overflow-x-auto"><code>{`curl -H "Authorization: Bearer whu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
     -H "apikey: <ANON_KEY>" \\
     "${supabaseUrl}/rest/v1/tasks?select=id,title,status&status=eq.in_progress&limit=20"`}</code></pre>
        <p className="text-[11px] text-muted-foreground mt-2">
          Not: v1'de token doğrulama Edge Function proxy'si üzerinden yapılacak; şu an sadece storage + admin katmanı aktif.
          <code className="font-mono text-[11px] bg-background border border-border rounded px-1 ml-1">verify_api_token(raw)</code> RPC hazır.
        </p>
      </section>

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setNewTokenRaw} />
      {newTokenRaw && <RevealDialog token={newTokenRaw} onClose={() => setNewTokenRaw(null)} />}
    </div>
  );
}
