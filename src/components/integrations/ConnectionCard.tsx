import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Link as LinkIcon, Trash2, ExternalLink, User, Building2 } from "lucide-react";
import type { CatalogEntry, WorkspaceConnection } from "@/lib/integrations-types";
import { useConnectMutation, useDisconnectMutation, useRetryConnection } from "@/lib/integrations-hooks";
import { useOAuthPopup } from "@/lib/use-oauth-popup";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Props = {
  entry: CatalogEntry;
  connection?: WorkspaceConnection;
  isAdmin: boolean;
};

export function ConnectionCard({ entry, connection, isAdmin }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"workspace" | "personal">("personal");
  const [bearer, setBearer] = useState("");
  const [mcpUrl, setMcpUrl] = useState(entry.mcp_url || "");

  const connect = useConnectMutation();
  const disconnect = useDisconnectMutation();
  const retry = useRetryConnection();
  const oauth = useOAuthPopup();

  const isConnected = !!connection;
  const stateBadge = connection && (
    connection.state === "ready" ? (
      <Badge variant="outline" className="border-success/40 text-success gap-1"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>
    ) : connection.state === "authenticating" ? (
      <Badge variant="outline" className="border-warning/40 text-warning gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Auth pending</Badge>
    ) : (
      <Badge variant="outline" className="border-destructive/40 text-destructive gap-1"><AlertCircle className="h-3 w-3" /> Failed</Badge>
    )
  );

  const handleConnect = async () => {
    if (!mcpUrl) {
      toast({ title: "MCP URL missing", description: "This integration doesn't publish an MCP URL yet. Use Custom MCP to add it manually.", variant: "destructive" });
      return;
    }
    try {
      const res: any = await connect.mutateAsync({
        catalog_key: entry.key,
        display_name: entry.name,
        mcp_url: mcpUrl,
        transport: mcpUrl.includes("/sse") ? "sse" : "http",
        scope,
        bearer_token: bearer || undefined,
      });
      setOpen(false);
      if (res?.probe?.ok) {
        toast({ title: `${entry.name} connected`, description: `${res.probe.tools?.length ?? 0} tools available.` });
      } else if (res?.probe?.authUrl) {
        toast({ title: "Sign in required", description: "Complete OAuth in the popup — this window will refresh automatically." });
        oauth.open(res.probe.authUrl);
      } else {
        toast({ title: "Connection failed", description: res?.probe?.error || "Unknown error", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Connect failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Card className="p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-xl shrink-0">
            {entry.icon || "🔌"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[13px] font-semibold text-foreground truncate">{entry.name}</h3>
              {entry.featured && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Featured</Badge>}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{entry.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="flex items-center gap-1.5">
            {stateBadge}
            {connection?.scope === "personal" && (
              <Badge variant="outline" className="gap-1 text-[10px]"><User className="h-2.5 w-2.5" /> Personal</Badge>
            )}
            {connection?.scope === "workspace" && (
              <Badge variant="outline" className="gap-1 text-[10px]"><Building2 className="h-2.5 w-2.5" /> Workspace</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {entry.docs_url && (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a href={entry.docs_url} target="_blank" rel="noreferrer" title="Docs"><ExternalLink className="h-3.5 w-3.5" /></a>
              </Button>
            )}
            {isConnected ? (
              <>
                {connection?.state === "failed" && (
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => retry.mutate(connection.id)}>
                    Retry
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => disconnect.mutate(connection!.id)} title="Disconnect">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => setOpen(true)}>
                <LinkIcon className="h-3 w-3" /> Connect
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {entry.name}</DialogTitle>
            <DialogDescription>
              MCP bağlantısı kur. Sağlayıcı OAuth istiyorsa auth URL açılır; bearer token varsa aşağıya yapıştır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>MCP URL</Label>
              <Input value={mcpUrl} onChange={e => setMcpUrl(e.target.value)} placeholder="https://mcp.example.com/mcp" />
            </div>
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as any)} className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="personal" />
                  <span className="text-[13px]">Personal (only me)</span>
                </label>
                <label className={`flex items-center gap-2 ${isAdmin ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}>
                  <RadioGroupItem value="workspace" disabled={!isAdmin} />
                  <span className="text-[13px]">Workspace (everyone){!isAdmin && " · admin only"}</span>
                </label>
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label>Bearer token <span className="text-muted-foreground text-[11px]">(optional)</span></Label>
              <Input type="password" value={bearer} onChange={e => setBearer(e.target.value)} placeholder="If provider requires a static token" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={connect.isPending}>
              {connect.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
