import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Bugünün şirket durumu — decisions.state_snapshot ile aynı alan adlarında. */
export function useCurrentSnapshot() {
  return useQuery({
    queryKey: ["current-snapshot"],
    queryFn: async (): Promise<Record<string, number>> => {
      const nowIso = new Date().toISOString();
      const [tasks, bugs, projects, approvals, risks, txns, opps] = await Promise.all([
        supabase.from("tasks").select("status,due_date"),
        supabase.from("bugs").select("status,severity"),
        supabase.from("projects").select("status"),
        supabase.from("approvals").select("status"),
        supabase.from("risks").select("status,level"),
        supabase.from("fin_transactions").select("type,amount,status"),
        supabase.from("crm_opportunities").select("status,amount"),
      ]);

      const taskRows = (tasks.data ?? []) as { status: string; due_date: string | null }[];
      const bugRows = (bugs.data ?? []) as { status: string; severity: string }[];
      const projRows = (projects.data ?? []) as { status: string }[];
      const apprRows = (approvals.data ?? []) as { status: string }[];
      const riskRows = (risks.data ?? []) as { status: string; level: string }[];
      const txnRows = (txns.data ?? []) as { type: string; amount: number; status: string }[];
      const oppRows = (opps.data ?? []) as { status: string; amount: number | null }[];

      const openRisks = riskRows.filter((r) => r.status === "open" || r.status === "mitigating");
      const openOpps = oppRows.filter((o) => o.status === "open");

      return {
        open_tasks: taskRows.filter((t) => t.status !== "done").length,
        overdue_tasks: taskRows.filter(
          (t) => t.status !== "done" && t.due_date && t.due_date < nowIso,
        ).length,
        critical_bugs: bugRows.filter(
          (b) => b.severity === "critical" && b.status !== "resolved" && b.status !== "closed",
        ).length,
        active_projects: projRows.filter((p) => p.status === "active").length,
        pending_approvals: apprRows.filter((a) => a.status === "pending").length,
        open_risks: openRisks.length,
        critical_risks: openRisks.filter((r) => r.level === "critical").length,
        cash_position: txnRows
          .filter((t) => t.status === "posted" || t.status === "reconciled")
          .reduce((s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0), 0),
        open_opportunities: openOpps.length,
        pipeline_amount: openOpps.reduce((s, o) => s + (o.amount ?? 0), 0),
      };
    },
  });
}
