import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface AuditRow {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  changed_keys: string[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditFilters {
  entity_type?: string;
  actor_id?: string;
  action_prefix?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLog(filters: AuditFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['audit-log', currentWorkspace?.id, filters],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase.rpc('audit_log_page', {
        _workspace_id: currentWorkspace!.id,
        _entity_type: filters.entity_type ?? undefined,
        _actor_id: filters.actor_id ?? undefined,
        _action_prefix: filters.action_prefix ?? undefined,
        _limit: filters.limit ?? 50,
        _offset: filters.offset ?? 0,
      });
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });
}

/** Human-readable dot-notation labels. */
export const ACTION_LABELS: Record<string, string> = {
  'task.created': 'Task oluşturuldu',
  'task.updated': 'Task güncellendi',
  'task.deleted': 'Task silindi',
  'project.created': 'Proje oluşturuldu',
  'project.status_changed': 'Proje statüsü değişti',
  'project.deleted': 'Proje silindi',
  'automation.created': 'Otomasyon oluşturuldu',
  'automation.enabled': 'Otomasyon aktifleşti',
  'automation.disabled': 'Otomasyon duraklatıldı',
  'automation.deleted': 'Otomasyon silindi',
  'custom_field.created': 'Custom field eklendi',
  'custom_field.deleted': 'Custom field silindi',
};

export const ENTITY_LABELS: Record<string, string> = {
  task: 'Task',
  project: 'Proje',
  automation: 'Otomasyon',
  custom_field: 'Custom field',
  bug: 'Bug',
  decision: 'Karar',
};
