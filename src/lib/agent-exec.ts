/**
 * Agent step executor — plan step'i alır, mevcut Supabase RPC + tabloları
 * kullanarak workspace üzerinde gerçek değişiklik uygular. Her step
 * atomic-per-call. Toplu güncellemeler tek DB update ile yapılır ki hız
 * kaybı olmasın.
 */
import { supabase } from '@/integrations/supabase/client';
import type { PlanStep, StepFilter } from './agent-parse';
import type { AgentRunResult } from './agent-runs-hooks';

interface ExecCtx {
  workspaceId: string;
  members: { user_id: string; full_name: string | null }[];
}

/** Members'ı isim/email eşleşmesiyle bulur — case-insensitive. */
function resolveMember(name: string, members: ExecCtx['members']): string | null {
  const n = name.toLowerCase().trim();
  const hit = members.find(m => {
    const fn = (m.full_name ?? '').toLowerCase();
    if (fn === n) return true;
    if (fn.split(/\s+/)[0] === n) return true;              // ilk ad
    return fn.replace(/\s+/g, '') === n.replace(/\s+/g, '');
  });
  return hit?.user_id ?? null;
}

/** Filter'a uyan task id listesini döner (workspace-limited via project). */
async function matchTaskIds(f: StepFilter | undefined, workspaceId: string): Promise<string[]> {
  const filter = f ?? {};
  // Önce workspace'in projelerini çek — tasks üzerinde workspace_id yok.
  const { data: projects, error: pErr } = await supabase
    .from('projects').select('id').eq('workspace_id', workspaceId);
  if (pErr) throw pErr;
  const projectIds = (projects ?? []).map(p => p.id);
  if (projectIds.length === 0) return [];

  let q = supabase.from('tasks').select('id').in('project_id', projectIds).limit(500);
  if (filter.status?.length) q = q.in('status', filter.status as ('backlog' | 'todo' | 'in_progress' | 'review' | 'done')[]);
  if (filter.priority?.length) q = q.in('priority', filter.priority as ('low' | 'medium' | 'high' | 'urgent')[]);
  if (filter.tags?.length) q = q.overlaps('tags', filter.tags);
  if (filter.updated_before_days) {
    const cutoff = new Date(Date.now() - filter.updated_before_days * 86_400_000).toISOString();
    q = q.lt('updated_at', cutoff);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(r => r.id);
}

export async function executeStep(step: PlanStep, ctx: ExecCtx): Promise<AgentRunResult> {
  try {
    switch (step.tool) {
      case 'update_task_status': {
        const ids = await matchTaskIds(step.params.filter, ctx.workspaceId);
        if (ids.length === 0) return { step_index: -1, ok: true, detail: '0 task eşleşti' };
        const newStatus = step.params.new_status;
        if (!newStatus) throw new Error('new_status missing');
        const { error } = await supabase
          .from('tasks').update({ status: newStatus as 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' }).in('id', ids);
        if (error) throw error;
        return { step_index: -1, ok: true, detail: `${ids.length} task durumu "${newStatus}" yapıldı` };
      }
      case 'assign_tasks': {
        const name = step.params.assignee_name;
        if (!name) throw new Error('assignee_name missing');
        const uid = resolveMember(name, ctx.members);
        if (!uid) return { step_index: -1, ok: false, error: `"${name}" workspace üyesi olarak bulunamadı` };
        const ids = await matchTaskIds(step.params.filter, ctx.workspaceId);
        if (ids.length === 0) return { step_index: -1, ok: true, detail: '0 task eşleşti' };
        const { error } = await supabase
          .from('tasks').update({ assignee_id: uid }).in('id', ids);
        if (error) throw error;
        return { step_index: -1, ok: true, detail: `${ids.length} task ${name} kullanıcısına atandı` };
      }
      case 'add_tag_to_tasks': {
        const tag = step.params.tag;
        if (!tag) throw new Error('tag missing');
        const ids = await matchTaskIds(step.params.filter, ctx.workspaceId);
        if (ids.length === 0) return { step_index: -1, ok: true, detail: '0 task eşleşti' };
        // Postgres array_append via a per-row loop — supabase-js has no
        // atomic array_append across a bulk update. Kısa liste bekliyoruz.
        let updated = 0;
        for (const id of ids) {
          const { data: cur, error: gerr } = await supabase
            .from('tasks').select('tags').eq('id', id).maybeSingle();
          if (gerr) continue;
          const tags = (cur?.tags ?? []) as string[];
          if (tags.includes(tag)) continue;
          const { error } = await supabase.from('tasks').update({ tags: [...tags, tag] }).eq('id', id);
          if (!error) updated += 1;
        }
        return { step_index: -1, ok: true, detail: `${updated}/${ids.length} task'a "${tag}" etiketi eklendi` };
      }
      case 'notify_user': {
        const name = step.params.user_name;
        if (!name) throw new Error('user_name missing');
        const uid = resolveMember(name, ctx.members);
        if (!uid) return { step_index: -1, ok: false, error: `"${name}" workspace üyesi olarak bulunamadı` };
        const { error } = await supabase.rpc('enqueue_push', {
          _user_id: uid,
          _title: step.params.title ?? 'WorkHub bildirimi',
          _body: step.params.body ?? undefined,
        });
        if (error) throw error;
        return { step_index: -1, ok: true, detail: `Push kuyruğa atıldı (${name})` };
      }
      case 'noop':
      default:
        return { step_index: -1, ok: false, error: 'noop' };
    }
  } catch (e) {
    const err = e as { message?: string };
    return { step_index: -1, ok: false, error: err.message ?? String(e) };
  }
}
