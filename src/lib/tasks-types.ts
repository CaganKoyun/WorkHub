export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  tracking_id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  assignee_id: string | null;
  reporter_id: string;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  story_points: number | null;
  cycle_id: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Yapılacak',
  in_progress: 'Devam Ediyor',
  review: 'İncelemede',
  done: 'Tamamlandı',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: 'bg-muted text-muted-foreground border-border',
  todo: 'bg-muted text-muted-foreground border-border',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  review: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export const TASK_STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/20 text-blue-300',
  high: 'bg-amber-500/20 text-amber-300',
  urgent: 'bg-destructive/20 text-destructive-foreground',
};
