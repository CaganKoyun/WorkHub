import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plug, Sparkles, Trash2, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useCatalog, useConnections, useDisconnectMutation, useRetryConnection, useMcpTools } from "@/lib/integrations-hooks";
import { CustomMcpDialog } from "@/components/integrations/CustomMcpDialog";
import { ConnectionCard } from "@/components/integrations/ConnectionCard";
import { useWorkspacePermission } from "@/hooks/useWorkspacePermission";
import { useOAuthPopup } from "@/lib/use-oauth-popup";

const CATEGORIES = [
  { key: "all", label: "Tümü" },
  { key: "crm", label: "CRM" },
  { key: "comms", label: "İletişim" },
  { key: "dev", label: "Geliştirme" },
  { key: "finance", label: "Finans" },
  { key: "docs", label: "Doküman" },
  { key: "support", label: "Destek" },
  { key: "custom", label: "Özel MCP" },
];

export default function Integrations() {
  const [cat, setCat] = useState("all");
  const { data: catalog, isLoading: loadingCatalog } = useCatalog();
  const { data: connections, isLoading: loadingConns } = useConnections();
  const { data: tools } = useMcpTools();
  const disconnect = useDisconnectMutation();
  const retry = useRetryConnection();
  const canManage = useWorkspacePermission("integrations", "manage");
  const isAdmin = canManage;
  const oauth = useOAuthPopup();

  const filteredCatalog = (catalog ?? []).filter(e =>
    cat === "all" || e.category === cat || (cat === "custom" && e.key === "custom_mcp")
  );
  const connByKey = new Map((connections ?? []).map(c => [c.catalog_key ?? c.id, c]));

  return (
    <AppLayout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Plug className="h-5 w-5 text-primary" />
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Entegrasyonlar</h1>
            </div>
            <p className="text-[13px] text-muted-foreground max-w-xl">
              MCP tabanlı entegrasyonlar. Hazır listeden seç ya da kendi MCP sunucunu bağla — bağlı araçları Chief of Staff otomatik keşfeder.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              {tools?.length ?? 0} araç hazır
            </Badge>
            <CustomMcpDialog isAdmin={isAdmin} />
          </div>
        </div>

        {/* Connected list */}
        {(connections?.length ?? 0) > 0 && (
          <Card className="p-4">
            <h2 className="text-[13px] font-semibold mb-3 text-foreground">Bağlantılarınız</h2>
            <div className="space-y-2">
              {(connections ?? []).map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center">
                    {c.state === "ready" ? <CheckCircle2 className="h-4 w-4 text-success" />
                      : c.state === "authenticating" ? <Loader2 className="h-4 w-4 animate-spin text-warning" />
                      : <AlertCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">{c.display_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate font-mono">{c.mcp_url}</div>
                    {c.error && <div className="text-[11px] text-destructive mt-0.5">{c.error}</div>}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{c.scope}</Badge>
                  {c.state === "failed" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => retry.mutate(c.id)} title="Tekrar dene">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {c.auth_url && c.state === "authenticating" && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => oauth.open(c.auth_url!)}>
                      Yetkilendirmeyi tamamla
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => disconnect.mutate(c.id)} title="Bağlantıyı kes">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Catalog */}
        <div>
          <Tabs value={cat} onValueChange={setCat}>
            <TabsList className="mb-4 flex-wrap h-auto">
              {CATEGORIES.map(c => <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>)}
            </TabsList>
            <TabsContent value={cat}>
              {loadingCatalog || loadingConns ? (
                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCatalog.map(entry => (
                    <ConnectionCard
                      key={entry.key}
                      entry={entry}
                      connection={connByKey.get(entry.key) as any}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
