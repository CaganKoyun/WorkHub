import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvite() {
  const { token } = useParams();
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refresh } = useWorkspace();
  const [invite, setInvite] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    supabase.from("workspace_invitations")
      .select("*, workspaces:workspace_id(name, slug)")
      .eq("token", token).maybeSingle()
      .then(({ data }) => { setInvite(data); setLoading(false); });
  }, [token]);

  const accept = async () => {
    if (!user) { nav(`/auth?next=/invite/${token}`); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("accept_workspace_invitation", { _token: token! });
      if (error) throw error;
      await refresh();
      toast.success("Welcome to the team!");
      nav("/home");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (loading || authLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!invite) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Invitation not found or expired.</div>;

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <Card className="p-6 max-w-md w-full space-y-4">
        <div>
          <div className="text-xs text-muted-foreground">You've been invited to join</div>
          <h1 className="text-xl font-semibold mt-1">{invite.workspaces?.name}</h1>
          <div className="text-xs text-muted-foreground mt-1">as <span className="font-medium capitalize">{invite.role}</span></div>
        </div>
        {invite.status !== "pending" ? (
          <div className="text-sm text-muted-foreground">This invitation is no longer valid ({invite.status}).</div>
        ) : (
          <Button className="w-full" onClick={accept} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {user ? "Accept invitation" : "Sign in to accept"}
          </Button>
        )}
      </Card>
    </div>
  );
}
