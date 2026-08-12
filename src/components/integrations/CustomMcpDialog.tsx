import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plug, Loader2 } from "lucide-react";
import { useConnectMutation } from "@/lib/integrations-hooks";
import { toast } from "sonner";
import { useOAuthPopup } from "@/lib/use-oauth-popup";

export function CustomMcpDialog({ isAdmin, trigger }: { isAdmin: boolean; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [transport, setTransport] = useState<"http" | "sse">("http");
  const [scope, setScope] = useState<"workspace" | "personal">("personal");
  const [bearer, setBearer] = useState("");
  const connect = useConnectMutation();
  const oauth = useOAuthPopup();

  const submit = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error("Missing fields: Name and URL required.");
      return;
    }
    try {
      const res: any = await connect.mutateAsync({
        catalog_key: "custom_mcp",
        display_name: name.trim(),
        mcp_url: url.trim(),
        transport,
        scope,
        bearer_token: bearer || undefined,
      });
      setOpen(false);
      setName(""); setUrl(""); setBearer("");
      if (res?.probe?.ok) {
        toast.success(`Custom MCP connected -- ${res.probe.tools?.length ?? 0} tools discovered.`);
      } else if (res?.probe?.authUrl) {
        oauth.open(res.probe.authUrl);
        toast("Sign in required -- Complete OAuth in the popup -- the list will refresh automatically.");
      } else {
        toast.error("Probe failed: " + (res?.probe?.error || "Server unreachable"));
      }
    } catch (e: any) {
      toast.error("Connect failed: " + e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Plug className="h-4 w-4" /> Add custom MCP
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Custom MCP server</DialogTitle>
          <DialogDescription>
            Herhangi bir Model Context Protocol sunucusunu bağla. URL'yi girdiğinde araçları otomatik keşfederiz.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="My internal MCP" />
          </div>
          <div className="space-y-1.5">
            <Label>Server URL</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://mcp.example.com/mcp" />
          </div>
          <div className="space-y-1.5">
            <Label>Transport</Label>
            <RadioGroup value={transport} onValueChange={(v) => setTransport(v as any)} className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="http" /><span className="text-[13px]">Streamable HTTP</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="sse" /><span className="text-[13px]">SSE</span>
              </label>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label>Scope</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as any)} className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="personal" /><span className="text-[13px]">Personal</span>
              </label>
              <label className={`flex items-center gap-2 ${isAdmin ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}>
                <RadioGroupItem value="workspace" disabled={!isAdmin} />
                <span className="text-[13px]">Workspace{!isAdmin && " · admin only"}</span>
              </label>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label>Bearer token <span className="text-muted-foreground text-[11px]">(optional)</span></Label>
            <Input type="password" value={bearer} onChange={e => setBearer(e.target.value)} placeholder="Static token, if required" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={connect.isPending}>
            {connect.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Test & save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
