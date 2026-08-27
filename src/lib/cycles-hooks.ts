import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Cycle, CycleProgress, CycleStatus } from './cycles-types';

export function useCycles() {
  return useQuery({
    queryKey: ['cycles'],
    queryFn: async (): Promise<Cycle[]> => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Cycle[];
    },
  });
}

export function useCycle(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['cycle', cycleId],
    enabled: !!cycleId,
    queryFn: async (): Promise<Cycle | null> => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('id', cycleId!)
        .maybeSingle();
      if (error) throw error;
      return data as Cycle | null;
    },
  });
}

export function useActiveCycle() {
  return useQuery({
    queryKey: ['cycle-active'],
    queryFn: async (): Promise<Cycle | null> => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Cycle | null;
    },
  });
}

export function useCycleProgress(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['cycle-progress', cycleId],
    enabled: !!cycleId,
    queryFn: async (): Promise<CycleProgress | null> => {
      const { data, error } = await supabase.rpc('cycle_progress', { _cycle_id: cycleId! });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as CycleProgress | null;
    },
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      start_date: string;
      end_date: string;
      status?: CycleStatus;
      goal?: string | null;
      team_id?: string | null;
      number?: number;
    }) => {
      const { data, error } = await supabase
        .from('cycles')
        .insert({
          name: input.name,
          start_date: input.start_date,
          end_date: input.end_date,
          status: input.status ?? 'planned',
          goal: input.goal ?? null,
          team_id: input.team_id ?? null,
          number: input.number ?? 1,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Cycle;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cycles'] });
      qc.invalidateQueries({ queryKey: ['cycle-active'] });
    },
  });
}

export function useUpdateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Cycle> & { id: string }) => {
      const { data, error } = await supabase
        .from('cycles')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Cycle;
    },
    onSuccess: (cycle) => {
      qc.invalidateQueries({ queryKey: ['cycles'] });
      qc.invalidateQueries({ queryKey: ['cycle', cycle.id] });
      qc.invalidateQueries({ queryKey: ['cycle-active'] });
      qc.invalidateQueries({ queryKey: ['cycle-progress', cycle.id] });
    },
  });
}
