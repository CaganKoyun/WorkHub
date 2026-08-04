import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SIGNAL_RULES, ruleThreshold, type SignalRuleKey } from "@/lib/signal-rules";
import { toast } from "sonner";

interface RuleRow {
  id: string;
  rule_key: string;
  enabled: boolean;
  params: unknown;
}

function useSignalRules() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["signal-rules", currentWorkspace?.id],
    enabled: !!currentWorkspace,
    queryFn: async (): Promise<RuleRow[]> => {
      const { data, error } = await supabase.from("signal_rules").select("id,rule_key,enabled,params");
      if (error) throw error;
      return (data ?? []) as RuleRow[];
    },
  });
}

function useUpsertSignalRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { key: SignalRuleKey; enabled: boolean; param?: number }) => {
      const def = SIGNAL_RULES.find((r) => r.key === input.key)!;
      const params = input.param !== undefined ? { [def.paramName]: input.param } : {};
      const { error } = await supabase.from("signal_rules").upsert(
        {
          workspace_id: currentWorkspace!.id,
          rule_key: input.key,
          enabled: input.enabled,
          params,
        },
        { onConflict: "workspace_id,rule_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signal-rules"] }),
    onError: (e) => toast.error("Kural kaydedilemedi: " + (e instanceof Error ? e.message : "")),
  });
}

/**
 * F6 — 5 sabit sinyal kuralı. Açık kurallar günlük taramada (signal-scan)
 * değerlendirilir; tetiklenen sinyal Founder Inbox'a onay olarak düşer.
 */
export function SignalRulesPanel({ canManage }: { canManage: boolean }) {
  const { data: rules, isLoading } = useSignalRules();
  const upsert = useUpsertSignalRule();

  if (isLoading) return <Skeleton className="h-64" />;

  const rowFor = (key: string) => rules?.find((r) => r.rule_key === key);

  return (
    <Card className="divide-y">
      <div className="p-4">
        <p className="text-sm font-medium">Sinyal Kuralları</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Açık kurallar günde bir taranır; tetiklenen sinyal Founder Inbox'a karar
          talebi olarak düşer. Aynı kayıt için aynı kural yalnızca bir kez tetiklenir.
        </p>
      </div>
      {SIGNAL_RULES.map((def) => {
        const row = rowFor(def.key);
        const enabled = row?.enabled ?? false;
        const value = ruleThreshold(def, row?.params);
        return (
          <div key={def.key} className="flex items-center gap-3 p-4">
            <Switch
              checked={enabled}
              disabled={!canManage || upsert.isPending}
              onCheckedChange={(v) => upsert.mutate({ key: def.key, enabled: v, param: value })}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{def.label}</p>
              <p className="text-xs text-muted-foreground">{def.description}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                className="h-8 w-20 text-xs"
                min={def.min} max={def.max}
                defaultValue={value}
                disabled={!canManage}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= def.min && n <= def.max && n !== value) {
                    upsert.mutate({ key: def.key, enabled, param: n });
                  }
                }}
              />
              <span className="w-24 text-[11px] text-muted-foreground">{def.paramLabel}</span>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
