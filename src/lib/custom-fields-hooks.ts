import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type CustomFieldKind =
  | 'text' | 'long_text' | 'number' | 'currency' | 'percent'
  | 'select' | 'multi_select' | 'date' | 'datetime' | 'boolean'
  | 'url' | 'email' | 'formula';

export type EntityType = 'task' | 'project' | 'bug' | 'deal' | 'customer';

export interface SelectOption { value: string; label: string; color?: string }

export interface CustomFieldConfig {
  options?: SelectOption[];
  currency?: string;
  min?: number;
  max?: number;
  precision?: number;
  placeholder?: string;
  [k: string]: unknown;
}

export interface CustomFieldDef {
  id: string;
  workspace_id: string;
  entity_type: EntityType;
  key: string;
  name: string;
  kind: CustomFieldKind;
  config: CustomFieldConfig;
  position: number;
  required: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  workspace_id: string;
  def_id: string;
  entity_type: EntityType;
  entity_id: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

export const KIND_LABELS: Record<CustomFieldKind, string> = {
  text: 'Kısa metin',
  long_text: 'Uzun metin',
  number: 'Sayı',
  currency: 'Para',
  percent: 'Yüzde',
  select: 'Tek seçim',
  multi_select: 'Çoklu seçim',
  date: 'Tarih',
  datetime: 'Tarih + saat',
  boolean: 'Evet/Hayır',
  url: 'URL',
  email: 'E-posta',
  formula: 'Formül',
};

// ---------------------------------------------------------------------------
// Defs
// ---------------------------------------------------------------------------
export function useCustomFieldDefs(entityType: EntityType) {
  return useQuery({
    queryKey: ['cf-defs', entityType],
    queryFn: async (): Promise<CustomFieldDef[]> => {
      const { data, error } = await supabase
        .from('custom_field_defs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('is_archived', false)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CustomFieldDef[];
    },
  });
}

export function useAllCustomFieldDefs() {
  return useQuery({
    queryKey: ['cf-defs-all'],
    queryFn: async (): Promise<CustomFieldDef[]> => {
      const { data, error } = await supabase
        .from('custom_field_defs')
        .select('*')
        .order('entity_type', { ascending: true })
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CustomFieldDef[];
    },
  });
}

export function useCreateCustomFieldDef() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Omit<CustomFieldDef,
      'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'is_archived'
    >) => {
      if (!currentWorkspace) throw new Error('Aktif workspace yok');
      const { data, error } = await supabase
        .from('custom_field_defs')
        .insert({
          workspace_id: currentWorkspace.id,
          entity_type: input.entity_type,
          key: input.key,
          name: input.name,
          kind: input.kind,
          config: (input.config ?? {}) as never,
          position: input.position ?? 99,
          required: input.required ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CustomFieldDef;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cf-defs'] });
      qc.invalidateQueries({ queryKey: ['cf-defs-all'] });
    },
  });
}

export function useDeleteCustomFieldDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_field_defs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cf-defs'] });
      qc.invalidateQueries({ queryKey: ['cf-defs-all'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------
export function useCustomFieldValues(entityType: EntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: ['cf-values', entityType, entityId],
    enabled: !!entityId,
    queryFn: async (): Promise<CustomFieldValue[]> => {
      const { data, error } = await supabase
        .from('custom_field_values')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!);
      if (error) throw error;
      return (data ?? []) as unknown as CustomFieldValue[];
    },
  });
}

export function useUpsertCustomFieldValue() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      def_id: string;
      entity_type: EntityType;
      entity_id: string;
      value: unknown;
    }) => {
      if (!currentWorkspace) throw new Error('Aktif workspace yok');
      const { error } = await supabase
        .from('custom_field_values')
        .upsert({
          workspace_id: currentWorkspace.id,
          def_id: input.def_id,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          value: input.value as never,
          updated_by: user?.id ?? null,
        }, { onConflict: 'def_id,entity_id' });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['cf-values', v.entity_type, v.entity_id] });
    },
  });
}
