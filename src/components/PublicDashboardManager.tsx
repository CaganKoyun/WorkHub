import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicDashboard {
  id: string;
  title: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

// Table not yet in generated types — cast through `any` for runtime access
const db = () => supabase.from("public_dashboards" as any);

export function PublicDashboardManager() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("Company Dashboard");

  const { data: dashboards, isLoading } = useQuery({
    queryKey: ["public-dashboards", currentWorkspace?.id],
    enabled: !!currentWorkspace,
    queryFn: async () => {
      const { data, error } = await db()
        .select("id,title,token,is_active,expires_at,created_at")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PublicDashboard[];
    },
  });

  const createMut = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await db().insert({
        workspace_id: currentWorkspace!.id,
        title,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["public-dashboards"] });
      toast.success("Dashboard linki olusturuldu");
      setNewTitle("Company Dashboard");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await db()
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-dashboards"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["public-dashboards"] });
      toast.success("Dashboard linki silindi");
    },
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/pub/${token}`;
    void navigator.clipboard.writeText(url);
    toast.success("Link kopyalandi");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label>Dashboard baslik</Label>
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Company Dashboard" />
        </div>
        <Button onClick={() => createMut.mutate(newTitle)} disabled={createMut.isPending || !newTitle.trim()}>
          {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Olustur
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Yukleniyor...</p>}

      {dashboards && dashboards.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">Henuz paylasilan dashboard yok. Yukardaki butonla olusturabilirsin.</p>
      )}

      <div className="space-y-3">
        {(dashboards ?? []).map(d => (
          <Card key={d.id} className={cn(!d.is_active && "opacity-60")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <Badge variant="outline" className={cn("text-[10px]", d.is_active ? "text-success" : "text-muted-foreground")}>
                      {d.is_active ? "Aktif" : "Devre disi"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                    /pub/{d.token.slice(0, 12)}...
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={d.is_active}
                    onCheckedChange={active => toggleMut.mutate({ id: d.id, active })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => copyLink(d.token)} title="Linki kopyala">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="Onizle">
                    <a href={`/pub/${d.token}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(d.id)} title="Sil">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
