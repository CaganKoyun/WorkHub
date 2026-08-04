import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plug, ArrowRight } from "lucide-react";
import { useCatalog, useConnections } from "@/lib/integrations-hooks";
import { ConnectionCard } from "./ConnectionCard";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type Props = {
  /** Filter catalog by one of the entry.domains, e.g. "crm", "finance". */
  domain?: string;
  /** Compact mode = smaller heading + grid for embedding in module pages. */
  compact?: boolean;
  /** Optional heading override. */
  title?: string;
};

export function IntegrationsPanel({ domain, compact = false, title }: Props) {
  const { data: catalog, isLoading: loadingCatalog } = useCatalog();
  const { data: connections, isLoading: loadingConns } = useConnections();
  const { role } = useWorkspace();
  const isAdmin = role === "owner" || role === "admin";

  const filtered = (catalog ?? []).filter(e =>
    !domain || e.domains.includes(domain) || e.key === "custom_mcp"
  );
  const connByKey = new Map<string, typeof connections extends (infer T)[] | undefined ? T : never>();
  (connections ?? []).forEach(c => {
    if (c.catalog_key) connByKey.set(c.catalog_key, c as any);
  });

  if (loadingCatalog || loadingConns) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading integrations…
      </div>
    );
  }

  if (compact) {
    // horizontal strip
    return (
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Plug className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[12px] font-semibold text-foreground">
              {title ?? "Integrations"}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {filtered.filter(e => connByKey.has(e.key)).length}/{filtered.length} connected
            </span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" asChild>
            <Link to="/integrations">Manage <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {filtered.slice(0, 8).map(entry => {
            const conn = connByKey.get(entry.key) as any;
            const connected = !!conn && conn.state === "ready";
            return (
              <Link
                key={entry.key}
                to="/integrations"
                className={`shrink-0 flex items-center gap-1.5 px-2.5 h-7 rounded-md border text-[12px] transition-colors ${
                  connected
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                <span>{entry.icon}</span>
                <span>{entry.name}</span>
                {connected && <span className="text-[9px]">●</span>}
              </Link>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {filtered.map(entry => (
        <ConnectionCard
          key={entry.key}
          entry={entry}
          connection={connByKey.get(entry.key) as any}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
