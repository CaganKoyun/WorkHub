import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface Portfolio {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  owner_id: string | null;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioRollupRow {
  project_id: string;
  project_name: string;
  project_status: string;
  total_tasks: number;
  done_tasks: number;
  active_tasks: number;
  overdue_tasks: number;
  completion_pct: number;
}

export function usePortfolios() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['portfolios', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<Portfolio[]> => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .is('archived_at', null)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Portfolio[];
    },
  });
}

export function usePortfolio(id: string | undefined) {
  return useQuery({
    queryKey: ['portfolio', id],
    enabled: !!id,
    queryFn: async (): Promise<Portfolio | null> => {
      const { data, error } = await supabase
        .from('portfolios').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as Portfolio | null;
    },
  });
}

export function usePortfolioRollup(id: string | undefined) {
  return useQuery({
    queryKey: ['portfolio-rollup', id],
    enabled: !!id,
    queryFn: async (): Promise<PortfolioRollupRow[]> => {
      const { data, error } = await supabase.rpc('portfolio_rollup', { _portfolio_id: id! });
      if (error) throw error;
      return (data ?? []) as PortfolioRollupRow[];
    },
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; color?: string }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          description: input.description ?? null,
          color: input.color ?? '#5E6AD2',
          owner_id: user?.id ?? null,
          created_by: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      return data as Portfolio;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  });
}

export function useUpdatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Portfolio> & { id: string }) => {
      const { data, error } = await supabase
        .from('portfolios').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as Portfolio;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['portfolios'] });
      qc.invalidateQueries({ queryKey: ['portfolio', p.id] });
    },
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portfolios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  });
}

export function useAddProjectToPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ portfolio_id, project_id }: { portfolio_id: string; project_id: string }) => {
      const { error } = await supabase
        .from('portfolio_projects')
        .insert({ portfolio_id, project_id });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['portfolio-rollup', v.portfolio_id] });
    },
  });
}

export function useRemoveProjectFromPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ portfolio_id, project_id }: { portfolio_id: string; project_id: string }) => {
      const { error } = await supabase
        .from('portfolio_projects')
        .delete()
        .eq('portfolio_id', portfolio_id)
        .eq('project_id', project_id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['portfolio-rollup', v.portfolio_id] });
    },
  });
}
