import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface Attachment {
  id: string;
  workspace_id: string;
  task_id: string | null;
  doc_id: string | null;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

const BUCKET = 'attachments';

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', 'task', taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<Attachment[]> => {
      const { data, error } = await (supabase as any)
        .from('attachments')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attachment[];
    },
  });
}

export function useUploadTaskAttachment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      if (!user) throw new Error('Not authenticated');
      const key = crypto.randomUUID();
      const path = `${currentWorkspace.id}/tasks/${taskId}/${key}-${safeName(file.name)}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (up.error) throw up.error;
      const { data, error } = await (supabase as any)
        .from('attachments')
        .insert({
          workspace_id: currentWorkspace.id,
          task_id: taskId,
          storage_path: path,
          filename: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: user.id,
        })
        .select().single();
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
      return data as Attachment;
    },
    onSuccess: (att) => {
      qc.invalidateQueries({ queryKey: ['attachments', 'task', att.task_id] });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (att: Attachment) => {
      await supabase.storage.from(BUCKET).remove([att.storage_path]);
      const { error } = await (supabase as any)
        .from('attachments')
        .delete()
        .eq('id', att.id);
      if (error) throw error;
      return att;
    },
    onSuccess: (att) => {
      if (att.task_id) qc.invalidateQueries({ queryKey: ['attachments', 'task', att.task_id] });
    },
  });
}

/** Signed URL cache (60 s) so a download click doesn't re-round-trip. */
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function signedDownloadUrl(path: string): Promise<string> {
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw error ?? new Error('sign failed');
  urlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 60_000 });
  return data.signedUrl;
}

export function formatBytes(n: number | null | undefined): string {
  if (!n || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
