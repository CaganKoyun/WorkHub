import { useMemo, useState } from 'react';
import {
  useAgentRuns, useCreateAgentRun, useMarkAgentRunStarted, useFinalizeAgentRun,
  useDeleteAgentRun, type AgentRun, type AgentRunResult,
} from '@/lib/agent-runs-hooks';
import { parseDirective, type PlanStep, AGENT_TOOLS } from '@/lib/agent-parse';
import { executeStep } from '@/lib/agent-exec';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers } from '@/lib/chat-hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bot, Sparkles, Play, CheckCircle2, AlertTriangle, XCircle, Trash2,
  ChevronRight, ChevronDown, Wand2,
} from 'lucide-react';
import { MicButton } from '@/components/MicButton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EXAMPLES = [
  "acil bug'ları Mehmet'e ata",
  "tamamlananları kapat",
  "in progress task'lara #escalated etiket ekle",
  "bir hafta güncellenmeyen taskları Cagan'e bildir",
  "high priority tasks assign to Ayse",
];

function statusIcon(s: AgentRun['status']) {
  switch (s) {
    case 'succeeded': return { Icon: CheckCircle2, tone: 'text-success' };
    case 'partial':   return { Icon: AlertTriangle, tone: 'text-warning' };
    case 'failed':    return { Icon: XCircle, tone: 'text-destructive' };
    case 'running':   return { Icon: Play, tone: 'text-primary animate-pulse' };
    case 'canceled':  return { Icon: XCircle, tone: 'text-muted-foreground' };
    default:          return { Icon: ChevronRight, tone: 'text-muted-foreground' };
  }
}

// ---- Composer + preview ------------------------------------------------

function Composer() {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseDirective(text), [text]);
  const create = useCreateAgentRun();
  const markStarted = useMarkAgentRunStarted();
  const finalize = useFinalizeAgentRun();
  const { currentWorkspace } = useWorkspace();
  const { data: members } = useWorkspaceMembers();
  const [running, setRunning] = useState(false);

  const runNow = async () => {
    if (!currentWorkspace) return;
    if (parsed.plan.length === 0 || parsed.plan[0].tool === 'noop') {
      toast.error('Uygulanabilir plan yok'); return;
    }
    setRunning(true);
    try {
      const run = await create.mutateAsync({ prompt: text.trim(), plan: parsed.plan });
      await markStarted.mutateAsync(run.id);

      const results: AgentRunResult[] = [];
      for (let i = 0; i < parsed.plan.length; i++) {
        const r = await executeStep(parsed.plan[i], {
          workspaceId: currentWorkspace.id,
          members: members ?? [],
        });
        results.push({ ...r, step_index: i });
      }
      const oks = results.filter(r => r.ok).length;
      const status: AgentRun['status'] =
        oks === results.length ? 'succeeded'
        : oks === 0            ? 'failed'
        :                        'partial';
      await finalize.mutateAsync({ id: run.id, results, status });
      toast.success(`${oks}/${results.length} adım tamamlandı`);
      setText('');
    } catch (e: any) {
      toast.error(e.message ?? 'Çalıştırılamadı');
    } finally {
      setRunning(false);
    }
  };

  const disabled = running || create.isPending || parsed.plan.length === 0 || parsed.plan[0].tool === 'noop';

  return (
    <section className="space-y-3">
      <div className="rounded-md border border-border/60 bg-background focus-within:border-primary/60">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !disabled) { e.preventDefault(); runNow(); } }}
          placeholder="Direktifi yaz — ör. acil bug'ları Mehmet'e ata"
          rows={3}
          className="w-full bg-transparent px-3 py-2.5 text-[13.5px] focus:outline-none resize-none"
        />
        <div className="flex items-center gap-1.5 flex-wrap border-t border-border/40 px-2.5 py-1.5">
          <MicButton
            size="sm"
            onFinal={(t) => setText(prev => (prev ? prev + ' ' : '') + t)}
            title="Direktifi sesli yaz"
          />
          <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Örnekler:</span>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => setText(e)}
              className="text-[11px] px-2 py-0.5 rounded border border-border bg-secondary/40 text-muted-foreground hover:text-foreground">
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Plan preview */}
      {text.trim() && (
        <div className="rounded-md border border-border/60 bg-secondary/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wand2 className="h-3 w-3" /> Plan ({parsed.plan.length} adım)
            </div>
            <Button size="sm" onClick={runNow} disabled={disabled} className="h-7 gap-1.5">
              <Play className="h-3 w-3" /> Uygula {disabled ? '' : '⌘↵'}
            </Button>
          </div>
          {parsed.plan.map((s, i) => <PlanStepRow key={i} step={s} idx={i} />)}
        </div>
      )}
    </section>
  );
}

function PlanStepRow({ step, idx }: { step: PlanStep; idx: number }) {
  const tool = AGENT_TOOLS.find(t => t.id === step.tool);
  const isNoop = step.tool === 'noop';
  return (
    <div className={cn(
      'flex items-start gap-2.5 text-[12.5px] py-1',
      isNoop && 'text-muted-foreground',
    )}>
      <span className="font-mono text-[10.5px] text-muted-foreground w-4 tabular-nums shrink-0 pt-0.5">{idx + 1}.</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider',
            isNoop ? 'bg-secondary/40 text-muted-foreground' : 'bg-primary/15 text-primary')}>{tool?.label ?? step.tool}</span>
          <span>{step.description}</span>
        </div>
      </div>
    </div>
  );
}

// ---- History ------------------------------------------------------------

function RunRow({ run }: { run: AgentRun }) {
  const del = useDeleteAgentRun();
  const [open, setOpen] = useState(false);
  const { Icon, tone } = statusIcon(run.status);

  const doDelete = async () => {
    if (!confirm('Bu çalıştırma kaydını sil?')) return;
    try { await del.mutateAsync(run.id); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 hover:bg-sidebar-accent/25 text-left"
      >
        <Icon className={cn('h-4 w-4 shrink-0', tone)} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate">"{run.prompt}"</div>
          <div className="text-[11px] text-muted-foreground">
            {run.plan.length} adım · {run.status}
            {run.finished_at && ` · ${Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at ?? run.created_at).getTime()) / 1000)}sn`}
            {' · '}{new Date(run.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border/40 bg-background/60 px-3 py-2 space-y-1.5">
          {run.plan.map((s, i) => {
            const r = run.results.find(x => x.step_index === i);
            return (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <span className={cn('h-3 w-3 rounded-full shrink-0 mt-1',
                  r?.ok ? 'bg-success' : r?.error ? 'bg-destructive' : 'bg-muted-foreground/40')} />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground">{s.description}</div>
                  {r && (
                    <div className={cn('text-[11px] mt-0.5', r.ok ? 'text-success/90' : 'text-destructive/90')}>
                      {r.detail ?? r.error ?? ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex justify-end pt-1">
            <Button size="sm" variant="ghost" className="h-6 gap-1 text-destructive text-[11.5px]" onClick={doDelete}>
              <Trash2 className="h-3 w-3" /> Kaydı sil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Page ---------------------------------------------------------------

export default function AgentRuns() {
  const { data: runs, isLoading } = useAgentRuns();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
          <Bot className="h-5 w-5 text-muted-foreground" /> Agent runs
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Doğal dilde direktif yaz — Spark WorkHub bunu adım listesine çevirir.
          Sen "Uygula"ya basınca çalıştırır ve sonucu loglar. Şimdilik heuristik
          parser; LLM planner ileride aynı kontrata yerleşir.
        </p>
      </div>

      <Composer />

      <section>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Geçmiş ({runs?.length ?? 0})
        </div>
        {isLoading ? (
          <div className="space-y-1.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (runs ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 py-10 text-center text-[13px] text-muted-foreground">
            Henüz agent çalıştırması yok.
          </div>
        ) : (
          <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
            {runs!.map(r => <RunRow key={r.id} run={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}
