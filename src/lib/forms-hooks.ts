import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type FormFieldKind =
  | 'text' | 'textarea' | 'number' | 'email' | 'select' | 'checkbox';

export interface FormField {
  key: string;
  label: string;
  kind: FormFieldKind;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export type FormTargetKind = 'none' | 'task';

export interface FormDef {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  description: string | null;
  fields: FormField[];
  is_public: boolean;
  is_open: boolean;
  submit_message: string;
  target_kind: FormTargetKind;
  target_project_id: string | null;
  submission_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  workspace_id: string;
  values: Record<string, unknown>;
  submitter_email: string | null;
  task_id: string | null;
  created_at: string;
}

export const FIELD_KIND_LABELS: Record<FormFieldKind, string> = {
  text: 'Kısa metin',
  textarea: 'Uzun metin',
  number: 'Sayı',
  email: 'E-posta',
  select: 'Seçim',
  checkbox: 'Onay',
};

function randSlug() {
  return Math.random().toString(36).slice(2, 10);
}

export function useForms() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['forms', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<FormDef[]> => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FormDef[];
    },
  });
}

export function useForm(id: string | undefined) {
  return useQuery({
    queryKey: ['form', id],
    enabled: !!id,
    queryFn: async (): Promise<FormDef | null> => {
      const { data, error } = await supabase
        .from('forms').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as unknown as FormDef | null;
    },
  });
}

/** Public read by slug (used by the /f/:slug route). Anon-safe. */
export function usePublicForm(slug: string | undefined) {
  return useQuery({
    queryKey: ['form-public', slug],
    enabled: !!slug,
    queryFn: async (): Promise<FormDef | null> => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug!)
        .eq('is_public', true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FormDef | null;
    },
  });
}

export function useFormSubmissions(formId: string | undefined) {
  return useQuery({
    queryKey: ['form-submissions', formId],
    enabled: !!formId,
    queryFn: async (): Promise<FormSubmission[]> => {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', formId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as FormSubmission[];
    },
  });
}

export function useCreateForm() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      name: string; description?: string | null; fields: FormField[];
      is_public?: boolean; target_kind?: FormTargetKind;
      target_project_id?: string | null;
    }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const { data, error } = await supabase
        .from('forms')
        .insert({
          workspace_id: currentWorkspace.id,
          slug: randSlug(),
          name: input.name,
          description: input.description ?? null,
          fields: input.fields as never,
          is_public: input.is_public ?? true,
          target_kind: input.target_kind ?? 'none',
          target_project_id: input.target_project_id ?? null,
          created_by: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      return data as unknown as FormDef;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

export function useUpdateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FormDef> & { id: string }) => {
      const { data, error } = await supabase
        .from('forms').update(patch as never).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as FormDef;
    },
    onSuccess: (form) => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      qc.invalidateQueries({ queryKey: ['form', form.id] });
    },
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

/** Anonymous submit against the RLS-permitted insert path. */
export function useSubmitForm() {
  return useMutation({
    mutationFn: async ({ form, values, submitter_email }: {
      form: FormDef;
      values: Record<string, unknown>;
      submitter_email?: string;
    }) => {
      const { error } = await supabase.from('form_submissions').insert({
        form_id: form.id,
        workspace_id: form.workspace_id,
        values: values as never,
        submitter_email: submitter_email ?? null,
      });
      if (error) throw error;
    },
  });
}
