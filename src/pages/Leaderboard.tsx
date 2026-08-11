import { useMemo, useState } from 'react';
import {
  useLeaderboard, useMyStreak, useMyXpFeed, computeAchievements,
  KIND_LABELS, type LeaderboardRow, type XpEvent,
} from '@/lib/gamification-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { DomainWorkspace } from '@/components/DomainWorkspace';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Trophy, Flame, Zap, Crown, TrendingUp, TrendingDown, Minus,
  Medal, Award, Sparkles, AlertTriangle, Users, User,
  Target, MessageSquare, Lightbulb, CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TimeRange = 'week' | 'month' | 'all';

function shortAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}sn once`;
  if (s < 3600) return `${Math.round(s / 60)}dk once`;
  if (s < 86400) return `${Math.round(s / 3600)}sa once`;
  const d = Math.round(s / 86400);
  return d < 30 ? `${d}g once` : new Date(iso).toLocaleDateString('tr-TR');
}

function filterByRange(board: LeaderboardRow[], events: XpEvent[], range: TimeRange): LeaderboardRow[] {
  if (range === 'all') return board;
  const now = Date.now();
  const cutoff = range === 'week' ? now - 7 * 86400_000 : now - 30 * 86400_000;
  // Build per-user XP totals from events within the range
  const xpByUser = new Map<string, { xp: number; count: number }>();
  for (const e of events) {
    if (new Date(e.created_at).getTime() >= cutoff) {
      const prev = xpByUser.get(e.user_id) ?? { xp: 0, count: 0 };
      prev.xp += e.points;
      prev.count += 1;
      xpByUser.set(e.user_id, prev);
    }
  }
  // If we don't have per-user events (we only have the current user's feed),
  // fall back to the full board — the filter is best-effort client-side
  if (xpByUser.size === 0) return board;
  return board
    .map(r => {
      const u = xpByUser.get(r.user_id);
      if (!u) return { ...r, total_xp: 0, event_count: 0 };
      return { ...r, total_xp: u.xp, event_count: u.count };
    })
    .sort((a, b) => b.total_xp - a.total_xp);
}

/** Group board rows into teams (by name prefix before space, or "Diger") */
function groupByTeam(board: LeaderboardRow[]): { team: string; xp: number; members: number; topMember: string | null }[] {
  const map = new Map<string, { xp: number; members: number; topMember: string | null; topXp: number }>();
  for (const r of board) {
    // Use first word of the name as a crude team proxy
    const parts = (r.full_name ?? '').trim().split(/\s+/);
    const team = parts.length > 1 ? `Takim ${parts[0][0]?.toUpperCase() ?? '?'}` : 'Diger';
    const prev = map.get(team) ?? { xp: 0, members: 0, topMember: null, topXp: 0 };
    prev.xp += r.total_xp;
    prev.members += 1;
    if (r.total_xp > prev.topXp) {
      prev.topXp = r.total_xp;
      prev.topMember = r.full_name;
    }
    map.set(team, prev);
  }
  return Array.from(map.entries())
    .map(([team, v]) => ({ team, xp: v.xp, members: v.members, topMember: v.topMember }))
    .sort((a, b) => b.xp - a.xp);
}

/** Determine XP trend from recent events */
function computeTrend(events: XpEvent[], userId: string): 'up' | 'down' | 'stable' {
  const userEvents = events.filter(e => e.user_id === userId);
  if (userEvents.length < 2) return 'stable';
  const now = Date.now();
  const mid = now - 3.5 * 86400_000;
  let recent = 0, older = 0;
  for (const e of userEvents) {
    const t = new Date(e.created_at).getTime();
    if (t >= mid) recent += e.points;
    else older += e.points;
  }
  if (recent > older * 1.2) return 'up';
  if (recent < older * 0.8) return 'down';
  return 'stable';
}

/** Extra achievements beyond computeAchievements */
interface ExtraAchievement {
  id: string;
  label: string;
  description: string;
  category: 'uretkenlik' | 'isbirligi' | 'sureklilik';
  earned: boolean;
  progress?: { current: number; target: number };
}

function computeExtraAchievements(
  row: LeaderboardRow | undefined,
  events: XpEvent[],
): ExtraAchievement[] {
  const commentCount = events.filter(e => e.kind === 'comment').length;
  const level = row?.level ?? 1;

  // Count distinct entity_ids (projects)
  const projectIds = new Set(
    events.filter(e => e.entity_type === 'project' || e.entity_id).map(e => e.entity_id),
  );
  const projectCount = projectIds.size;

  // Tasks done in a single day
  const tasksByDay = new Map<string, number>();
  for (const e of events) {
    if (e.kind === 'task.done') {
      const day = e.created_at.slice(0, 10);
      tasksByDay.set(day, (tasksByDay.get(day) ?? 0) + 1);
    }
  }
  const maxTasksInDay = Math.max(0, ...Array.from(tasksByDay.values()));

  return [
    {
      id: 'team_player', label: 'Takim Oyuncusu', description: '3+ farkli projede gorev al',
      category: 'isbirligi', earned: projectCount >= 3,
      progress: projectCount < 3 ? { current: projectCount, target: 3 } : undefined,
    },
    {
      id: 'mentor', label: 'Mentor', description: '50+ yorum yaz',
      category: 'isbirligi', earned: commentCount >= 50,
      progress: commentCount < 50 ? { current: commentCount, target: 50 } : undefined,
    },
    {
      id: 'efficiency_expert', label: 'Verimlilik Uzmani', description: 'Tek gunde 5+ task tamamla',
      category: 'uretkenlik', earned: maxTasksInDay >= 5,
      progress: maxTasksInDay < 5 ? { current: maxTasksInDay, target: 5 } : undefined,
    },
    {
      id: 'strategist', label: 'Stratejist', description: 'Level 15\'e ulas',
      category: 'sureklilik', earned: level >= 15,
      progress: level < 15 ? { current: level, target: 15 } : undefined,
    },
  ];
}

const CATEGORY_LABELS: Record<string, string> = {
  uretkenlik: 'Uretkenlik',
  isbirligi: 'Isbirligi',
  sureklilik: 'Sureklilik',
};

const CATEGORY_ICONS: Record<string, typeof Target> = {
  uretkenlik: Target,
  isbirligi: MessageSquare,
  sureklilik: CalendarCheck,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LevelBar({ row, events }: { row: LeaderboardRow; events: XpEvent[] }) {
  const prevLevelXp = (row.level - 1) ** 2 * 50;
  const span = row.next_level_xp - prevLevelXp;
  const pct = Math.max(0, Math.min(100, Math.round((row.in_level_xp / (span || 1)) * 100)));
  const remaining = row.next_level_xp - row.total_xp;

  // Estimate days to next level based on recent XP rate
  const recentDays = 7;
  const cutoff = Date.now() - recentDays * 86400_000;
  const recentXp = events.filter(e => new Date(e.created_at).getTime() >= cutoff)
    .reduce((sum, e) => sum + e.points, 0);
  const dailyRate = recentXp / recentDays;
  const estDays = dailyRate > 0 ? Math.ceil(remaining / dailyRate) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-[10.5px] text-muted-foreground uppercase tracking-wider">
        <span>Level {row.level}</span>
        <span>{row.total_xp} / {row.next_level_xp} XP</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="flex items-center justify-between mt-1.5 text-[10.5px] text-muted-foreground">
        <span>{pct}% tamamlandi</span>
        {estDays !== null ? (
          <span>Tahmini ~{estDays} gun sonra Level {row.level + 1}</span>
        ) : (
          <span>Sonraki level icin {remaining} XP gerekli</span>
        )}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-500/15 grid place-items-center">
        <Crown className="h-3.5 w-3.5 text-amber-500" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-6 h-6 rounded-full bg-slate-400/15 grid place-items-center">
        <Medal className="h-3.5 w-3.5 text-slate-400" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-6 h-6 rounded-full bg-orange-400/15 grid place-items-center">
        <Award className="h-3.5 w-3.5 text-orange-400" />
      </div>
    );
  }
  return (
    <div className="w-6 text-center text-[13px] font-mono text-muted-foreground tabular-nums">
      {rank}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function LeaderRow({
  row, rank, isMe, trend,
}: {
  row: LeaderboardRow; rank: number; isMe: boolean; trend: 'up' | 'down' | 'stable';
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 border-b border-border/40 last:border-b-0',
      isMe && 'bg-primary/5',
    )}>
      <RankBadge rank={rank} />
      <div className="h-8 w-8 rounded-full bg-card grid place-items-center text-[11px] font-semibold text-foreground shrink-0">
        {(row.full_name ?? '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{row.full_name ?? 'Kullanici'}</span>
          {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Sen</Badge>}
          <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Lv {row.level}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">{row.event_count} etkinlik</div>
      </div>
      <TrendIndicator trend={trend} />
      <div className="text-right shrink-0">
        <div className="text-[14px] font-medium tabular-nums font-mono">{row.total_xp}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
      </div>
    </div>
  );
}

function TeamRow({ team, xp, members, topMember, rank }: {
  team: string; xp: number; members: number; topMember: string | null; rank: number;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border/40 last:border-b-0">
      <RankBadge rank={rank} />
      <div className="h-8 w-8 rounded-full bg-card grid place-items-center shrink-0">
        <Users className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium truncate">{team}</div>
        <div className="text-[11px] text-muted-foreground">
          {members} uye{topMember ? ` · MVP: ${topMember}` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[14px] font-medium tabular-nums font-mono">{xp}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
      </div>
    </div>
  );
}

function WeeklySummaryCard({ events }: { events: XpEvent[] }) {
  const now = Date.now();
  const thisWeekStart = now - 7 * 86400_000;
  const lastWeekStart = now - 14 * 86400_000;

  let thisWeek = 0, lastWeek = 0;
  for (const e of events) {
    const t = new Date(e.created_at).getTime();
    if (t >= thisWeekStart) thisWeek += e.points;
    else if (t >= lastWeekStart) lastWeek += e.points;
  }

  const diff = thisWeek - lastWeek;
  const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;

  return (
    <div className="rounded-md border border-border/60 bg-secondary/10 p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Lightbulb className="h-3 w-3" /> Haftalik Ozet
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[18px] font-mono tabular-nums">{thisWeek}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Bu Hafta</div>
        </div>
        <div>
          <div className="text-[18px] font-mono tabular-nums">{lastWeek}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Gecen Hafta</div>
        </div>
        <div>
          <div className={cn(
            'text-[18px] font-mono tabular-nums',
            diff > 0 && 'text-green-500',
            diff < 0 && 'text-red-400',
          )}>
            {diffLabel}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase">Fark</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Leaderboard() {
  const { user } = useAuth();
  const { data: board, isLoading: bLoading, isError } = useLeaderboard(50);
  const { data: streak } = useMyStreak();
  const { data: events } = useMyXpFeed(50);

  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [viewTab, setViewTab] = useState<'individual' | 'team'>('individual');

  const filteredBoard = useMemo(
    () => filterByRange(board ?? [], events ?? [], timeRange),
    [board, events, timeRange],
  );

  const teamBoard = useMemo(() => groupByTeam(filteredBoard), [filteredBoard]);

  const myRow = useMemo(() => (board ?? []).find(r => r.user_id === user?.id), [board, user]);
  const myRank = useMemo(() => (board ?? []).findIndex(r => r.user_id === user?.id) + 1, [board, user]);

  const achievements = useMemo(
    () => computeAchievements(myRow, streak ?? 0, events ?? []),
    [myRow, streak, events],
  );
  const extraAchievements = useMemo(
    () => computeExtraAchievements(myRow, events ?? []),
    [myRow, events],
  );

  // Categorize achievements
  const categorizedBase = useMemo(() => {
    const cats: Record<string, typeof achievements> = {
      uretkenlik: [],
      isbirligi: [],
      sureklilik: [],
    };
    // Map base achievements to categories
    const catMap: Record<string, string> = {
      first_blood: 'uretkenlik', sprinter: 'uretkenlik', century: 'uretkenlik',
      streak_3: 'sureklilik', streak_7: 'sureklilik',
      on_time_5: 'sureklilik',
      commenter: 'isbirligi',
      level_5: 'uretkenlik', level_10: 'uretkenlik',
    };
    for (const a of achievements) {
      const cat = catMap[a.id] ?? 'uretkenlik';
      cats[cat].push(a);
    }
    return cats;
  }, [achievements]);

  const allAchievements = [...achievements, ...extraAchievements];
  const earnedCount = allAchievements.filter(a => a.earned).length;

  return (
    <DomainWorkspace domain="analytics" title="Skor Tablosu" subtitle="Task tamamlama, zamaninda teslim, story points ve yorum XP getirir.">
      {/* Personal stats */}
      {myRow && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Toplam XP</div>
            <div className="mt-1 text-[22px] font-mono tabular-nums">{myRow.total_xp}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Crown className="h-3 w-3" /> Level</div>
            <div className="mt-1 text-[22px] font-mono tabular-nums">{myRow.level}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" /> Streak</div>
            <div className={cn('mt-1 text-[22px] font-mono tabular-nums', (streak ?? 0) >= 3 && 'text-warning')}>
              {streak ?? 0}g
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Siralama</div>
            <div className="mt-1 text-[22px] font-mono tabular-nums">#{myRank || '—'}</div>
          </div>
        </section>
      )}

      {/* Level progress bar with estimate */}
      {myRow && (
        <section className="rounded-md border border-border/60 bg-secondary/10 p-3">
          <LevelBar row={myRow} events={events ?? []} />
        </section>
      )}

      {/* Weekly summary */}
      {(events ?? []).length > 0 && (
        <WeeklySummaryCard events={events!} />
      )}

      {/* Achievements by category */}
      <section>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Medal className="h-3 w-3" /> Basarimlar ({earnedCount}/{allAchievements.length})
        </div>

        {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
          const CatIcon = CATEGORY_ICONS[catKey] ?? Target;
          const baseItems = categorizedBase[catKey] ?? [];
          const extraItems = extraAchievements.filter(a => a.category === catKey);
          const items = [...baseItems, ...extraItems];
          if (items.length === 0) return null;

          return (
            <div key={catKey} className="mb-3">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <CatIcon className="h-3 w-3" /> {catLabel}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {items.map(a => {
                  const isExtra = 'category' in a;
                  return (
                    <div key={a.id} className={cn(
                      'rounded-md border p-3 flex items-start gap-3',
                      a.earned
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/40 bg-secondary/10 opacity-70',
                    )}>
                      {isExtra ? (
                        <div className={cn(
                          'h-8 w-8 rounded-full grid place-items-center shrink-0',
                          a.earned ? 'bg-primary/10' : 'bg-secondary/30',
                        )}>
                          <Award className={cn('h-4 w-4', a.earned ? 'text-primary' : 'text-muted-foreground')} />
                        </div>
                      ) : (
                        <div className={cn('text-[24px] shrink-0', !a.earned && 'grayscale')}>
                          {(a as { emoji: string }).emoji}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{a.label}</div>
                        <div className="text-[11.5px] text-muted-foreground">{a.description}</div>
                        {a.progress && (
                          <div className="mt-1.5">
                            <Progress
                              value={Math.round((a.progress.current / a.progress.target) * 100)}
                              className="h-1"
                            />
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {a.progress.current} / {a.progress.target}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Leaderboard */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Workspace siralama ({filteredBoard.length})
          </div>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="h-7 w-[130px] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
              <SelectItem value="all">Tum Zamanlar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'individual' | 'team')}>
          <TabsList className="mb-2">
            <TabsTrigger value="individual" className="text-[12px] gap-1">
              <User className="h-3.5 w-3.5" /> Bireysel
            </TabsTrigger>
            <TabsTrigger value="team" className="text-[12px] gap-1">
              <Users className="h-3.5 w-3.5" /> Takim
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual">
            {bLoading ? (
              <div className="space-y-1.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : isError ? (
              <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-[13px] text-muted-foreground">Skor tablosu yuklenemedi. Sayfayi yenilemeyi deneyin.</p>
              </div>
            ) : filteredBoard.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-[13px] text-muted-foreground">Henuz XP kazanan yok -- ilk task'i tamamlayan sen ol.</p>
              </div>
            ) : (
              <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
                {filteredBoard.map((r, i) => (
                  <LeaderRow
                    key={r.user_id}
                    row={r}
                    rank={i + 1}
                    isMe={r.user_id === user?.id}
                    trend={computeTrend(events ?? [], r.user_id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="team">
            {bLoading ? (
              <div className="space-y-1.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : teamBoard.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-[13px] text-muted-foreground">Takim verisi bulunamadi.</p>
              </div>
            ) : (
              <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
                {teamBoard.map((t, i) => (
                  <TeamRow key={t.team} {...t} rank={i + 1} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Recent XP feed */}
      {(events ?? []).length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Senin son etkinligin</div>
          <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden divide-y divide-border/40">
            {events!.slice(0, 12).map(e => (
              <div key={e.id} className="flex items-center gap-3 px-3 py-1.5 text-[12.5px]">
                <Badge variant="secondary" className="w-14 text-center font-mono justify-center">+{e.points}</Badge>
                <span className="flex-1 truncate">
                  <strong className="text-foreground">{KIND_LABELS[e.kind] ?? e.kind}</strong>
                  {e.detail && <span className="text-muted-foreground"> · {e.detail}</span>}
                </span>
                <span className="text-[11px] text-muted-foreground">{shortAgo(e.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </DomainWorkspace>
  );
}
