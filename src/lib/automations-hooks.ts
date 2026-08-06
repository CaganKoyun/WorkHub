import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type TriggerKind =
  | 'task_created' | 'task_status_changed' | 'task_priority_changed';

export type ConditionField =
  | 'status' | 'priority' | 'assignee_id' | 'project_id';

export type ConditionOp = 'eq' | 'neq' | 'in';

export interface AutomationCondition {
  field: ConditionField;
  op: ConditionOp;
  value: string | string[];
}

export type ActionKind =
  | 'assign_to' | 'set_status' | 'set_priority' | 'add_tag' | 'add_comment';

export interface AutomationAction {
  kind: ActionKind;
  value: string;
}

export interface Automation {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger: { kind: TriggerKind };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  run_count: number;
  last_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  workspace_id: string;
  task_id: string | null;
  outcome: 'ok' | 'skipped' | 'error';
  detail: string | null;
  created_at: string;
}

export const TRIGGER_LABELS: Record<TriggerKind, string> = {
  task_created: 'Görev oluşturulduğunda',
  task_status_changed: 'Görev durumu değiştiğinde',
  task_priority_changed: 'Görev önceliği değiştiğinde',
};

export const FIELD_LABELS: Record<ConditionField, string> = {
  status: 'Durum',
  priority: 'Öncelik',
  assignee_id: 'Atanan',
  project_id: 'Proje',
};

export const OP_LABELS: Record<ConditionOp, string> = {
  eq: 'eşitse',
  neq: 'değilse',
  in: 'içindeyse',
};

export const ACTION_LABELS: Record<ActionKind, string> = {
  assign_to: 'Şu kullanıcıya ata',
  set_status: 'Durumu şu yap',
  set_priority: 'Önceliği şu yap',
  add_tag: 'Etiket ekle',
  add_comment: 'Yorum ekle',
};

export function useAutomations() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['automations', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<Automation[]> => {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Automation[];
    },
  });
}

export function useAutomationRuns(automationId: string | undefined) {
  return useQuery({
    queryKey: ['automation-runs', automationId],
    enabled: !!automationId,
    queryFn: async (): Promise<AutomationRun[]> => {
      const { data, error } = await supabase
        .from('automation_runs')
        .select('*')
        .eq('automation_id', automationId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AutomationRun[];
    },
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Omit<Automation, 'id' | 'workspace_id' | 'created_by' | 'created_at' | 'updated_at' | 'run_count' | 'last_run_at'>) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const { data, error } = await supabase
        .from('automations')
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          description: input.description,
          enabled: input.enabled,
          trigger: input.trigger as never,
          conditions: input.conditions as never,
          actions: input.actions as never,
          created_by: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      return data as unknown as Automation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Automation> & { id: string }) => {
      const { data, error } = await supabase
        .from('automations')
        .update(patch as never)
        .eq('id', id)
        .select().single();
      if (error) throw error;
      return data as unknown as Automation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}
