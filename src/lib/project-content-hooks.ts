import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProjectMessage {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  uploaded_by: string;
  name: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  source: string;
  external_url: string | null;
  created_at: string;
}

export function useProjectMessages(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-messages', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_messages' as any)
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectMessage[];
    },
  });
}

export function useCreateProjectMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ project_id, title, body }: { project_id: string; title: string; body: string }) => {
      const { error } = await supabase
        .from('project_messages' as any)
        .insert({ project_id, title, body, author_id: user!.id });
      if (error) throw error;
      return project_id;
    },
    onSuccess: (project_id) => qc.invalidateQueries({ queryKey: ['project-messages', project_id] }),
  });
}

export function useDeleteProjectMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await supabase.from('project_messages' as any).delete().eq('id', id);
      if (error) throw error;
      return project_id;
    },
    onSuccess: (project_id) => qc.invalidateQueries({ queryKey: ['project-messages', project_id] }),
  });
}

export function useProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-files', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files' as any)
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectFile[];
    },
  });
}

export function useUploadProjectFile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ project_id, workspace_id, file }: { project_id: string; workspace_id: string; file: File }) => {
      const path = `${workspace_id}/projects/${project_id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from('project_files' as any).insert({
        project_id,
        uploaded_by: user!.id,
        name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        source: 'upload',
      });
      if (error) throw error;
      return project_id;
    },
    onSuccess: (project_id) => qc.invalidateQueries({ queryKey: ['project-files', project_id] }),
  });
}

export function useAddExternalProjectFile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ project_id, name, external_url, source }: { project_id: string; name: string; external_url: string; source: string }) => {
      const { error } = await supabase.from('project_files' as any).insert({
        project_id,
        uploaded_by: user!.id,
        name,
        external_url,
        source,
      });
      if (error) throw error;
      return project_id;
    },
    onSuccess: (project_id) => qc.invalidateQueries({ queryKey: ['project-files', project_id] }),
  });
}

export function useDeleteProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, project_id }: { file: ProjectFile; project_id: string }) => {
      if (file.storage_path) {
        await supabase.storage.from('attachments').remove([file.storage_path]);
      }
      const { error } = await supabase.from('project_files' as any).delete().eq('id', file.id);
      if (error) throw error;
      return project_id;
    },
    onSuccess: (project_id) => qc.invalidateQueries({ queryKey: ['project-files', project_id] }),
  });
}

export async function getProjectFileSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
