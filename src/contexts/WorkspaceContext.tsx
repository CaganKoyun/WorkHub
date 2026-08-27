import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type WorkspaceRole = "owner" | "admin" | "manager" | "member" | "viewer" | "guest";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  industry: string | null;
  size: string | null;
  country: string | null;
  default_currency: string;
  plan: string;
  trial_ends_at: string | null;
  owner_id: string;
}

export interface WorkspaceOnboarding {
  workspace_id: string;
  company_setup_done: boolean;
  team_invited_done: boolean;
  sample_data_seeded: boolean;
  modules_selected_done: boolean;
  finished_at: string | null;
  enabled_modules: string[];
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  role: WorkspaceRole | null;
  onboarding: WorkspaceOnboarding | null;
  loading: boolean;
  needsOnboarding: boolean;
  switchWorkspace: (id: string) => Promise<void>;
  createWorkspace: (input: { name: string; industry?: string; size?: string; country?: string; currency?: string }) => Promise<string>;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [onboarding, setOnboarding] = useState<WorkspaceOnboarding | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) {
      setWorkspaces([]); setCurrentWorkspace(null); setRole(null); setOnboarding(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    // memberships → workspaces
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces:workspace_id(*)")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const wsList: Workspace[] = (memberships ?? [])
      .map((m: any) => m.workspaces)
      .filter(Boolean);
    setWorkspaces(wsList);

    // active workspace
    const { data: active } = await supabase
      .from("user_active_workspace")
      .select("workspace_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let activeId = active?.workspace_id ?? wsList[0]?.id ?? null;

    // if active ws not among memberships, fall back
    if (activeId && !wsList.find(w => w.id === activeId)) {
      activeId = wsList[0]?.id ?? null;
      if (activeId) {
        await supabase.from("user_active_workspace")
          .upsert({ user_id: user.id, workspace_id: activeId });
      }
    }

    const active_ws = wsList.find(w => w.id === activeId) ?? null;
    setCurrentWorkspace(active_ws);

    const activeMembership = (memberships ?? []).find((m: any) => m.workspace_id === activeId);
    setRole((activeMembership?.role as WorkspaceRole) ?? null);

    if (active_ws) {
      const { data: ob } = await supabase
        .from("workspace_onboarding")
        .select("*")
        .eq("workspace_id", active_ws.id)
        .maybeSingle();
      setOnboarding(ob as WorkspaceOnboarding | null);
    } else {
      setOnboarding(null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) loadAll();
  }, [authLoading, user, loadAll]);

  const switchWorkspace = async (id: string) => {
    if (!user) return;
    await supabase.from("user_active_workspace")
      .upsert({ user_id: user.id, workspace_id: id });
    await loadAll();
  };

  const createWorkspace: WorkspaceContextValue["createWorkspace"] = async ({ name, industry, size, country, currency }) => {
    // Explicit nulls — passing `undefined` makes supabase-js drop the key,
    // which breaks Postgres overload resolution once PostgREST caches see
    // multiple signatures.
    const { data, error } = await supabase.rpc("create_workspace", {
      _name: name,
      _slug: null,
      _industry: industry ?? null,
      _size: size ?? null,
      _country: country ?? null,
      _currency: currency ?? "USD",
    } as never);
    if (error) throw error;
    await loadAll();
    return data as string;
  };

  const needsOnboarding = !!user && !loading && (workspaces.length === 0 || (!!onboarding && !onboarding.finished_at));

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, currentWorkspace, role, onboarding, loading, needsOnboarding, switchWorkspace, createWorkspace, refresh: loadAll }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};
