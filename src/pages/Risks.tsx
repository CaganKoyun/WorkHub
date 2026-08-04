import { useState, useMemo } from "react";
import { DomainWorkspace } from "@/components/DomainWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useRisks, useCreateRisk } from "@/lib/graph-hooks";
import {
  RISK_LEVEL_LABELS, RISK_LEVEL_COLORS,
  type RiskLevel, type RiskStatus,
} from "@/lib/graph-types";
import { Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<RiskStatus, string> = {
  open: "Açık", mitigating: "Azaltılıyor", accepted: "Kabul", closed: "Kapalı",
};

export default function Risks() {
  const { data: risks, isLoading } = useRisks();
  const create = useCreateRisk();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", mitigation: "",
    status: "open" as RiskStatus, level: "medium" as RiskLevel,
    likelihood: 3, impact: 3,
  });

  const stats = useMemo(() => {
    const r = risks ?? [];
    return {
      total: r.length,
      critical: r.filter(x => x.level === "critical").length,
      high: r.filter(x => x.level === "high").length,
      open: r.filter(x => x.status === "open" || x.status === "mitigating").length,
    };
  }, [risks]);

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Başlık gerekli");
    try {
      await create.mutateAsync(form);
      toast.success("Risk kaydı oluşturuldu");
      setOpen(false);
      setForm({ title: "", description: "", mitigation: "", status: "open", level: "medium", likelihood: 3, impact: 3 });
    } catch (e) {
      toast.error("Oluşturulamadı: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <DomainWorkspace domain="risks" title="Risk Merkezi" subtitle="Şirket riskleri, olasılık × etki, sahiplik ve azaltma planları.">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Risk Merkezi</h1>
            <p className="text-sm text-muted-foreground">Yürütme, finans, ürün ve müşteri risklerini tek yerden yönetin.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Yeni Risk</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Risk</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Seviye</Label>
                    <Select value={form.level} onValueChange={v => setForm({ ...form, level: v as RiskLevel })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Durum</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as RiskStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Olasılık (1-5)</Label>
                    <Input type="number" min={1} max={5} value={form.likelihood}
                      onChange={e => setForm({ ...form, likelihood: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Etki (1-5)</Label>
                    <Input type="number" min={1} max={5} value={form.impact}
                      onChange={e => setForm({ ...form, impact: Number(e.target.value) })} />
                  </div>
                </div>
                <div><Label>Azaltma Planı</Label><Textarea value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button onClick={submit} disabled={create.isPending}>Oluştur</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Toplam", value: stats.total },
            { label: "Açık", value: stats.open },
            { label: "Yüksek", value: stats.high },
            { label: "Kritik", value: stats.critical },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold font-mono">{s.value}</div>
            </CardContent></Card>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : !risks?.length ? (
          <Card><CardContent className="p-10 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="text-lg font-medium">Kayıtlı risk yok</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Riskleri kaydedip projeler ve müşterilerle ilişkilendirerek Founder Inbox'ta erken uyarılar oluşturun.
            </p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />İlk riski kaydet</Button>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk</TableHead>
                  <TableHead>Seviye</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Skor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.title}</div>
                      {r.description && <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>}
                    </TableCell>
                    <TableCell><Badge className={RISK_LEVEL_COLORS[r.level]}>{RISK_LEVEL_LABELS[r.level]}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{STATUS_LABELS[r.status]}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{r.likelihood * r.impact}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}
      </div>
    </DomainWorkspace>
  );
}
