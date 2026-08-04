export type CycleStatus = 'planned' | 'active' | 'completed';

export interface Cycle {
  id: string;
  workspace_id: string;
  team_id: string | null;
  name: string;
  number: number;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  goal: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CycleProgress {
  total_tasks: number;
  done_tasks: number;
  total_points: number;
  done_points: number;
}

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  planned: 'Planlı',
  active: 'Aktif',
  completed: 'Tamamlandı',
};
