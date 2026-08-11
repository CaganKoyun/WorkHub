import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AssetCondition } from './assets-types';
export { calculateDepreciation } from './assets-types';
export type { Asset, AssetCategory, Employee, AssetAssignment, AssetCondition } from './assets-types';

// ---- Categories ----
export function useCategories() {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('asset_categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

// ---- Employees ----
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; department?: string | null; email?: string | null }) => {
      const { data, error } = await supabase.from('employees').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name?: string; department?: string | null; email?: string | null }) => {
      const { data, error } = await supabase.from('employees').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useBulkCreateEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<{ name: string; department?: string | null; email?: string | null }>) => {
      const { data, error } = await supabase.from('employees').insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// ---- Assets ----
export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*, asset_categories(*)')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*, asset_categories(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

type CreateAssetInput = {
  name: string;
  category_id?: string | null;
  serial_number?: string | null;
  purchase_date: string;
  purchase_cost: number;
  condition: AssetCondition;
  location?: string | null;
  notes?: string | null;
  useful_life_years: number;
  residual_value_percent?: number;
};

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: CreateAssetInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('assets')
        .insert({ ...values, created_by: userData.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<CreateAssetInput> & { id: string; is_archived?: boolean }) => {
      const { data, error } = await supabase
        .from('assets')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['assets', vars.id] });
    },
  });
}

export function useArchiveAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assets').update({ is_archived: true, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useBulkCreateAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: CreateAssetInput[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const withUser = rows.map(r => ({ ...r, created_by: userData.user?.id ?? null }));
      const { data, error } = await supabase.from('assets').insert(withUser).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

// ---- Assignments ----
export function useAssetAssignments(assetId: string) {
  return useQuery({
    queryKey: ['assignments', assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select('*, employees(*)')
        .eq('asset_id', assetId)
        .order('assigned_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!assetId,
  });
}

export function useCurrentAssignment(assetId: string) {
  return useQuery({
    queryKey: ['assignments', assetId, 'current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select('*, employees(*)')
        .eq('asset_id', assetId)
        .is('returned_date', null)
        .order('assigned_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!assetId,
  });
}

export function useAllActiveAssignments() {
  return useQuery({
    queryKey: ['assignments', 'all-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select('*, employees(*)')
        .is('returned_date', null);
      if (error) throw error;
      return data as (AssetAssignment & { employees: Employee | null })[];
    },
  });
}

export function useAssignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { asset_id: string; employee_id: string; notes?: string | null }) => {
      const { data, error } = await supabase.from('asset_assignments').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assignments', vars.asset_id] });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useUnassignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: string; assetId: string }) => {
      const { error } = await supabase
        .from('asset_assignments')
        .update({ returned_date: new Date().toISOString() })
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assignments', vars.assetId] });
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
