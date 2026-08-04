import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface Department {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  head_user_id: string | null;
  color: string;
  icon: string;
  position: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  workspace_id: string;
  department_id: string | null;
  name: string;
  description: string | null;
  lead_user_id: string | null;
  color: string;
  is_archived: boolean;
}

export interface JobTitle {
  id: string;
  workspace_id: string;
  department_id: string | null;
  name: string;
  level: string | null;
  description: string | null;
}

export interface LegalEntity {
  id: string;
  workspace_id: string;
  name: string;
  legal_name: string | null;
  country: string | null;
  currency: string | null;
  tax_id: string | null;
  is_primary: boolean;
}

export interface ModuleOwnership {
  id: string;
  workspace_id: string;
  module: string;
  owner_department_id: string | null;
  system_admin_user_id: string | null;
}

export interface PermissionSet {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permission_map: Record<string, Record<string, boolean>>;
  scope: Record<string, unknown>;
}

const wsKey = (workspaceId: string | undefined, resource: string) =>
  ["org", resource, workspaceId] as const;

// ---------- Departments ----------
export function useDepartments() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: wsKey(currentWorkspace?.id, "departments"),
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("departments")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("position", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Department[];
    },
  });
}

export function useUpsertDepartment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<Department> & { name: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id };
      const { data, error } = input.id
        ? await (supabase as any).from("departments").update(payload).eq("id", input.id).select().single()
        : await (supabase as any).from("departments").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "departments", currentWorkspace?.id] });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "departments", currentWorkspace?.id] }),
  });
}

// ---------- Teams ----------
export function useTeams() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: wsKey(currentWorkspace?.id, "teams"),
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("teams").select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Team[];
    },
  });
}

export function useUpsertTeam() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<Team> & { name: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id };
      const { data, error } = input.id
        ? await (supabase as any).from("teams").update(payload).eq("id", input.id).select().single()
        : await (supabase as any).from("teams").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "teams", currentWorkspace?.id] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "teams", currentWorkspace?.id] }),
  });
}

// ---------- Job titles ----------
export function useJobTitles() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: wsKey(currentWorkspace?.id, "job_titles"),
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("job_titles").select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as JobTitle[];
    },
  });
}

export function useUpsertJobTitle() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<JobTitle> & { name: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id };
      const { data, error } = input.id
        ? await (supabase as any).from("job_titles").update(payload).eq("id", input.id).select().single()
        : await (supabase as any).from("job_titles").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "job_titles", currentWorkspace?.id] }),
  });
}

export function useDeleteJobTitle() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("job_titles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "job_titles", currentWorkspace?.id] }),
  });
}

// ---------- Legal entities ----------
export function useLegalEntities() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: wsKey(currentWorkspace?.id, "legal_entities"),
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_entities").select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as LegalEntity[];
    },
  });
}

export function useUpsertLegalEntity() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<LegalEntity> & { name: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id };
      const { data, error } = input.id
        ? await (supabase as any).from("legal_entities").update(payload).eq("id", input.id).select().single()
        : await (supabase as any).from("legal_entities").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "legal_entities", currentWorkspace?.id] }),
  });
}

export function useDeleteLegalEntity() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("legal_entities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "legal_entities", currentWorkspace?.id] }),
  });
}

// ---------- Module ownership ----------
export const FOUNDEROS_MODULES = [
  "work", "projects", "tasks", "bugs",
  "crm", "sales", "support",
  "finance", "accounting", "budgets", "procurement",
  "people", "hiring", "performance",
  "product", "engineering", "releases",
  "operations", "inventory", "assets",
  "goals", "risks", "decisions",
  "analytics", "ai",
];

export function useModuleOwnership() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: wsKey(currentWorkspace?.id, "module_ownership"),
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("module_ownership").select("*")
        .eq("workspace_id", currentWorkspace!.id);
      if (error) throw error;
      return (data ?? []) as ModuleOwnership[];
    },
  });
}

export function useUpsertModuleOwnership() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { module: string; owner_department_id?: string | null; system_admin_user_id?: string | null }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await (supabase as any)
        .from("module_ownership")
        .upsert(
          { ...input, workspace_id: currentWorkspace.id },
          { onConflict: "workspace_id,module" }
        )
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "module_ownership", currentWorkspace?.id] }),
  });
}

// ---------- Permission sets ----------
export function usePermissionSets() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: wsKey(currentWorkspace?.id, "permission_sets"),
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("permission_sets").select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as PermissionSet[];
    },
  });
}

export function useUpsertPermissionSet() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<PermissionSet> & { name: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const payload: any = { ...input, workspace_id: currentWorkspace.id };
      const { data, error } = input.id
        ? await (supabase as any).from("permission_sets").update(payload).eq("id", input.id).select().single()
        : await (supabase as any).from("permission_sets").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "permission_sets", currentWorkspace?.id] }),
  });
}

export function useDeletePermissionSet() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("permission_sets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "permission_sets", currentWorkspace?.id] }),
  });
}
