import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Tables, Enums } from "@/integrations/supabase/types";

type BugRow = Tables<"bugs">;
type CommentRow = Tables<"comments">;

/* ------------------------------------------------------------------ */
/*  Queries                                                           */
/* ------------------------------------------------------------------ */

export function useBugs() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["bugs", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<BugRow[]> => {
      const { data, error } = await supabase
        .from("bugs")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BugRow[];
    },
  });
}

export function useBug(id: string | undefined) {
  return useQuery({
    queryKey: ["bug", id],
    enabled: !!id,
    queryFn: async (): Promise<BugRow> => {
      const { data, error } = await supabase
        .from("bugs")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as BugRow;
    },
  });
}

export function useBugComments(bugId: string | undefined) {
  return useQuery({
    queryKey: ["bug-comments", bugId],
    enabled: !!bugId,
    queryFn: async (): Promise<CommentRow[]> => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("bug_id", bugId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CommentRow[];
    },
  });
}

export function useBugCommentProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ["bug-comment-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((p) => {
        map[p.user_id] = p.full_name;
      });
      return map;
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                         */
/* ------------------------------------------------------------------ */

export function useCreateBug() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: Pick<BugRow, "title" | "description" | "severity"> &
        Partial<
          Pick<
            BugRow,
            | "steps_to_reproduce"
            | "expected_behavior"
            | "actual_behavior"
            | "environment"
            | "assignee_id"
            | "project_id"
          >
        >
    ) => {
      const { data, error } = await supabase
        .from("bugs")
        .insert({
          title: input.title,
          description: input.description,
          severity: input.severity,
          steps_to_reproduce: input.steps_to_reproduce ?? null,
          expected_behavior: input.expected_behavior ?? null,
          actual_behavior: input.actual_behavior ?? null,
          environment: input.environment ?? null,
          assignee_id: input.assignee_id ?? null,
          project_id: input.project_id ?? null,
          reporter_id: user!.id,
        })
        .select("tracking_id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bugs"] });
    },
  });
}

export function useUpdateBug() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<BugRow> & { id: string }) => {
      const { data, error } = await supabase
        .from("bugs")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as BugRow;
    },
    onSuccess: (bug) => {
      qc.invalidateQueries({ queryKey: ["bugs"] });
      qc.invalidateQueries({ queryKey: ["bug", bug.id] });
    },
  });
}

export function useAddBugComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      bug_id,
      content,
    }: {
      bug_id: string;
      content: string;
    }) => {
      const { error } = await supabase
        .from("comments")
        .insert({ bug_id, user_id: user!.id, content });
      if (error) throw error;
      return bug_id;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["bug-comments", v.bug_id] });
    },
  });
}

export function useLogBugActivity() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      bug_id,
      action,
      old_value,
      new_value,
    }: {
      bug_id: string;
      action: string;
      old_value: string | null;
      new_value: string | null;
    }) => {
      const { error } = await supabase.from("activity_log").insert({
        bug_id,
        user_id: user!.id,
        action,
        old_value,
        new_value,
      });
      if (error) throw error;
    },
  });
}
