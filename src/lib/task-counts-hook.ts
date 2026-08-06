import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskCounts {
  subtasks: number;
  comments: number;
  attachments: number;
}

/**
 * Aggregate subtask / comment / attachment counts per task id in three
 * parallel queries. Keyed on the sorted id list so the same board draw
 * doesn't refetch. Empty map is returned for an empty id list.
 */
export function useTaskCounts(taskIds: string[] | undefined) {
  const ids = (taskIds ?? []).slice().sort();
  return useQuery({
    queryKey: ['task-counts', ids],
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, TaskCounts>> => {
      const [subs, comments, atts] = await Promise.all([
        supabase.from('tasks').select('parent_task_id').in('parent_task_id', ids),
        supabase.from('task_comments').select('task_id').in('task_id', ids),
        (supabase as any).from('task_attachments').select('task_id').in('task_id', ids),
      ]);

      const out: Record<string, TaskCounts> = {};
      for (const id of ids) out[id] = { subtasks: 0, comments: 0, attachments: 0 };
      for (const row of subs.data ?? []) {
        const k = (row as any).parent_task_id;
        if (out[k]) out[k].subtasks += 1;
      }
      for (const row of comments.data ?? []) {
        const k = (row as any).task_id;
        if (out[k]) out[k].comments += 1;
      }
      for (const row of atts.data ?? []) {
        const k = (row as any).task_id;
        if (out[k]) out[k].attachments += 1;
      }
      return out;
    },
  });
}
