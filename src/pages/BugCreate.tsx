import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import type { Enums } from "@/integrations/supabase/types";
import { useCreateBug } from "@/lib/bugs-hooks";
import { useAllProfiles } from "@/lib/projects-hooks";
import { useProjects } from "@/lib/projects-hooks";

export default function BugCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createBug = useCreateBug();
  const { data: allProfiles } = useAllProfiles();
  const { data: projects } = useProjects();

  const [form, setForm] = useState({
    title: "", description: "", steps_to_reproduce: "",
    expected_behavior: "", actual_behavior: "",
    severity: "medium" as Enums<"bug_severity">, environment: "",
    assignee_id: "__none__", project_id: "__none__",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = {
      title: form.title.trim(), description: form.description.trim(),
      steps_to_reproduce: form.steps_to_reproduce.trim(),
      expected_behavior: form.expected_behavior.trim(),
      actual_behavior: form.actual_behavior.trim(),
      severity: form.severity, environment: form.environment.trim(),
      assignee_id: form.assignee_id === "__none__" ? undefined : form.assignee_id,
      project_id: form.project_id === "__none__" ? undefined : form.project_id,
    };
    if (!trimmed.title || !trimmed.description) {
      toast.error("Başlık ve açıklama zorunludur");
      return;
    }
    if (trimmed.title.length < 3) {
      toast.error("Başlık en az 3 karakter olmalı");
      return;
    }
    try {
      const data = await createBug.mutateAsync(trimmed);
      toast.success(`Hata bildirildi! Takip ID: ${data.tracking_id}`);
      navigate("/bugs");
    } catch (error: any) {
      toast.error("Hata oluşturulamadı: " + error.message);
    }
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 md:px-6 h-11 border-b border-border shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-7 w-7">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <h1 className="text-[13px] font-medium">Hata Bildir</h1>
        </div>

        <div className="flex-1 overflow-auto">
          <form onSubmit={handleSubmit} className="max-w-2xl">
            <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
              <Label className="text-[12px] text-muted-foreground">Başlık *</Label>
              <Input
                placeholder="Hatanın kısa özeti"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                required maxLength={200}
                className="h-8 text-[13px] border-none shadow-none px-0 focus-visible:ring-0 font-medium text-base"
              />
            </div>

            <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
              <Label className="text-[12px] text-muted-foreground">Açıklama *</Label>
              <Textarea
                placeholder="Sorunun detaylı açıklaması"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                required rows={4} maxLength={5000}
                className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
              />
            </div>

            <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
              <Label className="text-[12px] text-muted-foreground">Tekrar Adımları</Label>
              <Textarea
                placeholder={"1. Şuraya git...\n2. Şuna tıkla...\n3. Gözlemle..."}
                value={form.steps_to_reproduce}
                onChange={(e) => update("steps_to_reproduce", e.target.value)}
                rows={3} maxLength={5000}
                className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="px-4 md:px-6 py-4 border-b border-border md:border-r space-y-1">
                <Label className="text-[12px] text-muted-foreground">Beklenen Davranış</Label>
                <Textarea
                  placeholder="Ne olması gerekiyordu?"
                  value={form.expected_behavior}
                  onChange={(e) => update("expected_behavior", e.target.value)}
                  rows={2} maxLength={2000}
                  className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
                />
              </div>
              <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
                <Label className="text-[12px] text-muted-foreground">Gerçekleşen Davranış</Label>
                <Textarea
                  placeholder="Bunun yerine ne oldu?"
                  value={form.actual_behavior}
                  onChange={(e) => update("actual_behavior", e.target.value)}
                  rows={2} maxLength={2000}
                  className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="px-4 md:px-6 py-4 border-b border-border md:border-r space-y-1">
                <Label className="text-[12px] text-muted-foreground">Ciddiyet *</Label>
                <Select value={form.severity} onValueChange={(v) => update("severity", v)}>
                  <SelectTrigger className="h-8 text-[13px] border-none shadow-none px-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.bug_severity.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
                <Label className="text-[12px] text-muted-foreground">Ortam</Label>
                <Input
                  placeholder="örn. Chrome 120, macOS 14"
                  value={form.environment}
                  onChange={(e) => update("environment", e.target.value)}
                  maxLength={200}
                  className="h-8 text-[13px] border-none shadow-none px-0 focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="px-4 md:px-6 py-4 border-b border-border md:border-r space-y-1">
                <Label className="text-[12px] text-muted-foreground">Atanan Kişi</Label>
                <Select value={form.assignee_id} onValueChange={(v) => update("assignee_id", v)}>
                  <SelectTrigger className="h-8 text-[13px]">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <SelectValue placeholder="Atanmamış" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Atanmamış</SelectItem>
                    {(allProfiles ?? []).map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name ?? 'Kullanıcı'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
                <Label className="text-[12px] text-muted-foreground">Proje</Label>
                <Select value={form.project_id} onValueChange={(v) => update("project_id", v)}>
                  <SelectTrigger className="h-8 text-[13px]">
                    <SelectValue placeholder="Proje seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Proje yok</SelectItem>
                    {(projects ?? []).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="px-4 md:px-6 py-4 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)} size="sm" className="h-8 text-[13px]">
                İptal
              </Button>
              <Button type="submit" disabled={createBug.isPending} size="sm" className="h-8 text-[13px]">
                {createBug.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Hata Bildir
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
