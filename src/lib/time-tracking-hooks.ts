import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface TimeEntry {
  id: string;
  workspace_id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  billable: boolean;
  duration_seconds: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Returns the current user's running timer, if any. */
export function useActiveTimer() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['active-timer', user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async (): Promise<TimeEntry | null> => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .is('ended_at', null)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as TimeEntry | null;
    },
  });
}

export function useTimeEntriesForTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ['time-entries-task', taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<TimeEntry[]> => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId!)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TimeEntry[];
    },
  });
}

export function useMyTimeEntries(rangeStartISO?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['time-entries-mine', user?.id, rangeStartISO ?? 'all'],
    enabled: !!user,
    queryFn: async (): Promise<TimeEntry[]> => {
      let q = supabase.from('time_entries').select('*').eq('user_id', user!.id).order('started_at', { ascending: false });
      if (rangeStartISO) q = q.gte('started_at', rangeStartISO);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TimeEntry[];
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useStartTimer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async ({ task_id, note }: { task_id: string; note?: string }) => {
      if (!user || !currentWorkspace) throw new Error('Giriş gerekli');

      // Stop any existing running timer first (server-side unique index would
      // otherwise reject the insert).
      await supabase
        .from('time_entries')
        .update({ ended_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('ended_at', null);

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          workspace_id: currentWorkspace.id,
          task_id,
          user_id: user.id,
          note: note ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TimeEntry;
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ['active-timer'] });
      qc.invalidateQueries({ queryKey: ['time-entries-task', entry.task_id] });
      qc.invalidateQueries({ queryKey: ['time-entries-mine'] });
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Giriş gerekli');
      const { error } = await supabase
        .from('time_entries')
        .update({ ended_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('ended_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-timer'] });
      qc.invalidateQueries({ queryKey: ['time-entries-task'] });
      qc.invalidateQueries({ queryKey: ['time-entries-mine'] });
    },
  });
}

export function useAddManualEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      task_id: string; started_at: string; ended_at: string; note?: string;
    }) => {
      if (!user || !currentWorkspace) throw new Error('Giriş gerekli');
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          workspace_id: currentWorkspace.id,
          task_id: input.task_id,
          user_id: user.id,
          started_at: input.started_at,
          ended_at: input.ended_at,
          note: input.note ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TimeEntry;
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ['time-entries-task', entry.task_id] });
      qc.invalidateQueries({ queryKey: ['time-entries-mine'] });
    },
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-timer'] });
      qc.invalidateQueries({ queryKey: ['time-entries-task'] });
      qc.invalidateQueries({ queryKey: ['time-entries-mine'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Live-updating elapsed seconds while a timer is running. */
export function useElapsedSeconds(startedAt: string | undefined | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}

export function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatHMS(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
