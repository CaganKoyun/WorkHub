import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotifPref {
  user_id: string;
  kind: string;
  email: boolean;
  in_app: boolean;
  updated_at: string;
}

/** Canonical set of user-facing notification kinds. */
export const NOTIF_KINDS: { key: string; label: string }[] = [
  { key: '*',                    label: 'Varsayılan (diğer tüm bildirimler)' },
  { key: 'task_assigned',        label: 'Sana task atandığında' },
  { key: 'task_comment',         label: 'Task\'ında yorum olduğunda' },
  { key: 'chat_mention',         label: 'Chat\'te seni @mention ettiklerinde' },
  { key: 'decision_review',      label: 'Karar review vadesi geldiğinde' },
  { key: 'approval_requested',   label: 'Onayına düşen bir istek olduğunda' },
];

export function useNotifPrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notif-prefs', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<NotifPref[]> => {
      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as NotifPref[];
    },
  });
}

export function useUpsertNotifPref() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { kind: string; email?: boolean; in_app?: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            kind: input.kind,
            email: input.email ?? true,
            in_app: input.in_app ?? true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,kind' },
        )
        .select().single();
      if (error) throw error;
      return data as NotifPref;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-prefs'] }),
  });
}
