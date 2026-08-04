import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  computeDecisionDebt,
  evaluateAssumption,
  type AssumptionStatus,
  type DebtDecision,
  type DecisionLifecycle,
} from "@/lib/decision-contract";

/* -------------------------------- TYPES -------------------------------- */

export interface DecisionOption {
  id: string;
  workspace_id: string;
  decision_id: string;
  label: string;
  pros: string | null;
  risks: string | null;
  cost_amount: number | null;
  time_impact: string | null;
  expected_return: string | null;
  is_chosen: boolean;
  rejection_reason: string | null;
  sort_order: number;
  created_at: string;
}

export interface DecisionAssumption {
  id: string;
  workspace_id: string;
  decision_id: string;
  statement: string;
  metric_key: string | null;
  operator: string;
  threshold: number | null;
  current_value: number | null;
  unit: string | null;
  source: string | null;
  status: AssumptionStatus;
  is_critical: boolean;
  last_checked_at: string | null;
  breached_at: string | null;
  created_at: string;
}

export interface DecisionEvent {
  id: string;
  decision_id: string;
  event_type: string;
  from_state: string | null;
  to_state: string | null;
  note: string | null;
  created_at: string;
}

/* ------------------------------- OPTIONS -------------------------------- */

export function useDecisionOptions(decisionId: string | null) {
  return useQuery({
    queryKey: ["decision_options", decisionId],
    enabled: !!decisionId,
    queryFn: async (): Promise<DecisionOption[]> => {
      const { data, error } = await supabase
        .from("decision_options")
        .select("*")
        .eq("decision_id", decisionId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DecisionOption[];
    },
  });
}

export function useCreateDecisionOption() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<DecisionOption> & { decision_id: string; label: string }) => {
      if (!currentWorkspace) throw new Error("Çalışma alanı seçili değil");
      const { error } = await supabase.from("decision_options").insert({
        ...input,
        workspace_id: currentWorkspace.id,
        created_by: user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["decision_options", v.decision_id] }),
  });
}

export function useUpdateDecisionOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DecisionOption> & { id: string }) => {
      const { error } = await supabase.from("decision_options").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decision_options"] }),
  });
}

export function useDeleteDecisionOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("decision_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decision_options"] }),
  });
}

/* ----------------------------- ASSUMPTIONS ------------------------------ */

/** Tek bir kararın varsayımları. */
export function useDecisionAssumptions(decisionId: string | null) {
  return useQuery({
    queryKey: ["decision_assumptions", decisionId],
    enabled: !!decisionId,
    queryFn: async (): Promise<DecisionAssumption[]> => {
      const { data, error } = await supabase
        .from("decision_assumptions")
        .select("*")
        .eq("decision_id", decisionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DecisionAssumption[];
    },
  });
}

/** Varsayım defteri — çalışma alanındaki tüm varsayımlar. */
export function useAssumptionLedger() {
  return useQuery({
    queryKey: ["decision_assumptions", "ledger"],
    queryFn: async (): Promise<DecisionAssumption[]> => {
      const { data, error } = await supabase
        .from("decision_assumptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DecisionAssumption[];
    },
  });
}

export function useCreateAssumption() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (
      input: Partial<DecisionAssumption> & { decision_id: string; statement: string },
    ) => {
      if (!currentWorkspace) throw new Error("Çalışma alanı seçili değil");
      const status = evaluateAssumption({
        operator: input.operator ?? ">=",
        threshold: input.threshold ?? null,
        current_value: input.current_value ?? null,
      });
      const { error } = await supabase.from("decision_assumptions").insert({
        ...input,
        status,
        last_checked_at: input.current_value != null ? new Date().toISOString() : null,
        workspace_id: currentWorkspace.id,
        created_by: user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decision_assumptions"] });
      qc.invalidateQueries({ queryKey: ["decisions"] });
    },
  });
}

/** Canlı değeri güncelle — durum otomatik hesaplanır, bozulma kararı yeniden açar. */
export function useUpdateAssumption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      { id, ...patch }: Partial<DecisionAssumption> & { id: string },
    ) => {
      const next: Record<string, unknown> = { ...patch };
      if ("current_value" in patch || "threshold" in patch || "operator" in patch) {
        const { data: existing, error: readErr } = await supabase
          .from("decision_assumptions")
          .select("operator, threshold, current_value")
          .eq("id", id)
          .single();
        if (readErr) throw readErr;
        next.status = evaluateAssumption({
          operator: (patch.operator ?? existing.operator) as string,
          threshold: (patch.threshold ?? existing.threshold) as number | null,
          current_value: (patch.current_value ?? existing.current_value) as number | null,
        });
        next.last_checked_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("decision_assumptions")
        .update(next as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decision_assumptions"] });
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["decision_events"] });
    },
  });
}

export function useDeleteAssumption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("decision_assumptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decision_assumptions"] }),
  });
}

/* -------------------------------- EVENTS -------------------------------- */

export function useDecisionEvents(decisionId: string | null) {
  return useQuery({
    queryKey: ["decision_events", decisionId],
    enabled: !!decisionId,
    queryFn: async (): Promise<DecisionEvent[]> => {
      const { data, error } = await supabase
        .from("decision_events")
        .select("*")
        .eq("decision_id", decisionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DecisionEvent[];
    },
  });
}

/* ------------------------------ ACTION LINKS ---------------------------- */

/** Karardan işe dönüşüm: karara bağlı proje/görev/bütçe kayıtları. */
export function useDecisionActionLinks() {
  return useQuery({
    queryKey: ["object_links", "decision-actions"],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("object_links")
        .select("from_type, from_id, to_type, to_id");
      if (error) throw error;
      const ids = new Set<string>();
      for (const l of data ?? []) {
        if (l.from_type === "decision") ids.add(l.from_id as string);
        if (l.to_type === "decision") ids.add(l.to_id as string);
      }
      return ids;
    },
  });
}

/* ----------------------------- DECISION DEBT ---------------------------- */

export function useDecisionDebt() {
  const { data: decisions, isLoading: l1 } = useQuery({
    queryKey: ["decisions", "debt"],
    queryFn: async (): Promise<DebtDecision[]> => {
      const { data, error } = await supabase
        .from("decisions")
        .select(
          "id, title, status, lifecycle_state, owner_id, decide_by, review_at, verdict, created_at, impact_amount, cost_of_delay_amount",
        );
      if (error) throw error;
      return (data ?? []) as unknown as DebtDecision[];
    },
  });
  const { data: links, isLoading: l2 } = useDecisionActionLinks();
  const { data: assumptions, isLoading: l3 } = useAssumptionLedger();

  const debt = useMemo(() => {
    const breached = new Set(
      (assumptions ?? []).filter((a) => a.status === "breached").map((a) => a.decision_id),
    );
    return computeDecisionDebt(decisions ?? [], links ?? new Set(), breached);
  }, [decisions, links, assumptions]);

  return { debt, isLoading: l1 || l2 || l3 };
}

/* ---------------------------- LIFECYCLE MOVE ---------------------------- */

export function useAdvanceLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, to }: { id: string; to: DecisionLifecycle }) => {
      const { error } = await supabase
        .from("decisions")
        .update({ lifecycle_state: to } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["decision_events"] });
    },
  });
}
