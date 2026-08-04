import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type WorkflowStateCategory =
  | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';

export interface WorkflowState {
  id: string;
  workspace_id: string;
  team_id: string | null;
  key: string;
  name: string;
  category: WorkflowStateCategory;
  color: string;
  position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<WorkflowStateCategory, string> = {
  backlog: 'Backlog',
  unstarted: 'Unstarted',
  started: 'Started',
  completed: 'Completed',
  canceled: 'Canceled',
};

export const CATEGORY_ORDER: WorkflowStateCategory[] = [
  'backlog', 'unstarted', 'started', 'completed', 'canceled',
];

export function useWorkflowStates(teamId?: string | null) {
  return useQuery({
    queryKey: ['workflow-states', teamId ?? 'workspace'],
    queryFn: async (): Promise<WorkflowState[]> => {
      let q = supabase.from('workflow_states').select('*').order('position', { ascending: true });
      if (teamId) q = q.eq('team_id', teamId);
      else q = q.is('team_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WorkflowState[];
    },
  });
}

export function useCreateWorkflowState() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      key: string; name: string; category: WorkflowStateCategory;
      color?: string; position?: number; team_id?: string | null;
    }) => {
      if (!currentWorkspace) throw new Error('Aktif workspace yok');
      const { data, error } = await supabase
        .from('workflow_states')
        .insert({
          workspace_id: currentWorkspace.id,
          team_id: input.team_id ?? null,
          key: input.key,
          name: input.name,
          category: input.category,
          color: input.color ?? '#8a8f98',
          position: input.position ?? 99,
        })
        .select()
        .single();
      if (error) throw error;
      return data as WorkflowState;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-states'] }),
  });
}

export function useUpdateWorkflowState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<WorkflowState> & { id: string }) => {
      const { error } = await supabase.from('workflow_states').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-states'] }),
  });
}

export function useDeleteWorkflowState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workflow_states').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-states'] }),
  });
}

export function useReorderWorkflowStates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; position: number }[]) => {
      // Apply updates in parallel — each is a single-row update.
      await Promise.all(
        updates.map(u => supabase.from('workflow_states').update({ position: u.position }).eq('id', u.id)),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-states'] }),
  });
}
