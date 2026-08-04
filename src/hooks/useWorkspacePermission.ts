import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type PermAction = "view" | "create" | "update" | "delete" | "manage";
export type PermModule =
  | "work" | "projects" | "tasks" | "bugs"
  | "crm" | "finance" | "people" | "assets"
  | "goals" | "risks" | "decisions" | "approvals"
  | "admin" | "analytics" | "ai" | "integrations";

/** Check a single permission. Owners/admins always allowed. */
export function useWorkspacePermission(module: PermModule, action: PermAction): boolean {
  const { user } = useAuth();
  const { currentWorkspace, role } = useWorkspace();

  const { data } = useQuery({
    queryKey: ["ws-perm", currentWorkspace?.id, role, module, action],
    enabled: !!user && !!currentWorkspace && !!role,
    queryFn: async () => {
      if (role === "owner" || role === "admin") return true;
      const { data, error } = await supabase.rpc("has_workspace_permission", {
        _workspace_id: currentWorkspace!.id,
        _user_id: user!.id,
        _module: module,
        _action: action,
      });
      if (error) return false;
      return !!data;
    },
  });

  return !!data;
}

/**
 * Same check but with loading state — use for UI gating (sidebar items,
 * page guards) where a false-during-load would flash the wrong state.
 */
export function useModuleAccess(module: PermModule, action: PermAction = "view") {
  const { user } = useAuth();
  const { currentWorkspace, role } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ["ws-perm", currentWorkspace?.id, role, module, action],
    enabled: !!user && !!currentWorkspace && !!role,
    queryFn: async () => {
      if (role === "owner" || role === "admin") return true;
      const { data, error } = await supabase.rpc("has_workspace_permission", {
        _workspace_id: currentWorkspace!.id,
        _user_id: user!.id,
        _module: module,
        _action: action,
      });
      if (error) return false;
      return !!data;
    },
  });

  return { allowed: !!data, isLoading };
}
