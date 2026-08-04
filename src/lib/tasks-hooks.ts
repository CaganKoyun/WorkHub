import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, TaskComment, TaskStatus } from './tasks-types';

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId!)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

export function useMyTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-tasks', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', user!.id)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

/**
 * F16 — Sahipsiz görevler. Kimseye atanmamış açık işler hiçbir kişisel
 * listede görünmüyordu ("veri kaybı" hissi); Görevlerim sayfasında ayrı
 * grup olarak gösterilir. Kapsam RLS ile workspace'e sınırlıdır.
 */
export function useUnassignedTasks() {
  return useQuery({
    queryKey: ['unassigned-tasks'],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('assignee_id', null)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Task> & { project_id: string; title: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: input.project_id,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? 'todo',
          priority: input.priority ?? 'medium',
          tags: input.tags ?? [],
          assignee_id: input.assignee_id ?? null,
          reporter_id: user!.id,
          due_date: input.due_date ?? null,
          estimated_hours: input.estimated_hours ?? null,
          parent_task_id: input.parent_task_id ?? null,
          cycle_id: input.cycle_id ?? null,
          story_points: input.story_points ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['tasks', v.project_id] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['tasks', task.project_id] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      qc.invalidateQueries({ queryKey: ['unassigned-tasks'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return project_id;
    },
    onSuccess: (project_id) => {
      qc.invalidateQueries({ queryKey: ['tasks', project_id] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskComment[];
    },
  });
}

export function useAddTaskComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ task_id, body }: { task_id: string; body: string }) => {
      const { error } = await supabase
        .from('task_comments')
        .insert({ task_id, author_id: user!.id, body });
      if (error) throw error;
      return task_id;
    },
    onSuccess: (task_id) => qc.invalidateQueries({ queryKey: ['task-comments', task_id] }),
  });
}

// ---------------------------------------------------------------------------
// Sub-tasks
// ---------------------------------------------------------------------------
export function useSubtasks(parentTaskId: string | undefined) {
  return useQuery({
    queryKey: ['subtasks', parentTaskId],
    enabled: !!parentTaskId,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', parentTaskId!)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

// ---------------------------------------------------------------------------
// Task dependencies (blocked_by / blocks)
// ---------------------------------------------------------------------------
export interface TaskDependencyEdge {
  id: string;
  blocking_task_id: string;
  blocked_task_id: string;
  other: { id: string; title: string; tracking_id: string; status: string; project_id: string } | null;
}

export function useTaskDependencies(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-dependencies', taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<{ blocking: TaskDependencyEdge[]; blockedBy: TaskDependencyEdge[] }> => {
      // Rows where this task is blocked_by others → "blocked by"
      // Rows where this task is blocking others → "blocking"
      const [blockedByRes, blockingRes] = await Promise.all([
        supabase
          .from('task_dependencies')
          .select('id, blocking_task_id, blocked_task_id, blocking:tasks!task_dependencies_blocking_task_id_fkey(id,title,tracking_id,status,project_id)')
          .eq('blocked_task_id', taskId!),
        supabase
          .from('task_dependencies')
          .select('id, blocking_task_id, blocked_task_id, blocked:tasks!task_dependencies_blocked_task_id_fkey(id,title,tracking_id,status,project_id)')
          .eq('blocking_task_id', taskId!),
      ]);
      if (blockedByRes.error) throw blockedByRes.error;
      if (blockingRes.error) throw blockingRes.error;
      return {
        blockedBy: (blockedByRes.data ?? []).map((r: any) => ({
          id: r.id,
          blocking_task_id: r.blocking_task_id,
          blocked_task_id: r.blocked_task_id,
          other: Array.isArray(r.blocking) ? r.blocking[0] : r.blocking,
        })),
        blocking: (blockingRes.data ?? []).map((r: any) => ({
          id: r.id,
          blocking_task_id: r.blocking_task_id,
          blocked_task_id: r.blocked_task_id,
          other: Array.isArray(r.blocked) ? r.blocked[0] : r.blocked,
        })),
      };
    },
  });
}

export function useAddTaskDependency() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      workspace_id, blocking_task_id, blocked_task_id,
    }: { workspace_id: string; blocking_task_id: string; blocked_task_id: string }) => {
      if (blocking_task_id === blocked_task_id) throw new Error('Bir görev kendini bloklayamaz');
      const { error } = await supabase
        .from('task_dependencies')
        .insert({ workspace_id, blocking_task_id, blocked_task_id, created_by: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['task-dependencies', v.blocked_task_id] });
      qc.invalidateQueries({ queryKey: ['task-dependencies', v.blocking_task_id] });
    },
  });
}

export function useRemoveTaskDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; blocked_task_id?: string; blocking_task_id?: string }) => {
      const { error } = await supabase.from('task_dependencies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      if (v.blocked_task_id) qc.invalidateQueries({ queryKey: ['task-dependencies', v.blocked_task_id] });
      if (v.blocking_task_id) qc.invalidateQueries({ queryKey: ['task-dependencies', v.blocking_task_id] });
    },
  });
}

// ---------------------------------------------------------------------------
// Global / workspace-wide issues (across projects)
// ---------------------------------------------------------------------------
export function useWorkspaceIssues() {
  return useQuery({
    queryKey: ['workspace-issues'],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, position, project_id }: { id: string; status: TaskStatus; position: number; project_id: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status, position })
        .eq('id', id);
      if (error) throw error;
      return project_id;
    },
    onSuccess: (project_id) => qc.invalidateQueries({ queryKey: ['tasks', project_id] }),
  });
}
