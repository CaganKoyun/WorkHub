import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '@/lib/projects-hooks';
import { useCycles } from '@/lib/cycles-hooks';
import type { Project } from '@/lib/projects-types';
import { PROJECT_STATUS_LABELS } from '@/lib/projects-types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CalendarClock, Layers, Rocket } from 'lucide-react';
import {
  computeRange, positionItems, monthTicks, todayMarker, toDate,
} from '@/lib/roadmap';
import { cn } from '@/lib/utils';

const STATUS_BAR: Record<Project['status'], string> = {
  planned: 'bg-info/70',
  active: 'bg-success/80',
  on_hold: 'bg-warning/80',
  completed: 'bg-primary/70',
  archived: 'bg-muted-foreground/40',
};

export default function Roadmap() {
  const { data: projects, isLoading, isError } = useProjects();
  const { data: cycles } = useCycles();

  const active = useMemo(
    () => (projects ?? []).filter(p => !p.is_archived && p.status !== 'archived'),
    [projects],
  );

  const today = new Date();
  const range = useMemo(
    () => computeRange(active.map(p => ({
      id: p.id, start: toDate(p.start_date), end: toDate(p.end_date),
    })), today),
    [active],
  );
  const positions = useMemo(
    () => positionItems(active.map(p => ({
      id: p.id, start: toDate(p.start_date), end: toDate(p.end_date),
    })), range),
    [active, range],
  );
  const posById = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);
  const ticks = useMemo(() => monthTicks(range), [range]);
  const nowLeft = useMemo(() => todayMarker(range, today), [range]);

  const cyclePositions = useMemo(() => {
    if (!cycles) return [];
    return positionItems(
      cycles.map(c => ({
        id: c.id, start: toDate(c.start_date), end: toDate(c.end_date),
      })),
      range,
    ).map((p, i) => ({ ...p, cycle: cycles[i] }));
  }, [cycles, range]);

  if (isLoading || (!isError && !projects)) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Could not load roadmap</p>
          <p className="text-xs text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight">
            <Rocket className="h-5 w-5 text-primary" /> Roadmap
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Projeler zaman ekseninde. Gri bantlar aktif/planlı cycle'lar.
          </p>
        </div>
        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          {active.length} proje
        </span>
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-[13px] text-muted-foreground">
          Henüz proje yok. <Link to="/projects/new" className="text-primary hover:underline">Yeni proje</Link>.
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin rounded-xl border border-border bg-card elevation-1">
          <div className="min-w-[720px]">
          {/* Month header */}
          <div className="flex border-b border-border">
            <div className="w-56 shrink-0 border-r border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <CalendarClock className="mr-1 inline h-3 w-3" /> Proje
            </div>
            <div className="relative h-8 flex-1">
              {ticks.map(t => (
                <span
                  key={t.leftPct}
                  className="absolute top-1.5 -translate-x-1/2 text-[10.5px] font-medium text-muted-foreground"
                  style={{ left: `${t.leftPct}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {/* cycle stripes overlay (behind rows) */}
            <div className="pointer-events-none absolute inset-y-0 left-56 right-0">
              {cyclePositions.filter(c => c.scheduled).map(c => (
                <div
                  key={c.id}
                  className={cn(
                    'absolute inset-y-0 border-x border-dashed',
                    c.cycle?.status === 'active'
                      ? 'border-primary/40 bg-primary/[0.04]'
                      : 'border-border/60 bg-secondary/30',
                  )}
                  style={{ left: `${c.leftPct}%`, width: `${c.widthPct}%` }}
                  title={c.cycle?.name}
                />
              ))}
              {/* today line */}
              {nowLeft !== null && (
                <div
                  className="absolute inset-y-0 w-px bg-destructive/70"
                  style={{ left: `${nowLeft}%` }}
                  title="Bugün"
                />
              )}
            </div>

            {active.map(p => {
              const pos = posById.get(p.id)!;
              return (
                <div key={p.id} className="relative flex border-b border-border/60 last:border-0 hover:bg-secondary/30">
                  <div className="w-56 shrink-0 border-r border-border/60 px-4 py-3">
                    <Link to={`/projects/${p.id}`} className="block truncate text-[13px] font-medium hover:text-primary">
                      {p.name}
                    </Link>
                    <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="relative h-14 flex-1">
                    {pos.scheduled ? (
                      <Link
                        to={`/projects/${p.id}`}
                        className={cn(
                          'absolute top-1/2 h-6 -translate-y-1/2 rounded-md border border-white/10 elevation-1 transition-transform hover:scale-y-105',
                          STATUS_BAR[p.status],
                        )}
                        style={{ left: `${pos.leftPct}%`, width: `${pos.widthPct}%` }}
                        title={`${p.name} · ${p.start_date} → ${p.end_date}`}
                      />
                    ) : (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background/40 px-2 py-0.5 text-[10.5px] text-muted-foreground">
                        <Layers className="h-3 w-3" /> tarih yok
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
