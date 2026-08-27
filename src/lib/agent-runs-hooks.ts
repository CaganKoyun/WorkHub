import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { PlanStep } from './agent-parse';

export type AgentRunStatus = 'planned' | 'running' | 'succeeded' | 'partial' | 'failed' | 'canceled';

export interface AgentRunResult {
  step_index: number;
  ok: boolean;
  detail?: string;
  error?: string;
}

export interface AgentRun {
  id: string;
  workspace_id: string;
  user_id: string;
  prompt: string;
  plan: PlanStep[];
  results: AgentRunResult[];
  status: AgentRunStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export function useAgentRuns() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['agent-runs', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<AgentRun[]> => {
      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as AgentRun[];
    },
  });
}

export function useCreateAgentRun() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { prompt: string; plan: PlanStep[] }) => {
      if (!currentWorkspace || !user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('agent_runs')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          prompt: input.prompt,
          plan: input.plan as never,
        })
        .select().single();
      if (error) throw error;
      return data as unknown as AgentRun;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-runs'] }),
  });
}

export function useFinalizeAgentRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, results, status }: { id: string; results: AgentRunResult[]; status: AgentRunStatus }) => {
      const { error } = await supabase
        .from('agent_runs')
        .update({
          results: results as never,
          status,
          finished_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-runs'] }),
  });
}

export function useMarkAgentRunStarted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_runs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-runs'] }),
  });
}

export function useDeleteAgentRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agent_runs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-runs'] }),
  });
}
