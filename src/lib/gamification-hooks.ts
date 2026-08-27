import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface LeaderboardRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  event_count: number;
  level: number;
  next_level_xp: number;
  in_level_xp: number;
}

export interface XpEvent {
  id: string;
  workspace_id: string;
  user_id: string;
  kind: string;
  points: number;
  entity_type: string | null;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
}

export function useLeaderboard(limit = 20) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['leaderboard', currentWorkspace?.id, limit],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc('workspace_leaderboard', {
        _workspace_id: currentWorkspace!.id, _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as unknown as LeaderboardRow[];
    },
  });
}

export function useMyStreak() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['streak', currentWorkspace?.id, user?.id],
    enabled: !!currentWorkspace?.id && !!user?.id,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('user_streak', {
        _workspace_id: currentWorkspace!.id, _user_id: user!.id,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}

export function useMyXpFeed(limit = 25) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['xp-feed', currentWorkspace?.id, user?.id, limit],
    enabled: !!currentWorkspace?.id && !!user?.id,
    queryFn: async (): Promise<XpEvent[]> => {
      const { data, error } = await supabase.rpc('user_xp_feed', {
        _workspace_id: currentWorkspace!.id, _user_id: user!.id, _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as unknown as XpEvent[];
    },
  });
}

// ---- XP kind labels + achievements --------------------------------------

export const KIND_LABELS: Record<string, string> = {
  'task.done': 'Task tamamlandı',
  'task.done.on_time': 'Zamanında bitti',
  'task.done.points': 'Story point bonusu',
  'comment': 'Yorum yazıldı',
  'streak.bonus': 'Streak bonusu',
};

export interface Achievement {
  id: string;
  label: string;
  description: string;
  emoji: string;
  earned: boolean;
  progress?: { current: number; target: number };
}

export function computeAchievements(row: LeaderboardRow | undefined, streak: number, events: XpEvent[] = []): Achievement[] {
  const total = row?.total_xp ?? 0;
  const level = row?.level ?? 1;
  const doneCount = events.filter(e => e.kind === 'task.done').length;
  const onTimeCount = events.filter(e => e.kind === 'task.done.on_time').length;
  const commentCount = events.filter(e => e.kind === 'comment').length;

  return [
    { id: 'first_blood', label: 'İlk kan', description: 'İlk task tamamlandı', emoji: '🎯',
      earned: doneCount >= 1, progress: doneCount >= 1 ? undefined : { current: 0, target: 1 } },
    { id: 'sprinter', label: 'Sprinter', description: '10 task tamamla', emoji: '🏃',
      earned: doneCount >= 10, progress: doneCount < 10 ? { current: doneCount, target: 10 } : undefined },
    { id: 'century', label: 'Yüzler kulübü', description: '100 XP topla', emoji: '💯',
      earned: total >= 100, progress: total < 100 ? { current: total, target: 100 } : undefined },
    { id: 'streak_3', label: 'Isınıyor', description: '3 günlük streak', emoji: '🔥',
      earned: streak >= 3, progress: streak < 3 ? { current: streak, target: 3 } : undefined },
    { id: 'streak_7', label: 'Alevler içinde', description: '7 günlük streak', emoji: '🔥🔥',
      earned: streak >= 7, progress: streak < 7 ? { current: streak, target: 7 } : undefined },
    { id: 'on_time_5', label: 'Söz veren tutan', description: 'Deadline\'a 5 kez uy', emoji: '⏱️',
      earned: onTimeCount >= 5, progress: onTimeCount < 5 ? { current: onTimeCount, target: 5 } : undefined },
    { id: 'commenter', label: 'Konuşkan', description: '20 yorum', emoji: '💬',
      earned: commentCount >= 20, progress: commentCount < 20 ? { current: commentCount, target: 20 } : undefined },
    { id: 'level_5', label: 'Seviye 5', description: 'Level 5\'e ulaş', emoji: '🎖️',
      earned: level >= 5, progress: level < 5 ? { current: level, target: 5 } : undefined },
    { id: 'level_10', label: 'Seviye 10', description: 'Level 10\'a ulaş', emoji: '👑',
      earned: level >= 10, progress: level < 10 ? { current: level, target: 10 } : undefined },
  ];
}
