import { useMemo } from 'react';
import {
  useLeaderboard, useMyStreak, useMyXpFeed, computeAchievements,
  KIND_LABELS, type LeaderboardRow,
} from '@/lib/gamification-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Trophy, TrendingUp, Award, Star, Target, BarChart3,
  Clock, CheckCircle2, ArrowUp, ArrowDown, Minus, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function shortAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}sn once`;
  if (s < 3600) return `${Math.round(s / 60)}dk once`;
  if (s < 86400) return `${Math.round(s / 3600)}sa once`;
  const d = Math.round(s / 86400);
  return d < 30 ? `${d}g once` : new Date(iso).toLocaleDateString('tr-TR');
}

const ACHIEVEMENT_ICONS: Record<string, typeof Trophy> = {
  first_task: CheckCircle2,
  task_10: Target,
  task_100: Award,
  streak_7: TrendingUp,
  streak_30: Star,
  sprint_champ: Trophy,
  xp_500: BarChart3,
  xp_1000: BarChart3,
  commenter: Users,
};

function SeviyeBar({ row }: { row: LeaderboardRow }) {
  const prevLevelXp = (row.level - 1) ** 2 * 50;
  const span = row.next_level_xp - prevLevelXp;
  const pct = Math.max(0, Math.min(100, Math.round((row.in_level_xp / (span || 1)) * 100)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium">Seviye {row.level}</span>
        <span className="tabular-nums">{row.total_xp} / {row.next_level_xp} puan</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function PerformansStat({ icon: Icon, label, value, sub }: {
  icon: typeof Trophy; label: string; value: string | number; sub?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function RankIndicator({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold',
        rank === 1 && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        rank === 2 && 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
        rank === 3 && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      )}>
        {rank}
      </div>
    );
  }
  return (
    <div className="w-7 text-center text-[13px] font-mono text-muted-foreground tabular-nums">
      {rank}
    </div>
  );
}

function LeaderRow({ row, rank, isMe }: { row: LeaderboardRow; rank: number; isMe: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 transition-colors',
      isMe && 'bg-primary/5',
    )}>
      <RankIndicator rank={rank} />
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-[11px] font-medium">
          {(row.full_name ?? '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{row.full_name ?? 'Kullanici'}</span>
          {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Sen</Badge>}
        </div>
        <div className="text-[11px] text-muted-foreground">
          Seviye {row.level} · {row.event_count} etkinlik
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-semibold tabular-nums">{row.total_xp}</div>
        <div className="text-[10px] text-muted-foreground">puan</div>
      </div>
    </div>
  );
}

function PerformansOzeti({ myRow, streak, events }: {
  myRow: LeaderboardRow; streak: number; events: Array<{ kind: string; created_at: string; points: number }>;
}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEvents = (events ?? []).filter(e => new Date(e.created_at) >= monthStart);
  const tasksThisMonth = thisMonthEvents.filter(e => e.kind === 'task_done' || e.kind === 'task_complete').length;
  const totalTasks = thisMonthEvents.length;

  const recentPoints = thisMonthEvents.reduce((s, e) => s + e.points, 0);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEvents = (events ?? []).filter(e => {
    const d = new Date(e.created_at);
    return d >= prevMonthStart && d < monthStart;
  });
  const prevPoints = prevMonthEvents.reduce((s, e) => s + e.points, 0);
  const trend = recentPoints > prevPoints ? 'up' : recentPoints < prevPoints ? 'down' : 'stable';

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;

  return (
    <section>
      <h2 className="text-[12px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">
        Performans Ozeti
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PerformansStat
          icon={CheckCircle2}
          label="Bu Ay Tamamlanan"
          value={tasksThisMonth || totalTasks}
          sub="gorev"
        />
        <PerformansStat
          icon={BarChart3}
          label="Performans Puani"
          value={myRow.total_xp}
          sub={`Seviye ${myRow.level}`}
        />
        <PerformansStat
          icon={Clock}
          label="Sureklilik"
          value={`${streak} gun`}
          sub={streak >= 7 ? 'Istikrarli' : streak >= 3 ? 'Iyi gidis' : 'Baslangic'}
        />
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Katki Trendi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">{recentPoints}</span>
            <TrendIcon className={cn(
              'h-4 w-4',
              trend === 'up' && 'text-green-600 dark:text-green-400',
              trend === 'down' && 'text-red-500 dark:text-red-400',
              trend === 'stable' && 'text-muted-foreground',
            )} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">bu ay puan</div>
        </Card>
      </div>
    </section>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { data: board, isLoading: bLoading } = useLeaderboard(50);
  const { data: streak } = useMyStreak();
  const { data: events } = useMyXpFeed(50);

  const myRow = useMemo(() => (board ?? []).find(r => r.user_id === user?.id), [board, user]);
  const myRank = useMemo(() => (board ?? []).findIndex(r => r.user_id === user?.id) + 1, [board, user]);
  const achievements = useMemo(
    () => computeAchievements(myRow, streak ?? 0, events ?? []),
    [myRow, streak, events],
  );
  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Performans Tablosu</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Gorev tamamlama, zamaninda teslim, story points ve katkilar performans puani olusturur.
          Sureklilik, araliksiz aktif gun sayisini gosterir.
        </p>
      </div>

      {/* Performans Ozeti */}
      {myRow && (
        <PerformansOzeti myRow={myRow} streak={streak ?? 0} events={events ?? []} />
      )}

      {/* Seviye ilerleme */}
      {myRow && (
        <Card className="p-4">
          <SeviyeBar row={myRow} />
        </Card>
      )}

      {/* Basarimlar */}
      <section>
        <h2 className="text-[12px] uppercase tracking-wider text-muted-foreground mb-3 font-medium flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5" /> Basarimlar ({earnedCount}/{achievements.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {achievements.map(a => {
            const Icon = ACHIEVEMENT_ICONS[a.id] ?? Star;
            return (
              <Card key={a.id} className={cn(
                'p-4 flex items-start gap-3',
                a.earned
                  ? 'border-primary/30'
                  : 'opacity-50',
              )}>
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  a.earned
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{a.label}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{a.description}</div>
                  {a.progress && (
                    <div className="mt-2">
                      <Progress
                        value={Math.round((a.progress.current / a.progress.target) * 100)}
                        className="h-1.5"
                      />
                      <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                        {a.progress.current} / {a.progress.target}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Siralama */}
      <section>
        <h2 className="text-[12px] uppercase tracking-wider text-muted-foreground mb-3 font-medium flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Ekip Siralamasi ({board?.length ?? 0})
        </h2>
        {bLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (board ?? []).length === 0 ? (
          <Card className="py-14 text-center border-dashed">
            <Target className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-[13px] text-muted-foreground">
              Henuz performans puani kazanan yok. Ilk gorevi tamamlayarak baslayabilirsiniz.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              <div className="w-7 text-center">Sira</div>
              <div className="w-8" />
              <div className="flex-1">Calisan</div>
              <div className="text-right w-20">Puan</div>
            </div>
            {board!.map((r, i) => (
              <LeaderRow key={r.user_id} row={r} rank={i + 1} isMe={r.user_id === user?.id} />
            ))}
          </Card>
        )}
      </section>

      {/* Son aktiviteler */}
      {(events ?? []).length > 0 && (
        <section>
          <h2 className="text-[12px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">
            Son Aktiviteler
          </h2>
          <Card className="overflow-hidden divide-y divide-border/40">
            {events!.slice(0, 12).map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                <Badge variant="secondary" className="w-14 justify-center font-mono text-[11px]">
                  +{e.points}
                </Badge>
                <span className="flex-1 truncate">
                  <span className="font-medium text-foreground">{KIND_LABELS[e.kind] ?? e.kind}</span>
                  {e.detail && <span className="text-muted-foreground"> - {e.detail}</span>}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">{shortAgo(e.created_at)}</span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
