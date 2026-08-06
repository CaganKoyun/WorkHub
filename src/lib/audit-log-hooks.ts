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
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLog(filters: AuditFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['audit-log', currentWorkspace?.id, filters],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<AuditRow[]> => {
      let q = supabase
        .from('audit_log')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false })
        .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50) - 1);

      if (filters.entity_type) q = q.eq('entity_type', filters.entity_type);
      if (filters.actor_id) q = q.eq('actor_id', filters.actor_id);
      if (filters.action_prefix) q = q.like('action', `${filters.action_prefix}.%`);
      if (filters.from_date) q = q.gte('created_at', filters.from_date);
      if (filters.to_date) q = q.lte('created_at', `${filters.to_date}T23:59:59`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });
}

export async function exportAuditCsv(
  workspaceId: string,
  filters: Omit<AuditFilters, 'limit' | 'offset'>,
): Promise<string> {
  let q = supabase
    .from('audit_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (filters.entity_type) q = q.eq('entity_type', filters.entity_type);
  if (filters.actor_id) q = q.eq('actor_id', filters.actor_id);
  if (filters.action_prefix) q = q.like('action', `${filters.action_prefix}.%`);
  if (filters.from_date) q = q.gte('created_at', filters.from_date);
  if (filters.to_date) q = q.lte('created_at', `${filters.to_date}T23:59:59`);

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as AuditRow[];

  const headers = ['timestamp', 'action', 'entity_type', 'entity_label', 'actor_id', 'changed_keys', 'metadata'];
  const csvRows = rows.map(r => [
    r.created_at,
    r.action,
    r.entity_type,
    r.entity_label ?? '',
    r.actor_id ?? '',
    r.changed_keys.join(';'),
    JSON.stringify(r.metadata),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  return [headers.join(','), ...csvRows].join('\n');
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
