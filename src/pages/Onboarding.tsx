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
import { Building2, Users, Sparkles, LayoutGrid, ArrowRight, Check, Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";

const MODULES = [
  { key: "work", label: "Work Management", desc: "Projects, tasks, bugs" },
  { key: "crm", label: "CRM & Revenue", desc: "Pipeline, quotes, contracts" },
  { key: "finance", label: "Finance", desc: "Cash, budgets, runway" },
  { key: "people", label: "People & HR", desc: "Employees, roles" },
  { key: "goals", label: "Goals & Risks", desc: "OKRs and governance" },
  { key: "assets", label: "Assets & Ops", desc: "Inventory & procurement" },
];

const STEPS = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "Modules", icon: LayoutGrid },
  { id: 3, label: "Invite team", icon: Users },
  { id: 4, label: "Sample data", icon: Sparkles },
];

export default function Onboarding() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const forceNew = params.get("new") === "1";
  const { user } = useAuth();
  const { currentWorkspace, onboarding, workspaces, createWorkspace, refresh } = useWorkspace();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("1-10");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [wsId, setWsId] = useState<string | null>(null);

  // Step 2
  const [modules, setModules] = useState<string[]>(["work","crm","finance","people","goals"]);

  // Step 3
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([{ email: "", role: "member" }]);

  // Step 4
  const [seed, setSeed] = useState(true);
  // Karar tohumu (PRD Görev 6): opsiyonel, boşsa hiçbir kayıt oluşmaz
  const [seedDecision, setSeedDecision] = useState("");

  useEffect(() => {
    if (!forceNew && currentWorkspace && onboarding && !onboarding.finished_at) {
      setWsId(currentWorkspace.id);
      setName(currentWorkspace.name);
      setModules(onboarding.enabled_modules ?? modules);
      if (onboarding.company_setup_done) setStep(prev => Math.max(prev, 2));
      if (onboarding.modules_selected_done) setStep(prev => Math.max(prev, 3));
      if (onboarding.team_invited_done) setStep(prev => Math.max(prev, 4));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, onboarding?.workspace_id]);

  const submitStep1 = async () => {
    if (!name.trim()) return toast.error("Company name is required");
    setSaving(true);
    try {
      const id = await createWorkspace({ name: name.trim(), industry, size, country, currency });
      setWsId(id);
      await supabase.from("workspace_onboarding")
        .update({ company_setup_done: true }).eq("workspace_id", id);
      setStep(2);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create workspace");
    } finally { setSaving(false); }
  };

  const submitStep2 = async () => {
    if (!wsId) return;
    setSaving(true);
    try {
      await supabase.from("workspace_onboarding")
        .update({ enabled_modules: modules, modules_selected_done: true })
        .eq("workspace_id", wsId);
      setStep(3);
      await refresh();
    } finally { setSaving(false); }
  };

  const submitStep3 = async () => {
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
        toast.success(`${valid.length} invitation${valid.length > 1 ? "s" : ""} sent`);
      }
      await supabase.from("workspace_onboarding")
        .update({ team_invited_done: true }).eq("workspace_id", wsId);
      setStep(4);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Invite failed");
    } finally { setSaving(false); }
  };

  const submitStep4 = async () => {
    if (!wsId) return;
    setSaving(true);
    try {
      if (seed) {
        // Seed a starter project + a sample goal so the app isn't empty.
        const { data: proj } = await supabase.from("projects").insert({
          name: "Getting Started",
          description: "Your first project — feel free to rename or delete.",
          status: "active", priority: "medium",
          workspace_id: wsId, owner_id: user!.id, created_by: user!.id,
        }).select().single();
        if (proj) {
          await supabase.from("tasks").insert([
            { title: "Invite your team", project_id: proj.id, workspace_id: wsId, reporter_id: user!.id, status: "todo", priority: "high", position: 1, tags: [] },
            { title: "Add your first CRM company", project_id: proj.id, workspace_id: wsId, reporter_id: user!.id, status: "todo", priority: "medium", position: 2, tags: [] },
            { title: "Record opening cash balance", project_id: proj.id, workspace_id: wsId, reporter_id: user!.id, status: "todo", priority: "medium", position: 3, tags: [] },
          ]);
        }
        await supabase.from("goals").insert({
          title: "Reach product-market fit",
          description: "Sample goal — replace with your quarterly objective.",
          status: "on_track", period: "quarterly", progress: 15,
          workspace_id: wsId, owner_id: user!.id, created_by: user!.id,
        });
      }
      // Karar tohumu (PRD Görev 6): dolu girildiyse proposed karar oluştur
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
      toast.success("Workspace ready 🎉");
      nav(decisionSeeded ? "/decisions" : "/home");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to finish onboarding");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 grid place-items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">4 quick steps to get your company running on FounderOS.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex-1 flex items-center">
                <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs shrink-0
                  ${done ? "bg-primary text-primary-foreground border-primary" :
                    active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="ml-2 text-xs font-medium hidden sm:block">{s.label}</div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${done ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <Card className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div><Label>Company name *</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Acme Inc." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Industry</Label><Input value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="SaaS" /></div>
                <div>
                  <Label>Team size</Label>
                  <select value={size} onChange={e=>setSize(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>1-10</option><option>11-50</option><option>51-200</option><option>201+</option>
                  </select>
                </div>
                <div><Label>Country</Label><Input value={country} onChange={e=>setCountry(e.target.value)} placeholder="Turkey" /></div>
                <div>
                  <Label>Default currency</Label>
                  <select value={currency} onChange={e=>setCurrency(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>USD</option><option>EUR</option><option>TRY</option><option>GBP</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={submitStep1} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Pick the modules you want to enable. You can always add more later.</p>
              <div className="grid grid-cols-2 gap-3">
                {MODULES.map(m => {
                  const on = modules.includes(m.key);
                  return (
                    <button key={m.key} type="button"
                      onClick={()=>setModules(on ? modules.filter(x=>x!==m.key) : [...modules,m.key])}
                      className={`text-left border rounded-lg p-3 transition-colors ${on ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}>
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
                <Button variant="ghost" onClick={()=>setStep(1)}>Back</Button>
                <Button onClick={submitStep2} disabled={saving}>Continue <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Invite teammates by email. They'll get a link to join.</p>
              <div className="space-y-2">
                {invites.map((inv, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="teammate@company.com" value={inv.email}
                      onChange={e=>setInvites(invites.map((x,idx)=>idx===i?{...x,email:e.target.value}:x))} />
                    <select value={inv.role}
                      onChange={e=>setInvites(invites.map((x,idx)=>idx===i?{...x,role:e.target.value}:x))}
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm">
                      <option value="admin">Admin</option><option value="manager">Manager</option>
                      <option value="member">Member</option><option value="viewer">Viewer</option>
                    </select>
                    <Button variant="ghost" size="icon" onClick={()=>setInvites(invites.filter((_,idx)=>idx!==i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={()=>setInvites([...invites,{email:"",role:"member"}])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add another
                </Button>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={()=>setStep(2)}>Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={()=>{ setInvites([]); submitStep3(); }}>Skip</Button>
                  <Button onClick={submitStep3} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send &amp; continue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Start with a small sample of records so the app isn't empty.</p>
              <div className="flex items-center gap-2 border rounded-lg p-3">
                <Checkbox checked={seed} onCheckedChange={(v)=>setSeed(!!v)} id="seed" />
                <Label htmlFor="seed" className="cursor-pointer">
                  Create a starter project with 3 sample tasks and one goal
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
                  Boş bırakabilirsin. Yazarsan karar defterine taslak olarak düşer ve seni oraya götürürüz.
                </p>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={()=>setStep(3)}>Back</Button>
                <Button onClick={submitStep4} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Finish setup
                </Button>
              </div>
            </div>
          )}
        </Card>

        {workspaces.length > 0 && step === 1 && !forceNew && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            You already belong to {workspaces.length} workspace{workspaces.length>1?"s":""}. <button className="underline" onClick={()=>nav("/home")}>Skip and go to app →</button>
          </div>
        )}
      </div>
    </div>
  );
}
