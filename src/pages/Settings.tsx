import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User, Building2, Users, Bell, Settings as SettingsIcon,
  Mail, Trash2, Shield, Send, AlertTriangle, Loader2, Camera
} from "lucide-react";

// ─── Profile Tab ────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Gecersiz dosya turu: Lutfen JPG, PNG, WebP veya GIF yukleyin.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      toast.error("Dosya cok buyuk: Avatar 5 MB altinda olmali.");
      return;
    }

    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif"];
    const fileExt = (file.name.split(".").pop() || "").toLowerCase();
    if (!allowedExts.includes(fileExt)) {
      toast.error("Gecersiz dosya uzantisi: Lutfen JPG, PNG, WebP veya GIF yukleyin.");
      return;
    }

    setUploadingAvatar(true);
    const filePath = `${user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error("Yukleme basarisiz: " + uploadError.message); setUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
    setUploadingAvatar(false);
    if (updateError) toast.error(updateError.message);
    else { toast.success("Avatar guncellendi"); await refreshProfile(); }
  };

  useEffect(() => {
    if (profile) { setFullName(profile.full_name || ""); setJobTitle(profile.job_title || ""); }
  }, [profile]);

  const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, job_title: jobTitle }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Profil guncellendi"); await refreshProfile(); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error("Sifre en az 6 karakter olmali."); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast.error(error.message);
    else { toast.success("Sifre guncellendi"); setNewPassword(""); }
  };

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Profil Bilgileri</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative group">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ""} className="object-contain" />
              <AvatarFallback className="text-[12px]">{initials || "?"}</AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Camera className="h-3.5 w-3.5 text-white" />}
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
          </div>
          <div>
            <p className="text-[13px] font-medium">{fullName || "İsimsiz"}</p>
            <p className="text-[12px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
          <div className="space-y-1">
            <Label className="text-[12px]">Ad Soyad</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmet Yılmaz" className="h-8 text-[13px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Unvan</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Yazılım Mühendisi" className="h-8 text-[13px]" />
          </div>
        </div>
        <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="h-7 text-[12px] mt-3">
          {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Kaydet
        </Button>
      </div>

      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Sifre Degistir</p>
        <div className="max-w-xs space-y-1">
          <Label className="text-[12px]">Yeni Sifre</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="h-8 text-[13px]" />
        </div>
        <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" size="sm" className="h-7 text-[12px] mt-3">
          {changingPassword && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Sifreyi Guncelle
        </Button>
      </div>
    </div>
  );
}

// ─── Company Tab ────────────────────────────────────────────────────────────────

function CompanyTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company_name: "", company_website: "", industry: "", company_size: "", address: "", phone: "" });
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("company_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data, error }) => {
      if (error) { toast.error("Sirket ayarlari yuklenemedi: " + error.message); }
      else if (data) { setForm({ company_name: data.company_name || "", company_website: data.company_website || "", industry: data.industry || "", company_size: data.company_size || "", address: data.address || "", phone: data.phone || "" }); setExistingId(data.id); }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (existingId) {
      const { error } = await supabase.from("company_settings").update(form).eq("id", existingId);
      if (error) toast.error(error.message); else toast.success("Sirket ayarlari kaydedildi");
    } else {
      const { data, error } = await supabase.from("company_settings").insert({ ...form, user_id: user.id }).select().single();
      if (error) toast.error(error.message); else { setExistingId(data.id); toast.success("Sirket ayarlari olusturuldu"); }
    }
    setSaving(false);
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="px-4 md:px-6 py-4">
      <p className="text-[12px] text-muted-foreground font-medium mb-3">Sirket Bilgileri</p>
      <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
        <div className="space-y-1"><Label className="text-[12px]">Sirket Adi</Label><Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Örnek A.Ş." className="h-8 text-[13px]" /></div>
        <div className="space-y-1"><Label className="text-[12px]">Web Sitesi</Label><Input value={form.company_website} onChange={(e) => update("company_website", e.target.value)} placeholder="https://acme.com" className="h-8 text-[13px]" /></div>
        <div className="space-y-1"><Label className="text-[12px]">Sektor</Label>
          <Select value={form.industry} onValueChange={(v) => update("industry", v)}><SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder="Secin" /></SelectTrigger><SelectContent>{[{v:"technology",l:"Teknoloji"},{v:"healthcare",l:"Sağlık"},{v:"finance",l:"Finans"},{v:"education",l:"Eğitim"},{v:"retail",l:"Perakende"},{v:"manufacturing",l:"Üretim"},{v:"other",l:"Diğer"}].map(i => <SelectItem key={i.v} value={i.v}>{i.l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-[12px]">Sirket Buyuklugu</Label>
          <Select value={form.company_size} onValueChange={(v) => update("company_size", v)}><SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder="Secin" /></SelectTrigger><SelectContent>{["1-10","11-50","51-200","201-500","501-1000","1000+"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1 sm:col-span-2"><Label className="text-[12px]">Adres</Label><Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Örnek Mah. No: 1" className="h-8 text-[13px]" /></div>
        <div className="space-y-1"><Label className="text-[12px]">Telefon</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+90 (5XX) 000 0000" className="h-8 text-[13px]" /></div>
      </div>
      <Button onClick={handleSave} disabled={saving} size="sm" className="h-7 text-[12px] mt-3">
        {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Kaydet
      </Button>
    </div>
  );
}

// ─── Team Tab ───────────────────────────────────────────────────────────────────

function TeamTab() {
  const { user } = useAuth();
  const { currentWorkspace: workspace } = useWorkspace();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    if (!workspace) { setLoading(false); return; }
    const [teamRes, invitationsRes] = await Promise.all([
      supabase.from("workspace_members")
        .select("id,user_id,role,is_active,profiles:user_id(full_name,avatar_url,job_title)")
        .eq("workspace_id", workspace.id),
      supabase.from("workspace_invitations").select("*").eq("status", "pending"),
    ]);
    if (teamRes.error) toast.error("Takim yuklenemedi: " + teamRes.error.message);
    if (invitationsRes.error) toast.error("Davetiyeler yuklenemedi: " + invitationsRes.error.message);
    const mapped = (teamRes.data || []).map((m: any) => ({
      ...m,
      full_name: m.profiles?.full_name ?? null,
      avatar_url: m.profiles?.avatar_url ?? null,
      job_title: m.profiles?.job_title ?? null,
    }));
    setMembers(mapped);
    setInvitations(invitationsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleInvite = async () => {
    if (!user || !inviteEmail) return;
    setSending(true);
    if (!workspace) return;
    const { error } = await supabase.from("workspace_invitations").insert({ workspace_id: workspace.id, email: inviteEmail, role: inviteRole as any, invited_by: user.id });
    setSending(false);
    if (error) toast.error(error.message);
    else { toast.success(`${inviteEmail} davet edildi`); setInviteEmail(""); fetchData(); }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("workspace_invitations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Davet iptal edildi"); fetchData(); }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!workspace) return;
    const { error } = await supabase.from("workspace_members").update({ role: newRole as never }).eq("id", memberId);
    if (error) toast.error(error.message);
    else { toast.success("Rol güncellendi"); fetchData(); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Bu üyeyi çalışma alanından çıkarmak istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
    if (error) toast.error(error.message);
    else { toast.success("Üye çıkarıldı"); fetchData(); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Takim Uyesi Davet Et</p>
        <div className="flex gap-2 max-w-lg">
          <Input placeholder="ekip.arkadasi@sirket.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="h-8 text-[13px] flex-1" />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-[100px] h-8 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="member">Uye</SelectItem><SelectItem value="manager">Yonetici</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={sending || !inviteEmail} size="sm" className="h-8 text-[12px] gap-1">
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Davet Et
          </Button>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="px-4 md:px-6 py-4">
          <p className="text-[12px] text-muted-foreground font-medium mb-3">Bekleyen Davetler</p>
          <div className="space-y-1">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[13px]">{inv.email}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">{inv.role}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRevoke(inv.id)} className="h-6 w-6 p-0">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Takim Uyeleri · {members.length}</p>
        <div className="space-y-1">
          {members.map((m: any) => {
            const isSelf = m.user_id === user?.id;
            const initials = (m.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div key={m.user_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={m.avatar_url || ""} />
                    <AvatarFallback className="text-2xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-[13px] font-medium">{m.full_name || "İsimsiz"}</span>
                  <span className="text-[12px] text-muted-foreground">{m.job_title || ""}</span>
                  {isSelf && <Badge variant="secondary" className="text-[10px] h-4 px-1">Sen</Badge>}
                </div>
                <div className="flex items-center gap-1.5">
                  {isSelf ? (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5">
                      <Shield className="h-2.5 w-2.5" />{m.role}
                    </Badge>
                  ) : (
                    <>
                      <Select value={m.role} onValueChange={v => handleRoleChange(m.id, v)}>
                        <SelectTrigger className="w-[100px] h-6 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Shield className="h-2.5 w-2.5" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Üye</SelectItem>
                          <SelectItem value="manager">Yönetici</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Sahip</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.id)} className="h-6 w-6 p-0 text-destructive opacity-60 hover:opacity-100">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Email Tab ──────────────────────────────────────────────────────────────────

function EmailTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({ email_on_new_bug: true, email_on_assignment: true, email_on_status_change: true, email_on_comment: true, email_on_sla_breach: true, daily_digest: false, review_reminder: true });
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data, error }) => {
      if (error) { toast.error("Tercihler yuklenemedi: " + error.message); }
      else if (data) { setPrefs({ email_on_new_bug: data.email_on_new_bug, email_on_assignment: data.email_on_assignment, email_on_status_change: data.email_on_status_change, email_on_comment: data.email_on_comment, email_on_sla_breach: data.email_on_sla_breach, daily_digest: data.daily_digest, review_reminder: data.review_reminder ?? true }); setExistingId(data.id); }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (existingId) {
      const { error } = await supabase.from("notification_preferences").update(prefs).eq("id", existingId);
      if (error) toast.error(error.message); else toast.success("Tercihler kaydedildi");
    } else {
      const { data, error } = await supabase.from("notification_preferences").insert({ ...prefs, user_id: user.id }).select().single();
      if (error) toast.error(error.message); else { setExistingId(data.id); toast.success("Tercihler kaydedildi"); }
    }
    setSaving(false);
  };

  const togglePref = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const items = [
    { key: "email_on_new_bug" as const, label: "Yeni Hata Bildirimi" },
    { key: "email_on_assignment" as const, label: "Size Atanan Hatalar" },
    { key: "email_on_status_change" as const, label: "Durum Degisiklikleri" },
    { key: "email_on_comment" as const, label: "Yeni Yorumlar" },
    { key: "email_on_sla_breach" as const, label: "SLA Ihlal Uyarisi" },
    { key: "daily_digest" as const, label: "Gunluk Ozet" },
    { key: "review_reminder" as const, label: "Karar Inceleme Hatirlatmasi" },
  ];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-3 flex items-start gap-2 bg-muted/30">
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[12px] text-muted-foreground">E-posta teslimi henuz baglandi. Tercihler, e-posta saglayicisi yapilandirildiginda etkin olacaktir.</p>
      </div>
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">E-posta Bildirimleri</p>
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.key} className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30">
              <span className="text-[13px]">{item.label}</span>
              <Switch checked={prefs[item.key]} onCheckedChange={() => togglePref(item.key)} className="scale-90" />
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="h-7 text-[12px] mt-3">
          {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Tercihleri Kaydet
        </Button>
      </div>
    </div>
  );
}

// ─── General Tab ────────────────────────────────────────────────────────────────

function GeneralTab() {
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof window !== "undefined") return document.documentElement.classList.contains("dark") ? "dark" : "light";
    return "dark";
  });

  const toggleTheme = (value: string) => {
    setThemeState(value);
    if (value === "dark") { document.documentElement.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { document.documentElement.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  };

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Gorunum</p>
        <div className="flex items-center justify-between max-w-lg">
          <span className="text-[13px]">Tema</span>
          <Select value={theme} onValueChange={toggleTheme}>
            <SelectTrigger className="w-[100px] h-7 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="light">Acik</SelectItem><SelectItem value="dark">Koyu</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-destructive font-medium mb-3">Tehlikeli Bolge</p>
        <div className="flex items-center justify-between max-w-lg border border-destructive/20 rounded-md p-3">
          <div>
            <p className="text-[13px] font-medium">Hesabi Sil</p>
            <p className="text-[12px] text-muted-foreground">Hesabinizi ve tum verilerinizi kalici olarak silin.</p>
          </div>
          <Button variant="destructive" size="sm" disabled className="h-7 text-[12px]">Yakinda</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ─────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="px-4 md:px-6 h-11 border-b border-border flex items-center shrink-0">
          <h1 className="text-[13px] font-medium">Ayarlar</h1>
        </div>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="profile" className="flex flex-col md:flex-row h-full">
            <div className="md:w-44 shrink-0 border-b md:border-b-0 md:border-r border-border">
              <TabsList className="flex md:flex-col items-stretch w-full bg-transparent h-auto p-1.5 gap-px">
                <TabsTrigger value="profile" className="justify-start gap-1.5 text-[12px] h-7 px-2 data-[state=active]:bg-muted w-full">
                  <User className="h-3.5 w-3.5" /> Profil
                </TabsTrigger>
                <TabsTrigger value="company" className="justify-start gap-1.5 text-[12px] h-7 px-2 data-[state=active]:bg-muted w-full">
                  <Building2 className="h-3.5 w-3.5" /> Sirket
                </TabsTrigger>
                <TabsTrigger value="team" className="justify-start gap-1.5 text-[12px] h-7 px-2 data-[state=active]:bg-muted w-full">
                  <Users className="h-3.5 w-3.5" /> Takim
                </TabsTrigger>
                <TabsTrigger value="email" className="justify-start gap-1.5 text-[12px] h-7 px-2 data-[state=active]:bg-muted w-full">
                  <Bell className="h-3.5 w-3.5" /> Bildirimler
                </TabsTrigger>
                <TabsTrigger value="general" className="justify-start gap-1.5 text-[12px] h-7 px-2 data-[state=active]:bg-muted w-full">
                  <SettingsIcon className="h-3.5 w-3.5" /> Genel
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-w-0">
              <TabsContent value="profile" className="m-0"><ProfileTab /></TabsContent>
              <TabsContent value="company" className="m-0"><CompanyTab /></TabsContent>
              <TabsContent value="team" className="m-0"><TeamTab /></TabsContent>
              <TabsContent value="email" className="m-0"><EmailTab /></TabsContent>
              <TabsContent value="general" className="m-0"><GeneralTab /></TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
