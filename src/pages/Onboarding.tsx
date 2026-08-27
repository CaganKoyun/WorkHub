import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Building2, Users, Sparkles, LayoutGrid, ArrowRight, Check, Loader2,
  X, Plus, Upload, FileText, Rocket, Palette, ShoppingCart, Briefcase, Settings2,
} from "lucide-react";
import { SparkLogo } from "@/components/SparkLogo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseCsv } from "@/lib/csv";

const MODULES = [
  { key: "work", label: "İş Yönetimi", desc: "Projeler, görevler, hatalar" },
  { key: "crm", label: "CRM & Gelir", desc: "Pipeline, teklifler, sözleşmeler" },
  { key: "finance", label: "Finans", desc: "Kasa, bütçeler, pist" },
  { key: "people", label: "İnsan & İK", desc: "Çalışanlar, roller" },
  { key: "goals", label: "Hedefler & Riskler", desc: "OKR'ler ve yönetişim" },
  { key: "assets", label: "Varlıklar & Operasyon", desc: "Envanter & tedarik" },
];

interface WorkspaceTemplate {
  key: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  modules: string[];
  industry: string;
  seedProject: string;
  seedTasks: string[];
  seedGoal: string;
}

const TEMPLATES: WorkspaceTemplate[] = [
  {
    key: "saas",
    label: "SaaS Startup",
    desc: "Ürün geliştirme, müşteri takibi, pist yönetimi",
    icon: Rocket,
    modules: ["work", "crm", "finance", "goals"],
    industry: "SaaS",
    seedProject: "Ürün Lansmanı",
    seedTasks: ["Sorun takip iş akışını kur", "Fiyatlandırma katmanlarını belirle", "İşe alım akışını oluştur"],
    seedGoal: "MVP'yi lansmanla ve ilk 100 kullanıcıyı edin",
  },
  {
    key: "agency",
    label: "Ajans / Stüdyo",
    desc: "Müşteri projeleri, ekip iş yükü, zaman takibi",
    icon: Palette,
    modules: ["work", "crm", "people", "assets"],
    industry: "Agency",
    seedProject: "Müşteri İşe Başlatma Şablonu",
    seedTasks: ["Müşteri brifing şablonu oluştur", "Proje kilometre taşlarını belirle", "Zaman takibini yapılandır"],
    seedGoal: "Bu çeyrekte 3 müşteri projesini zamanında teslim et",
  },
  {
    key: "ecommerce",
    label: "E-ticaret",
    desc: "Envanter, siparişler, finans, müşteri pipeline'ı",
    icon: ShoppingCart,
    modules: ["work", "crm", "finance", "assets"],
    industry: "E-commerce",
    seedProject: "Mağaza Operasyonları",
    seedTasks: ["Ürün kataloğunu kur", "Sipariş iş akışını yapılandır", "Tedarikçi sözleşmelerini takip et"],
    seedGoal: "Aylık 50.000$ gelire ulaş",
  },
  {
    key: "consulting",
    label: "Danışmanlık / Hizmetler",
    desc: "Anlaşmalar, insanlar, hedefler, bilgi bankası",
    icon: Briefcase,
    modules: ["work", "crm", "people", "goals"],
    industry: "Consulting",
    seedProject: "Anlaşma Pipeline'ı",
    seedTasks: ["Teklif şablonu oluştur", "Müşteri portalini kur", "Hizmet tekliflerini tanımla"],
    seedGoal: "Bu çeyrekte 5 yeni anlaşma kapat",
  },
  {
    key: "custom",
    label: "Özel Kurulum",
    desc: "Kendi modüllerini seç ve her şeyi yapılandır",
    icon: Settings2,
    modules: ["work", "crm", "finance", "people", "goals"],
    industry: "",
    seedProject: "Başlangıç",
    seedTasks: ["Ekibinizi davet edin", "İlk CRM şirketinizi ekleyin", "Açılış kasa bakiyesini kaydedin"],
    seedGoal: "Ürün-pazar uyumuna ulaşın",
  },
];

const STEPS = [
  { id: 0, label: "Hoş Geldiniz",  icon: Sparkles },
  { id: 1, label: "Şablon", icon: Rocket },
  { id: 2, label: "Şirket",  icon: Building2 },
  { id: 3, label: "Modüller",  icon: LayoutGrid },
  { id: 4, label: "Davet",   icon: Users },
  { id: 5, label: "Hazır",    icon: Check },
];

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const forceNew = params.get("new") === "1";
  const { user } = useAuth();
  const { currentWorkspace, onboarding, workspaces, createWorkspace, refresh } = useWorkspace();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Template
  const [template, setTemplate] = useState<WorkspaceTemplate | null>(null);

  // Step 2 — Company
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("1-10");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [wsId, setWsId] = useState<string | null>(null);

  // Step 3 — Modules
  const [modules, setModules] = useState<string[]>(["work", "crm", "finance", "people", "goals"]);

  // Step 4 — Invite
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([{ email: "", role: "member" }]);
  const [csvFileName, setCsvFileName] = useState<string>("");

  // Step 5 — Ready
  const [seed, setSeed] = useState(true);
  const [seedDecision, setSeedDecision] = useState("");

  const normalizeInviteRole = (raw: string): string => {
    const t = raw.trim().toLowerCase();
    if (!t) return "member";
    if (t.startsWith("owner")) return "owner";
    if (t.startsWith("admin")) return "admin";
    if (t.startsWith("manager") || t.startsWith("lead")) return "manager";
    if (t.startsWith("viewer") || t.startsWith("guest") || t === "read") return "viewer";
    return "member";
  };

  const handleTeamCsv = async (file: File) => {
    setCsvFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const emailCol = parsed.headers.findIndex(h => /email|e-?mail|address/i.test(h));
      if (emailCol === -1) {
        toast.error("CSV'de 'email' başlığı bulunamadı");
        return;
      }
      const roleCol = parsed.headers.findIndex(h => /role|rol|permission|access/i.test(h));
      const activeCol = parsed.headers.findIndex(h => /^(active|status|state|enabled)$/i.test(h));
      const isBotEmail = (e: string) =>
        /@linear\.linear\.app$/i.test(e) ||
        /^(no-?reply|noreply|integration|bot|system)@/i.test(e);

      const rows = parsed.rows
        .map(r => {
          const email = (r[emailCol] ?? "").trim().toLowerCase();
          const active = activeCol >= 0 ? (r[activeCol] ?? "").trim().toLowerCase() : "";
          return {
            email,
            role: roleCol >= 0 ? normalizeInviteRole(r[roleCol] ?? "") : "member",
            active,
          };
        })
        .filter(r => r.email.includes("@") && !isBotEmail(r.email))
        .filter(r => !r.active || /^(active|enabled|true|1|yes)$/i.test(r.active))
        .map(({ email, role }) => ({ email, role }));

      if (rows.length === 0) {
        toast.error("Geçerli / aktif email bulunamadı");
        return;
      }
      setInvites(rows);
      toast.success(`${rows.length} kişi yüklendi`);
    } catch (e: any) {
      toast.error(e.message ?? "CSV okunamadı");
    }
  };

  useEffect(() => {
    if (!forceNew && currentWorkspace && onboarding && !onboarding.finished_at) {
      setWsId(currentWorkspace.id);
      setName(currentWorkspace.name);
      setModules(onboarding.enabled_modules ?? modules);
      if (onboarding.company_setup_done) setStep(prev => Math.max(prev, 3));
      if (onboarding.modules_selected_done) setStep(prev => Math.max(prev, 4));
      if (onboarding.team_invited_done) setStep(prev => Math.max(prev, 5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, onboarding?.workspace_id]);

  const selectTemplate = (t: WorkspaceTemplate) => {
    setTemplate(t);
    setModules(t.modules);
    if (t.industry) setIndustry(t.industry);
    if (t.key === "custom") {
      setStep(2);
    } else {
      setStep(2);
    }
  };

  const submitStep2 = async () => {
    if (!name.trim()) return toast.error("Şirket adı zorunludur");
    setSaving(true);
    try {
      const id = await createWorkspace({ name: name.trim(), industry, size, country, currency });
      setWsId(id);
      await supabase.from("workspace_onboarding")
        .update({ company_setup_done: true }).eq("workspace_id", id);
      setStep(3);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Workspace olusturulamadi");
    } finally { setSaving(false); }
  };

  const submitStep3 = async () => {
    if (!wsId) return;
    setSaving(true);
    try {
      await supabase.from("workspace_onboarding")
        .update({ enabled_modules: modules, modules_selected_done: true })
        .eq("workspace_id", wsId);
      setStep(4);
      await refresh();
    } finally { setSaving(false); }
  };

  const submitStep4 = async () => {
    if (!wsId || !user) return;
    setSaving(true);
    try {
      const valid = invites.filter(i => i.email.includes("@"));
      if (valid.length > 0) {
        const rows = valid.map(i => ({
          workspace_id: wsId, email: i.email.trim().toLowerCase(),
          role: i.role as any, invited_by: user.id,
        }));
        const { error } = await supabase.from("workspace_invitations").insert(rows);
        if (error) throw error;
        toast.success(`${valid.length} davetiye gönderildi`);
      }
      await supabase.from("workspace_onboarding")
        .update({ team_invited_done: true }).eq("workspace_id", wsId);
      setStep(5);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Davet gonderilemedi");
    } finally { setSaving(false); }
  };

  const submitStep5 = async () => {
    if (!wsId) return;
    setSaving(true);
    try {
      const tpl = template ?? TEMPLATES[4];
      if (seed) {
        const { data: proj } = await supabase.from("projects").insert({
          name: tpl.seedProject,
          description: `Sablon: ${tpl.label} — dilediginiz gibi yeniden adlandirin veya silin.`,
          status: "active", priority: "medium",
          workspace_id: wsId, owner_id: user!.id, created_by: user!.id,
        }).select().single();
        if (proj) {
          await supabase.from("tasks").insert(
            tpl.seedTasks.map((title, i) => ({
              title, project_id: proj.id, workspace_id: wsId,
              reporter_id: user!.id, status: "todo" as const,
              priority: i === 0 ? "high" as const : "medium" as const,
              position: i + 1, tags: [],
            })),
          );
        }
        await supabase.from("goals").insert({
          title: tpl.seedGoal,
          description: "Ornek hedef — ceyreklik hedefinizle degistirin.",
          status: "on_track", period: "quarterly", progress: 15,
          workspace_id: wsId, owner_id: user!.id, created_by: user!.id,
        });
      }
      let decisionSeeded = false;
      if (seedDecision.trim()) {
        const { error: decErr } = await supabase.from("decisions").insert({
          title: seedDecision.trim(),
          status: "proposed",
          workspace_id: wsId,
          created_by: user!.id,
        });
        decisionSeeded = !decErr;
      }
      await supabase.from("workspace_onboarding")
        .update({ sample_data_seeded: seed, finished_at: new Date().toISOString() })
        .eq("workspace_id", wsId);
      await refresh();
      toast.success("Workspace hazır!");
      nav(decisionSeeded ? "/decisions" : "/home");
    } catch (e: any) {
      toast.error(e.message ?? "Kurulum tamamlanamadı");
    } finally { setSaving(false); }
  };

  const current = STEPS.find(s => s.id === step) ?? STEPS[0];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-lg flex-1 flex flex-col items-center justify-center">
        {step === 0 ? (
          <div className="text-center space-y-6">
            <div className="mx-auto text-foreground">
              <SparkLogo size={28} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Spark WorkHub'a Hoş Geldiniz</h1>
              <p className="text-[13.5px] text-muted-foreground">
                Bir işletim sistemi: task, karar, müşteri ve nakit tek yerde.
                5 dakika içinde workspace'in hazır.
              </p>
            </div>
            <Button size="lg" onClick={() => setStep(1)} className="min-w-[200px]">
              Başla <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
            {workspaces.length > 0 && !forceNew && (
              <button
                type="button"
                onClick={() => nav("/home")}
                className="text-[11.5px] text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Zaten {workspaces.length} workspace'in var, uygulamaya git
              </button>
            )}
          </div>
        ) : (
          <div className="w-full space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex h-8 items-center rounded-full border border-border/70 bg-secondary/40 px-3 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                <current.icon className="h-3 w-3 mr-1.5" />
                Adım {step} / {TOTAL_STEPS} · {current.label}
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight">
                {step === 1 && "Nasıl bir iş yapıyorsun?"}
                {step === 2 && "Şirketini tanıt"}
                {step === 3 && "Modüllerini seç"}
                {step === 4 && "Ekibini davet et"}
                {step === 5 && "Son bir dokunuş"}
              </h1>
              <p className="text-[13px] text-muted-foreground">
                {step === 1 && "Bir şablon seç — modülleri ve örnek veriyi sana göre hazırlayalım."}
                {step === 2 && "Bu bilgiler workspace'in kimliği olur."}
                {step === 3 && "İhtiyacın olmayanlar arayüzü kalabalıklaştırmaz."}
                {step === 4 && "Şimdi ekle veya sonra Teams sayfasından davet gönder."}
                {step === 5 && "Boş bir workspace'e giriş yapmayın diye örnek veri açayım mı?"}
              </p>
            </div>

            <div className="space-y-5">
              {step === 1 && (
                <div className="space-y-3">
                  {TEMPLATES.map(t => {
                    const Icon = t.icon;
                    const selected = template?.key === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => selectTemplate(t)}
                        className={cn(
                          "w-full text-left border rounded-lg p-4 transition-all",
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border hover:border-primary/40 hover:bg-secondary/30",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                            selected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{t.label}</span>
                              {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {t.modules.map(m => (
                                <span key={m} className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {MODULES.find(mod => mod.key === m)?.label ?? m}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div><Label>Şirket adı *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Örnek A.Ş." /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Sektör</Label><Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="SaaS" /></div>
                    <div>
                      <Label>Ekip büyüklüğü</Label>
                      <select value={size} onChange={e => setSize(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                        <option>1-10</option><option>11-50</option><option>51-200</option><option>201+</option>
                      </select>
                    </div>
                    <div><Label>Ülke</Label><Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Türkiye" /></div>
                    <div>
                      <Label>Varsayılan para birimi</Label>
                      <select value={currency} onChange={e => setCurrency(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                        <option>USD</option><option>EUR</option><option>TRY</option><option>GBP</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(1)}>Geri</Button>
                    <Button onClick={submitStep2} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Devam <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {template && template.key !== "custom"
                      ? `${template.label} şablonu için önerildi. İstersen değiştir.`
                      : "Etkinleştirmek istediğiniz modülleri seçin. Daha sonra istediğiniz zaman ekleyebilirsiniz."}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {MODULES.map(m => {
                      const on = modules.includes(m.key);
                      return (
                        <button key={m.key} type="button"
                          onClick={() => setModules(on ? modules.filter(x => x !== m.key) : [...modules, m.key])}
                          className={cn(
                            "text-left border rounded-lg p-3 transition-colors",
                            on ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50",
                          )}>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{m.label}</div>
                            {on && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(2)}>Geri</Button>
                    <Button onClick={submitStep3} disabled={saving}>Devam <ArrowRight className="h-4 w-4 ml-1" /></Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Tek tek gir ya da tüm ekibi CSV ile yükle (email + role sütunları).</p>

                  <label
                    htmlFor="team-csv"
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 bg-secondary/20 px-3 py-2.5 text-[12.5px] transition-colors hover:border-primary/50"
                  >
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      {csvFileName ? <FileText className="h-3.5 w-3.5 text-primary" /> : <Upload className="h-3.5 w-3.5" />}
                      {csvFileName || "CSV yükle (email, role başlıklı)"}
                    </span>
                    {csvFileName && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-medium text-primary">
                        {invites.length} kisi
                      </span>
                    )}
                  </label>
                  <input
                    id="team-csv"
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) void handleTeamCsv(f);
                      e.target.value = "";
                    }}
                  />

                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                    {invites.map((inv, i) => (
                      <div key={i} className="flex gap-2">
                        <Input placeholder="teammate@company.com" value={inv.email}
                          onChange={e => setInvites(invites.map((x, idx) => idx === i ? { ...x, email: e.target.value } : x))} />
                        <select value={inv.role}
                          onChange={e => setInvites(invites.map((x, idx) => idx === i ? { ...x, role: e.target.value } : x))}
                          className="h-10 rounded-md border border-input bg-background px-2 text-sm">
                          <option value="admin">Yönetici</option><option value="manager">Müdür</option>
                          <option value="member">Üye</option><option value="viewer">İzleyici</option>
                        </select>
                        <Button variant="ghost" size="icon" onClick={() => setInvites(invites.filter((_, idx) => idx !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setInvites([...invites, { email: "", role: "member" }])}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Bir tane daha ekle
                    </Button>
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(3)}>Geri</Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setInvites([]); submitStep4(); }}>Atla</Button>
                      <Button onClick={submitStep4} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Gönder ve devam et
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  {template && template.key !== "custom" && (
                    <Card className="border-primary/30 bg-primary/5 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <template.icon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{template.label}</span>
                        <span className="text-muted-foreground">şablonu uygulanacak</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Proje: {template.seedProject} · Hedef: {template.seedGoal}
                      </p>
                    </Card>
                  )}
                  <div className="flex items-center gap-2 border rounded-lg p-3">
                    <Checkbox checked={seed} onCheckedChange={(v) => setSeed(!!v)} id="seed" />
                    <Label htmlFor="seed" className="cursor-pointer">
                      {template && template.key !== "custom"
                        ? `${template.label} örnek verisi oluştur`
                        : "Örnek görevler ve hedefle bir başlangıç projesi oluştur"}
                    </Label>
                  </div>
                  <div className="space-y-1.5 border rounded-lg p-3">
                    <Label htmlFor="seed-decision">
                      Şu an vermeye çalıştığın en büyük karar ne? <span className="text-muted-foreground font-normal">(opsiyonel)</span>
                    </Label>
                    <Input
                      id="seed-decision"
                      value={seedDecision}
                      onChange={(e) => setSeedDecision(e.target.value)}
                      placeholder="Örn: ABD pazarına şimdi mi girmeliyiz?"
                    />
                    <p className="text-xs text-muted-foreground">
                      Boş bırakabilirsin. Yazarsan karar defterine taslak olarak düşer.
                    </p>
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(4)}>Geri</Button>
                    <Button onClick={submitStep5} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kurulumu tamamla
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {step > 0 && (
        <div className="mt-8 flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <span
              key={n}
              className={cn(
                "h-1.5 rounded-full transition-all",
                n === step ? "w-6 bg-primary" : n < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
