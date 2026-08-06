import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  workspace_id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications(limit = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id, limit],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return (notifications ?? []).filter((n) => !n.read_at).length;
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as never)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export interface NotificationPreferences {
  approval_created: boolean;
  approval_overdue: boolean;
  decision_review_due: boolean;
  task_assigned: boolean;
  mention_in_comment: boolean;
  signal_scan_detected: boolean;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NotificationPreferences | null> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("approval_created,approval_overdue,decision_review_due,task_assigned,mention_in_comment,signal_scan_detected")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as NotificationPreferences | null;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: user!.id, ...patch } as never, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });
}
