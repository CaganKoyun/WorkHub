export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type TaskRecurrence = {
  freq: RecurrenceFreq;
  interval: number;
  /** ISO date at which the series ends; omit for indefinite. */
  until?: string | null;
  /** Total occurrences allowed; omit for indefinite. */
  count?: number | null;
  // Index signature so the shape is assignable to Supabase's Json type.
  [key: string]: string | number | null | undefined;
};

export const RECURRENCE_LABELS: Record<RecurrenceFreq, string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
  monthly: 'Aylık',
  yearly: 'Yıllık',
};

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
  recurrence: TaskRecurrence | null;
  recurrence_source_id: string | null;
  recurrence_count_completed: number;
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
  review: 'bg-amber-500/20 text-warning border-amber-500/30',
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
  high: 'bg-amber-500/20 text-warning',
  urgent: 'bg-destructive/20 text-destructive-foreground',
};
