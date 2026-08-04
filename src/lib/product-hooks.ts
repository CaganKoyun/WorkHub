import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type AnyRow = Record<string, any>;

function useWsList(table: 'products' | 'features' | 'feedback' | 'releases' | 'incidents', orderCol = 'created_at') {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: [table, currentWorkspace?.id],
    enabled: !!currentWorkspace,
    queryFn: async (): Promise<AnyRow[]> => {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order(orderCol, { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export const useProducts = () => useWsList('products');
export const useFeatures = () => useWsList('features');
export const useFeedback = () => useWsList('feedback');
export const useReleases = () => useWsList('releases');
export const useIncidents = () => useWsList('incidents');

export function useUpsert(table: 'products' | 'features' | 'feedback' | 'releases' | 'incidents') {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: AnyRow) => {
      const payload = { ...input, workspace_id: currentWorkspace!.id };
      const q = input.id
        ? supabase.from(table as any).update(payload).eq('id', input.id).select().maybeSingle()
        : supabase.from(table as any).insert(payload).select().maybeSingle();
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export function useDelete(table: 'products' | 'features' | 'feedback' | 'releases' | 'incidents') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}
