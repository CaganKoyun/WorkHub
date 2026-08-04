import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { Task, TaskPriority, TaskStatus, TaskRecurrence } from './tasks-types';

/**
 * A stored task template. The `body` field carries a partial task shape
 * (everything except IDs / dates / assignee / project) so we can hydrate
 * it into a real task at any time.
 */
export interface TaskTemplateBody {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  estimated_hours?: number | null;
  story_points?: number | null;
  recurrence?: TaskRecurrence | null;
  /** Sub-tasks stored inline. Each is spawned with the parent when hydrated. */
  subtasks?: Array<Pick<TaskTemplateBody, 'title' | 'description' | 'priority' | 'story_points' | 'estimated_hours' | 'tags'>>;
}

export interface TaskTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string | null;
  body: TaskTemplateBody;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplateBody {
  name: string;
  description?: string | null;
  status?: string;
  priority?: string;
  tasks?: TaskTemplateBody[];
}

export interface ProjectTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string | null;
  body: ProjectTemplateBody;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Task templates
// ---------------------------------------------------------------------------
export function useTaskTemplates() {
  return useQuery({
    queryKey: ['task-templates'],
    queryFn: async (): Promise<TaskTemplate[]> => {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TaskTemplate[];
    },
  });
}

export function useCreateTaskTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; category?: string; body: TaskTemplateBody }) => {
      if (!currentWorkspace) throw new Error('Aktif workspace yok');
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
          body: input.body as never,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TaskTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-templates'] }),
  });
}

export function useDeleteTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-templates'] }),
  });
}

/** Turn a template body into an insertable `tasks` row (plus subtasks). */
export function hydrateTaskTemplate(
  tpl: TaskTemplateBody,
  ctx: { project_id: string; reporter_id: string },
): { root: Partial<Task> & { title: string; project_id: string; reporter_id: string }; subtasks: Partial<Task>[] } {
  const root = {
    project_id: ctx.project_id,
    reporter_id: ctx.reporter_id,
    title: tpl.title,
    description: tpl.description ?? null,
    status: tpl.status ?? 'todo',
    priority: tpl.priority ?? 'medium',
    tags: tpl.tags ?? [],
    estimated_hours: tpl.estimated_hours ?? null,
    story_points: tpl.story_points ?? null,
    recurrence: tpl.recurrence ?? null,
  };
  const subtasks = (tpl.subtasks ?? []).map(s => ({
    project_id: ctx.project_id,
    reporter_id: ctx.reporter_id,
    title: s.title,
    description: s.description ?? null,
    priority: s.priority ?? 'medium',
    tags: s.tags ?? [],
    estimated_hours: s.estimated_hours ?? null,
    story_points: s.story_points ?? null,
  }));
  return { root, subtasks };
}

// ---------------------------------------------------------------------------
// Project templates
// ---------------------------------------------------------------------------
export function useProjectTemplates() {
  return useQuery({
    queryKey: ['project-templates'],
    queryFn: async (): Promise<ProjectTemplate[]> => {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectTemplate[];
    },
  });
}

export function useCreateProjectTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; category?: string; body: ProjectTemplateBody }) => {
      if (!currentWorkspace) throw new Error('Aktif workspace yok');
      const { data, error } = await supabase
        .from('project_templates')
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
          body: input.body as never,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProjectTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-templates'] }),
  });
}

export function useDeleteProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-templates'] }),
  });
}
