import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  detectSilentDecisions,
  type CaptureCandidate,
  type ApprovalSignal,
  type OpportunitySignal,
} from "@/lib/decision-capture";

/**
 * Sessiz Karar Radarı — onay, fırsat, risk ve hedef sinyallerinden
 * kaydedilmemiş kararları çıkarır.
 */
export function useSilentDecisions() {
  const { currentWorkspace } = useWorkspace();

  const query = useQuery({
    queryKey: ["silent_decisions", currentWorkspace?.id],
    enabled: !!currentWorkspace,
    staleTime: 60_000,
    queryFn: async () => {
      const [approvals, opps, risks, goals, decisions] = await Promise.all([
        supabase
          .from("approvals")
          .select("id,title,kind,amount,currency,status,priority,created_at,decided_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("crm_opportunities")
          .select("id,name,amount,currency,status,stage_entered_at,expected_close_date")
          .limit(200),
        supabase.from("risks").select("id,title,level,status,created_at").limit(200),
        supabase.from("goals").select("id,title,status,progress,end_date").limit(200),
        supabase.from("decisions").select("id,source_approval_id").limit(500),
      ]);

      const captured = new Set(
        ((decisions.data ?? []) as { source_approval_id: string | null }[])
          .map((d) => d.source_approval_id)
          .filter((v): v is string => !!v),
      );

      return detectSilentDecisions({
        approvals: (approvals.data ?? []) as unknown as ApprovalSignal[],
        opportunities: (opps.data ?? []) as unknown as OpportunitySignal[],
        risks: ((risks.data ?? []) as { id: string; title: string; level: string | null; status: string | null; created_at: string }[]).map(
          (r) => ({ id: r.id, title: r.title, severity: r.level, status: r.status, created_at: r.created_at }),
        ),
        goals: ((goals.data ?? []) as { id: string; title: string; status: string | null; progress: number | null; end_date: string | null }[]).map(
          (g) => ({ id: g.id, title: g.title, status: g.status, progress: g.progress, due_date: g.end_date }),
        ),
        capturedApprovalIds: captured,
      });
    },
  });

  const candidates: CaptureCandidate[] = useMemo(() => query.data ?? [], [query.data]);

  return { candidates, isLoading: query.isLoading, refetch: query.refetch };
}
