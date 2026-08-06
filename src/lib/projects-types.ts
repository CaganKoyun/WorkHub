export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectMemberRole = 'owner' | 'member' | 'viewer';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string | null;
  end_date: string | null;
  color: string | null;
  icon: string | null;
  owner_id: string | null;
  created_by: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  created_at: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: 'Planlandı',
  active: 'Aktif',
  on_hold: 'Beklemede',
  completed: 'Tamamlandı',
  archived: 'Arşivlendi',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  planned: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  on_hold: 'bg-amber-500/20 text-warning border-amber-500/30',
  completed: 'bg-primary/20 text-primary border-primary/30',
  archived: 'bg-muted text-muted-foreground border-border',
};

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil',
};

export const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  high: 'bg-amber-500/20 text-warning border-amber-500/30',
  urgent: 'bg-destructive/20 text-destructive-foreground border-destructive/30',
};
