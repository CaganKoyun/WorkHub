import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Copy, Loader2 } from "lucide-react";
import { SignalRulesPanel } from "@/components/SignalRulesPanel";
import { PublicDashboardManager } from "@/components/PublicDashboardManager";
import { ReferralPanel } from "@/components/ReferralPanel";

const ROLES = ["manager","member","viewer","guest"] as const;
const ROLE_LABELS: Record<string, string> = { manager: "Yönetici", member: "Üye", viewer: "İzleyici", guest: "Misafir" };
const MODULES = ["work","crm","finance","people","assets","goals","risks","decisions","approvals","analytics","admin","ai"];
const MODULE_LABELS: Record<string, string> = { work: "İş", crm: "CRM", finance: "Finans", people: "Kişiler", assets: "Varlıklar", goals: "Hedefler", risks: "Riskler", decisions: "Kararlar", approvals: "Onaylar", analytics: "Analitik", admin: "Yönetim", ai: "Yapay Zekâ" };
const ACTIONS = ["view","create","update","delete"];
const ACTION_LABELS: Record<string, string> = { view: "Görüntüle", create: "Oluştur", update: "Güncelle", delete: "Sil" };

export default function WorkspaceSettings() {
  const { currentWorkspace, role, refresh } = useWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [perms, setPerms] = useState<any[]>([]);
  const [name, setName] = useState(currentWorkspace?.name ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [busy, setBusy] = useState(false);

  const canAdmin = role === "owner" || role === "admin";

  const load = async () => {
    if (!currentWorkspace) return;
    const [m, inv, p] = await Promise.all([
      supabase.from("workspace_members")
        .select("id,user_id,role,department,job_title,is_active,joined_at,profiles:user_id(full_name,avatar_url)")
        .eq("workspace_id", currentWorkspace.id),
      supabase.from("workspace_invitations")
        .select("*").eq("workspace_id", currentWorkspace.id).order("created_at", { ascending: false }),
      supabase.from("workspace_permissions")
        .select("*").eq("workspace_id", currentWorkspace.id),
    ]);
    setMembers(m.data ?? []); setInvites(inv.data ?? []); setPerms(p.data ?? []);
    setName(currentWorkspace.name);
  };

  useEffect(() => { load(); }, [currentWorkspace?.id]);

  const sendInvite = async () => {
    if (!currentWorkspace || !user || !inviteEmail.includes("@")) return;
    setBusy(true);
    const { error } = await supabase.from("workspace_invitations").insert({
      workspace_id: currentWorkspace.id, email: inviteEmail.trim().toLowerCase(),
      role: inviteRole as any, invited_by: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setInviteEmail(""); toast.success("Davet oluşturuldu"); load();
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase.from("workspace_invitations").update({ status: "revoked" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Davet iptal edildi"); load();
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url); toast.success("Davet linki kopyalandı");
  };

  const updateMemberRole = async (id: string, newRole: string) => {
    const { error } = await supabase.from("workspace_members").update({ role: newRole as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rol güncellendi"); load();
  };

  // F3 onay limitleri: boş = limitsiz değil, "tutarlı onay yetkisi yok" demek
  const updateMemberLimit = async (id: string, raw: string) => {
    const limit = raw.trim() === "" ? null : Number(raw);
    if (limit !== null && (!Number.isFinite(limit) || limit < 0)) {
      return toast.error("Geçersiz limit");
    }
    const { error } = await supabase
      .from("workspace_members").update({ approval_limit: limit }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(limit === null ? "Onay limiti kaldırıldı" : "Onay limiti güncellendi");
    load();
  };

  const removeMember = async (id: string) => {
    if (!confirm("Bu üyeyi çalışma alanından çıkarmak istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("workspace_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Üye çıkarıldı"); load();
  };

  const togglePerm = async (r: string, module: string, action: string, allowed: boolean) => {
    if (!currentWorkspace) return;
    const existing = perms.find(p => p.role === r && p.module === module && p.action === action);
    let error;
    if (existing) {
      ({ error } = await supabase.from("workspace_permissions").update({ allowed }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("workspace_permissions").insert({
        workspace_id: currentWorkspace.id, role: r as any, module, action, allowed,
      }));
    }
    if (error) return toast.error(error.message);
    load();
  };

  const permAllowed = (r: string, module: string, action: string) => {
    const p = perms.find(x => x.role === r && x.module === module && x.action === action);
    return !!p?.allowed;
  };

  const saveName = async () => {
    if (!currentWorkspace) return;
    const { error } = await supabase.from("workspaces").update({ name }).eq("id", currentWorkspace.id);
    if (error) return toast.error(error.message);
    toast.success("Kaydedildi"); refresh();
  };

  if (!currentWorkspace) return null;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Çalışma Alanı Ayarları</h1>
          <p className="text-sm text-muted-foreground">Şirket, üyeler, davetler ve izinleri yönetin.</p>
        </div>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Genel</TabsTrigger>
            <TabsTrigger value="members">Üyeler</TabsTrigger>
            <TabsTrigger value="invitations">Davetler</TabsTrigger>
            <TabsTrigger value="permissions">İzinler</TabsTrigger>
            <TabsTrigger value="signals">Sinyaller</TabsTrigger>
            <TabsTrigger value="dashboards">Herkese Açık Panolar</TabsTrigger>
            <TabsTrigger value="referrals">Davet Et Kazan</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4">
            <Card className="p-6 space-y-4 max-w-xl">
              <div><Label>Çalışma alanı adı</Label><Input value={name} onChange={e=>setName(e.target.value)} disabled={!canAdmin} /></div>
              <div><Label>Plan</Label><div className="text-sm mt-1"><Badge variant="secondary">{currentWorkspace.plan}</Badge></div></div>
              <div><Label>Varsayılan para birimi</Label><div className="text-sm mt-1">{currentWorkspace.default_currency}</div></div>
              {canAdmin && <Button onClick={saveName}>Değişiklikleri kaydet</Button>}
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <Card className="divide-y">
              {members.map(m => (
                <div key={m.id} className="p-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                    {m.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.profiles?.full_name ?? "Bilinmeyen"}</div>
                    <div className="text-xs text-muted-foreground">{m.job_title ?? m.department ?? ""}</div>
                  </div>
                  {canAdmin && m.role !== "owner" && !["owner","admin"].includes(m.role) && (
                    <div className="flex items-center gap-1" title="Onay limiti: bu tutara kadar tutarlı onayları karara bağlayabilir. Boş = tutarlı onay yetkisi yok.">
                      <Input
                        type="number" min={0} placeholder="Onay limiti"
                        defaultValue={m.approval_limit ?? ""}
                        onBlur={(e)=>{ if (String(m.approval_limit ?? "") !== e.target.value) updateMemberLimit(m.id, e.target.value); }}
                        className="h-8 w-28 text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground">{m.approval_currency ?? "USD"}</span>
                    </div>
                  )}
                  {canAdmin && m.role !== "owner" ? (
                    <select value={m.role} onChange={e=>updateMemberRole(m.id, e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                      <option value="admin">Admin</option><option value="manager">Yönetici</option>
                      <option value="member">Üye</option><option value="viewer">İzleyici</option><option value="guest">Misafir</option>
                    </select>
                  ) : (<Badge>{m.role}</Badge>)}
                  {canAdmin && m.user_id !== user?.id && m.role !== "owner" && (
                    <Button variant="ghost" size="icon" onClick={()=>removeMember(m.id)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="mt-4 space-y-4">
            {canAdmin && (
              <Card className="p-4 flex gap-2">
                <Input placeholder="email@company.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
                <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="admin">Admin</option><option value="manager">Yönetici</option>
                  <option value="member">Üye</option><option value="viewer">İzleyici</option>
                </select>
                <Button onClick={sendInvite} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Davet Et
                </Button>
              </Card>
            )}
            <Card className="divide-y">
              {invites.length === 0 && <div className="p-4 text-sm text-muted-foreground">Henüz davet yok.</div>}
              {invites.map(i => (
                <div key={i.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{i.email}</div>
                    <div className="text-xs text-muted-foreground">Rol: {i.role} · Durum: {i.status}</div>
                  </div>
                  <Button variant="ghost" size="icon" title="Davet linkini kopyala" onClick={()=>copyInviteLink(i.token)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  {canAdmin && i.status === "pending" && (
                    <Button variant="ghost" size="icon" onClick={()=>revokeInvite(i.id)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            <Card className="p-4 overflow-x-auto">
              <div className="text-xs text-muted-foreground mb-3">
                Owner ve admin rolleri tam erişime sahiptir ve burada kısıtlanamaz. Diğer rollerin modül bazında neler yapabileceğini ayarlayın.
              </div>
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Modül</th>
                    {ROLES.flatMap(r => ACTIONS.map(a => (
                      <th key={r+a} className="text-center p-2 whitespace-nowrap">
                        <div className="font-medium">{ROLE_LABELS[r] ?? r}</div>
                        <div className="text-muted-foreground">{ACTION_LABELS[a] ?? a}</div>
                      </th>
                    )))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(m => (
                    <tr key={m} className="border-b">
                      <td className="p-2 font-medium">{MODULE_LABELS[m] ?? m}</td>
                      {ROLES.flatMap(r => ACTIONS.map(a => (
                        <td key={r+a+m} className="text-center p-2">
                          <Checkbox
                            checked={permAllowed(r, m, a)}
                            disabled={!canAdmin}
                            onCheckedChange={(v)=>togglePerm(r, m, a, !!v)}
                          />
                        </td>
                      )))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="signals" className="mt-4">
            <SignalRulesPanel canManage={canAdmin} />
          </TabsContent>

          <TabsContent value="dashboards" className="mt-4">
            {canAdmin ? (
              <PublicDashboardManager />
            ) : (
              <p className="text-sm text-muted-foreground py-4">Herkese açık pano yönetimi için admin yetkisi gerekli.</p>
            )}
          </TabsContent>

          <TabsContent value="referrals" className="mt-4">
            <ReferralPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
