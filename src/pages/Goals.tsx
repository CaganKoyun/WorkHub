import { useState } from "react";
import { DomainWorkspace } from "@/components/DomainWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useGoals, useCreateGoal } from "@/lib/graph-hooks";
import {
  GOAL_STATUS_LABELS, type GoalStatus, type GoalPeriod,
} from "@/lib/graph-types";
import { Plus, Target } from "lucide-react";
import { toast } from "sonner";

const STATUS_TONE: Record<GoalStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  on_track: "bg-emerald-500/20 text-emerald-300",
  at_risk: "bg-amber-500/20 text-amber-300",
  off_track: "bg-destructive/20 text-destructive-foreground",
  achieved: "bg-emerald-500/30 text-emerald-200",
  missed: "bg-destructive/30 text-destructive-foreground",
  archived: "bg-muted text-muted-foreground",
};

export default function Goals() {
  const { data: goals, isLoading } = useGoals();
  const create = useCreateGoal();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", status: "on_track" as GoalStatus,
    period: "quarterly" as GoalPeriod, progress: 0,
  });

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık gerekli");
    try {
      await create.mutateAsync(form);
      toast.success("Hedef oluşturuldu");
      setOpen(false);
      setForm({ title: "", description: "", status: "on_track", period: "quarterly", progress: 0 });
    } catch (e) {
      toast.error("Oluşturulamadı: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <DomainWorkspace
      domain="goals"
      title="Hedefler"
      subtitle="Şirket, ekip ve bireysel OKR'ları tek yerden takip edin."
      headerActions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Yeni Hedef</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Hedef</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as GoalStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(GOAL_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dönem</Label>
                  <Select value={form.period} onValueChange={v => setForm({ ...form, period: v as GoalPeriod })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Aylık</SelectItem>
                      <SelectItem value="quarterly">Çeyreklik</SelectItem>
                      <SelectItem value="yearly">Yıllık</SelectItem>
                      <SelectItem value="custom">Özel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>İlerleme (%)</Label>
                <Input type="number" min={0} max={100} value={form.progress}
                  onChange={e => setForm({ ...form, progress: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button onClick={submit} disabled={create.isPending}>Oluştur</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : !goals?.length ? (
          <Card><CardContent className="p-10 text-center space-y-3">
            <Target className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="text-lg font-medium">Henüz hedef yok</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Şirket hedeflerini tanımlayın ve projeler, kararlar, ekipler ile ilişkilendirerek Company Graph üzerinden takip edin.
            </p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />İlk hedefi oluştur</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(g => (
              <Card key={g.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{g.title}</div>
                      {g.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{g.description}</p>}
                    </div>
                    <Badge className={STATUS_TONE[g.status]}>{GOAL_STATUS_LABELS[g.status]}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{g.period}</span><span>{g.progress}%</span>
                    </div>
                    <Progress value={g.progress} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </DomainWorkspace>
  );
}
