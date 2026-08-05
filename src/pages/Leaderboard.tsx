import { useMemo } from 'react';
import {
  useLeaderboard, useMyStreak, useMyXpFeed, computeAchievements,
  KIND_LABELS, type LeaderboardRow,
} from '@/lib/gamification-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy, Flame, Zap, Crown, TrendingUp, Medal, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function shortAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}sn önce`;
  if (s < 3600) return `${Math.round(s / 60)}dk önce`;
  if (s < 86400) return `${Math.round(s / 3600)}sa önce`;
  const d = Math.round(s / 86400);
  return d < 30 ? `${d}g önce` : new Date(iso).toLocaleDateString('tr-TR');
}

function LevelBar({ row }: { row: LeaderboardRow }) {
  const prevLevelXp = (row.level - 1) ** 2 * 50;
  const span = row.next_level_xp - prevLevelXp;
  const pct = Math.max(0, Math.min(100, Math.round((row.in_level_xp / (span || 1)) * 100)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-[10.5px] text-muted-foreground uppercase tracking-wider">
        <span>Level {row.level}</span>
        <span>{row.total_xp} / {row.next_level_xp} XP</span>
      </div>
      <div className="h-1.5 rounded bg-secondary/40 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LeaderRow({ row, rank, isMe }: { row: LeaderboardRow; rank: number; isMe: boolean }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 border-b border-border/40 last:border-b-0',
      isMe && 'bg-primary/5',
    )}>
      <div className="w-6 text-center text-[13px] font-mono text-muted-foreground tabular-nums">
        {medal ?? rank}
      </div>
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500 grid place-items-center text-[11px] font-semibold text-white shrink-0">
        {(row.full_name ?? '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate">{row.full_name ?? 'Kullanıcı'}</span>
          {isMe && <span className="chip accent">Sen</span>}
          <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Lv {row.level}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">{row.event_count} etkinlik</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[14px] font-medium tabular-nums font-mono">{row.total_xp}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
      </div>
    </div>
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
        <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
          <Trophy className="h-5 w-5 text-muted-foreground" /> Skor tablosu
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Task tamamlama, zamanında teslim, story points ve yorum XP getirir.
          Level = ⌊√(XP/50)⌋ + 1. Streak ise aralıksız aktif gün sayısı.
        </p>
      </div>

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
            <div className={cn('mt-1 text-[22px] font-mono tabular-nums', (streak ?? 0) >= 3 && 'text-amber-400')}>
              {streak ?? 0}g
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Sıralama</div>
            <div className="mt-1 text-[22px] font-mono tabular-nums">#{myRank || '—'}</div>
          </div>
        </section>
      )}

      {myRow && (
        <section className="rounded-md border border-border/60 bg-secondary/10 p-3">
          <LevelBar row={myRow} />
        </section>
      )}

      {/* Achievements */}
      <section>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Medal className="h-3 w-3" /> Başarımlar ({earnedCount}/{achievements.length})
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {achievements.map(a => (
            <div key={a.id} className={cn(
              'rounded-md border p-3 flex items-start gap-3',
              a.earned
                ? 'border-primary/40 bg-primary/5'
                : 'border-border/40 bg-secondary/10 opacity-70',
            )}>
              <div className={cn('text-[24px] shrink-0', !a.earned && 'grayscale')}>{a.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{a.label}</div>
                <div className="text-[11.5px] text-muted-foreground">{a.description}</div>
                {a.progress && (
                  <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                    {a.progress.current} / {a.progress.target}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
          Workspace sıralama ({board?.length ?? 0})
        </div>
        {bLoading ? (
          <div className="space-y-1.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (board ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-[13px] text-muted-foreground">Henüz XP kazanan yok — ilk task'ı tamamlayan sen ol.</p>
          </div>
        ) : (
          <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden">
            {board!.map((r, i) => (
              <LeaderRow key={r.user_id} row={r} rank={i + 1} isMe={r.user_id === user?.id} />
            ))}
          </div>
        )}
      </section>

      {/* Recent XP feed */}
      {(events ?? []).length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Senin son etkinliğin</div>
          <div className="rounded-md border border-border/60 bg-secondary/10 overflow-hidden divide-y divide-border/40">
            {events!.slice(0, 12).map(e => (
              <div key={e.id} className="flex items-center gap-3 px-3 py-1.5 text-[12.5px]">
                <span className="chip accent w-14 text-center font-mono">+{e.points}</span>
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
    </div>
  );
}
