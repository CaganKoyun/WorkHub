import { Link } from "react-router-dom";
import { Sparkles, MessageSquare, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDomainAgent, type DomainKey } from "@/lib/domain-agents";
import { AGENTS } from "@/lib/agent-config";
import { useModuleAccess } from "@/hooks/useWorkspacePermission";
import { cn } from "@/lib/utils";

interface Props {
  domain: DomainKey;
  /** Optional sticky top offset on desktop */
  sticky?: boolean;
}

/**
 * Right-rail expert agent for a domain workspace.
 * Presentation-only: routes to /ai-chat with agent + q= prefill.
 * Server enforces which agent actually exists and workspace permissions.
 */
export function DomainAgentPanel({ domain, sticky = true }: Props) {
  const spec = getDomainAgent(domain);
  const backing = AGENTS[spec.backedBy];
  const financeGated = backing.requiresFinanceAccess;
  const { allowed: financeAllowed, isLoading } = useModuleAccess("finance", "view");
  const locked = financeGated && !isLoading && !financeAllowed;

  const chatHref = (q?: string) =>
    `/ai-chat?agent=${spec.backedBy}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <aside className={cn("w-full", sticky && "lg:sticky lg:top-4")}>
      <Card className="border-primary/20 bg-gradient-to-b from-primary/[0.04] to-transparent">
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-md bg-primary/15 text-primary grid place-items-center">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate">{spec.displayName}</p>
                  {spec.beta && (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase tracking-wide">
                      Beta
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {backing.title}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {spec.role}
            </p>
          </div>

          {locked ? (
            <div className="rounded-md border border-dashed border-border/70 p-3 text-center space-y-2">
              <Lock className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
                Bu agent finans yetkisi gerektirir. Workspace sahibinden Ayarlar → Permissions üzerinden aç.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Hazır görevler
                </p>
                {spec.quickTasks.map((q) => (
                  <Link
                    key={q}
                    to={chatHref(q)}
                    className="block text-left text-xs px-2.5 py-2 rounded-md border border-border/60 hover:border-primary/60 hover:bg-primary/5 transition-colors"
                  >
                    {q}
                  </Link>
                ))}
              </div>

              <Button asChild size="sm" className="w-full h-8">
                <Link to={chatHref()}>
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  {spec.displayName}'a mesaj yaz
                </Link>
              </Button>
            </>
          )}

          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Kaynaklar
            </p>
            <div className="flex flex-wrap gap-1">
              {spec.sources.map((s) => (
                <Badge key={s} variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                  {s}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              Gözlem · Yorum · Öneri formatında yanıt verir. Aksiyonlar Founder Inbox onayından geçer.
            </p>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
