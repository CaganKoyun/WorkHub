import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogEntry, WorkspaceConnection, McpTool } from "./integrations-types";

async function callMcpFn(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("mcp-connections", {
    body: { action, ...payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useCatalog() {
  return useQuery({
    queryKey: ["integrations", "catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations_catalog")
        .select("*")
        .order("featured", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as CatalogEntry[];
    },
  });
}

export function useConnections() {
  return useQuery({
    queryKey: ["integrations", "connections"],
    queryFn: async () => {
      const data = await callMcpFn("list");
      return (data?.items ?? []) as WorkspaceConnection[];
    },
  });
}

export function useMcpTools() {
  return useQuery({
    queryKey: ["integrations", "tools"],
    queryFn: async () => {
      const data = await callMcpFn("list_tools");
      return (data?.tools ?? []) as McpTool[];
    },
    staleTime: 60_000,
  });
}

export function useConnectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      catalog_key?: string;
      display_name: string;
      mcp_url: string;
      transport?: "http" | "sse";
      scope?: "workspace" | "personal";
      bearer_token?: string;
    }) => callMcpFn("connect", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations", "connections"] });
      qc.invalidateQueries({ queryKey: ["integrations", "tools"] });
    },
  });
}

export function useDisconnectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callMcpFn("disconnect", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations", "connections"] });
      qc.invalidateQueries({ queryKey: ["integrations", "tools"] });
    },
  });
}

export function useRetryConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callMcpFn("retry", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations", "connections"] });
      qc.invalidateQueries({ queryKey: ["integrations", "tools"] });
    },
  });
}
