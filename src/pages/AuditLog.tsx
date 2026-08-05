import { useMemo, useState } from 'react';
import {
  useAuditLog, ACTION_LABELS, ENTITY_LABELS, type AuditRow,
} from '@/lib/audit-log-hooks';
import { useWorkspaceMembers } from '@/lib/chat-hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield, Plus, Pencil, Trash2, Circle, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_TONE: Record<string, string> = {
  created: 'ok', updated: 'muted', deleted: 'bad', enabled: 'ok', disabled: 'muted', status_changed: 'muted',
};
const TONE_CLASS: Record<string, string> = {
  ok: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  muted: 'text-muted-foreground bg-secondary/40 border-border',
  bad: 'text-destructive bg-destructive/10 border-destructive/30',
};

function actionKind(action: string): 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled' | 'status_changed' | 'other' {
  const suffix = action.split('.').slice(-1)[0];
  if (['created', 'updated', 'deleted', 'enabled', 'disabled', 'status_changed'].includes(suffix)) {
    return suffix as 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled' | 'status_changed';
  }
  return 'other';
}

function Icon({ kind }: { kind: string }) {
  if (kind === 'created' || kind === 'enabled') return <Plus className="h-3 w-3" />;
  if (kind === 'deleted') return <Trash2 className="h-3 w-3" />;
  if (kind === 'updated' || kind === 'status_changed') return <Pencil className="h-3 w-3" />;
  if (kind === 'disabled') return <Circle className="h-3 w-3" />;
  return <Circle className="h-3 w-3" />;
}

function LogRow({ row }: { row: AuditRow }) {
  const { data: members } = useWorkspaceMembers();
  const [open, setOpen] = useState(false);
  const membersById = useMemo(() => new Map((members ?? []).map(m => [m.user_id, m])), [members]);

  const kind = actionKind(row.action);
  const tone = TONE_CLASS[ACTION_TONE[kind] ?? 'muted'];
  const actor = row.actor_id ? membersById.get(row.actor_id) : null;
  const label = ACTION_LABELS[row.action] ?? row.action;
  const entityLabel = ENTITY_LABELS[row.entity_type] ?? row.entity_type;
  const hasDetail = row.changed_keys.length > 0 || row.before || row.after || Object.keys(row.metadata).length > 0;

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => hasDetail && setOpen(v => !v)}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2 text-left transition',
          hasDetail ? 'hover:bg-sidebar-accent/25 cursor-pointer' : 'cursor-default',
        )}
      >
        <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full border', tone)}>
          <Icon kind={kind} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium">{label}</span>
            <span className="text-[11px] text-muted-foreground">— {entityLabel}</span>
            {row.entity_label && (
              <span className="truncate text-[12px] text-muted-foreground/90">"{row.entity_label}"</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {actor?.full_name ?? 'sistem'} · {new Date(row.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {row.changed_keys.length > 0 && ` · ${row.changed_keys.length} alan değişti`}
          </div>
        </div>
        {hasDetail && (open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />)}
      </button>
      {open && hasDetail && (
        <div className="border-t border-border/40 bg-background/60 px-3 py-2 space-y-1.5">
          {row.changed_keys.length > 0 && (
            <div className="text-[11.5px]">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Değişen: </span>
              {row.changed_keys.map(k => (
                <span key={k} className="inline-block rounded bg-secondary/60 px-1.5 py-0.5 mr-1 text-[11px] font-mono">{k}</span>
              ))}
            </div>
          )}
          {(row.before || row.after) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {row.before && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Önce</div>
                  <pre className="rounded bg-destructive/5 border border-destructive/20 p-2 text-[11px] whitespace-pre-wrap font-mono overflow-x-auto">{JSON.stringify(row.before, null, 2)}</pre>
                </div>
              )}
              {row.after && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sonra</div>
                  <pre className="rounded bg-emerald-500/5 border border-emerald-500/20 p-2 text-[11px] whitespace-pre-wrap font-mono overflow-x-auto">{JSON.stringify(row.after, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
          {Object.keys(row.metadata).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Metadata</div>
              <pre className="rounded bg-secondary/40 p-2 text-[11px] whitespace-pre-wrap font-mono overflow-x-auto">{JSON.stringify(row.metadata, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ENTITY_OPTIONS: (string | 'all')[] = ['all', 'task', 'project', 'automation', 'custom_field'];
const ACTION_OPTIONS: string[] = ['all', 'task', 'project', 'automation', 'custom_field'];

export default function AuditLog() {
  const [entity, setEntity] = useState<string>('all');
  const [actor, setActor] = useState<string>('all');
  const [action, setAction] = useState<string>('all');
  const [offset, setOffset] = useState(0);
  const { data: members } = useWorkspaceMembers();

  const filters = {
    entity_type: entity !== 'all' ? entity : undefined,
    actor_id: actor !== 'all' ? actor : undefined,
    action_prefix: action !== 'all' ? action : undefined,
    limit: 50,
    offset,
  };
  const { data, isLoading, isFetching } = useAuditLog(filters);
  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" /> Audit log
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Workspace'te olan biten her önemli olay — task/proje/otomasyon/custom
          field oluşturma, güncelleme, silme. Sadece admin görebilir; silme dışında
          değiştirilemez.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Tip:</span>
          <Select value={entity} onValueChange={v => { setEntity(v); setOffset(0); }}>
            <SelectTrigger className="h-7 w-32 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o === 'all' ? 'Tümü' : (ENTITY_LABELS[o] ?? o)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Aksiyon:</span>
          <Select value={action} onValueChange={v => { setAction(v); setOffset(0); }}>
            <SelectTrigger className="h-7 w-32 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o === 'all' ? 'Tümü' : `${o}.*`}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Kim:</span>
          <Select value={actor} onValueChange={v => { setActor(v); setOffset(0); }}>
            <SelectTrigger className="h-7 w-40 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {(members ?? []).map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name ?? m.user_id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center text-[13px] text-muted-foreground">
          Kayıt yok. Bu workspace'de henüz izlenen bir olay olmamış olabilir; ya da bu filtreye uyan yok.
        </div>
      ) : (
        <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
          {rows.map(r => <LogRow key={r.id} row={r} />)}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          {rows.length > 0 ? `${offset + 1}–${offset + rows.length}` : '0'} sonuç
          {isFetching && ' · yükleniyor…'}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>← Önceki</Button>
          <Button size="sm" variant="ghost" disabled={rows.length < 50} onClick={() => setOffset(offset + 50)}>Sonraki →</Button>
        </div>
      </div>
    </div>
  );
}
