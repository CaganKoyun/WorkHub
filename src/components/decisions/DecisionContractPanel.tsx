import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useDecisionOptions, useCreateDecisionOption, useUpdateDecisionOption, useDeleteDecisionOption,
  useDecisionAssumptions, useCreateAssumption, useUpdateAssumption, useDeleteAssumption,
  useDecisionEvents, useAdvanceLifecycle,
} from "@/lib/decision-contract-hooks";
import {
  ASSUMPTION_LABELS, ASSUMPTION_TONE, LIFECYCLE_LABELS, LIFECYCLE_TONE,
  OPERATOR_LABELS, nextStates, type AssumptionOperator, type DecisionLifecycle,
} from "@/lib/decision-contract";
import { FileSignature, Plus, Trash2, Check, ArrowRight, History } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  decisionId: string;
  title: string;
  lifecycleState: DecisionLifecycle;
}

export function DecisionContractPanel({ decisionId, title, lifecycleState }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileSignature className="mr-1.5 h-3.5 w-3.5" /> Karar Sözleşmesi
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {title}
            <Badge className={LIFECYCLE_TONE[lifecycleState]}>
              {LIFECYCLE_LABELS[lifecycleState]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <LifecycleBar decisionId={decisionId} state={lifecycleState} />

        <Tabs defaultValue="assumptions">
          <TabsList className="w-full">
            <TabsTrigger value="assumptions" className="flex-1">Varsayımlar</TabsTrigger>
            <TabsTrigger value="options" className="flex-1">Seçenekler</TabsTrigger>
            <TabsTrigger value="log" className="flex-1">Olay Günlüğü</TabsTrigger>
          </TabsList>
          <TabsContent value="assumptions" className="pt-4">
            <AssumptionsTab decisionId={decisionId} />
          </TabsContent>
          <TabsContent value="options" className="pt-4">
            <OptionsTab decisionId={decisionId} />
          </TabsContent>
          <TabsContent value="log" className="pt-4">
            <EventsTab decisionId={decisionId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ LIFECYCLE ------------------------------- */

function LifecycleBar({ decisionId, state }: { decisionId: string; state: DecisionLifecycle }) {
  const advance = useAdvanceLifecycle();
  const options = nextStates(state);
  if (options.length === 0) {
    return (
      <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        Bu karar döngüsünü tamamladı ve şirket politikasına dönüştü.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 p-3">
      <span className="text-xs text-muted-foreground">Sonraki adım:</span>
      {options.map((s) => (
        <Button
          key={s}
          size="sm"
          variant="secondary"
          disabled={advance.isPending}
          onClick={async () => {
            try {
              await advance.mutateAsync({ id: decisionId, to: s });
              toast.success(`Karar "${LIFECYCLE_LABELS[s]}" aşamasına geçti`);
            } catch (e) {
              toast.error("Geçiş başarısız: " + (e instanceof Error ? e.message : ""));
            }
          }}
        >
          {LIFECYCLE_LABELS[s]} <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      ))}
    </div>
  );
}

/* ----------------------------- ASSUMPTIONS ------------------------------ */

const EMPTY_ASSUMPTION = {
  statement: "",
  metric_key: "",
  operator: ">=" as AssumptionOperator,
  threshold: "",
  current_value: "",
  unit: "",
  source: "",
  is_critical: false,
};

function AssumptionsTab({ decisionId }: { decisionId: string }) {
  const { data: items } = useDecisionAssumptions(decisionId);
  const create = useCreateAssumption();
  const update = useUpdateAssumption();
  const remove = useDeleteAssumption();
  const [form, setForm] = useState(EMPTY_ASSUMPTION);
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    if (form.statement.trim().length < 3) return toast.error("Varsayım ifadesi çok kısa");
    try {
      await create.mutateAsync({
        decision_id: decisionId,
        statement: form.statement.trim(),
        metric_key: form.metric_key.trim() || null,
        operator: form.operator,
        threshold: form.threshold === "" ? null : Number(form.threshold),
        current_value: form.current_value === "" ? null : Number(form.current_value),
        unit: form.unit.trim() || null,
        source: form.source.trim() || null,
        is_critical: form.is_critical,
      });
      setForm(EMPTY_ASSUMPTION);
      setAdding(false);
      toast.success("Varsayım deftere işlendi");
    } catch (e) {
      toast.error("Eklenemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Bu kararın doğru kalması için nelerin doğru kalması gerekiyor? Eşik bozulduğunda
        karar otomatik olarak "kontrol zamanı"na döner.
      </p>

      {(items ?? []).map((a) => (
        <div key={a.id} className="space-y-2 rounded-md border p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{a.statement}</p>
              <p className="text-xs text-muted-foreground">
                {a.metric_key ?? "metrik yok"} · {OPERATOR_LABELS[a.operator as AssumptionOperator] ?? a.operator}{" "}
                {a.threshold ?? "—"} {a.unit ?? ""}
                {a.source && ` · kaynak: ${a.source}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.is_critical && <Badge variant="outline">Kritik</Badge>}
              <Badge className={ASSUMPTION_TONE[a.status]}>{ASSUMPTION_LABELS[a.status]}</Badge>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Güncel değer</Label>
            <Input
              className="h-8 w-36"
              type="number"
              defaultValue={a.current_value ?? ""}
              onBlur={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                if (v === a.current_value) return;
                update.mutate(
                  { id: a.id, current_value: v },
                  {
                    onSuccess: () => toast.success("Varsayım yeniden değerlendirildi"),
                    onError: (err) => toast.error("Güncellenemedi: " + err.message),
                  },
                );
              }}
            />
            {a.last_checked_at && (
              <span className="text-xs text-muted-foreground">
                son kontrol: {format(new Date(a.last_checked_at), "d MMM HH:mm", { locale: tr })}
              </span>
            )}
          </div>
        </div>
      ))}

      {!adding ? (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Varsayım ekle
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <Input
            placeholder="Örn: Q4 ağırlıklı pipeline en az ₺10.000.000 olacak"
            value={form.statement}
            onChange={(e) => setForm({ ...form, statement: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input placeholder="metrik (pipeline)" value={form.metric_key}
              onChange={(e) => setForm({ ...form, metric_key: e.target.value })} />
            <Select value={form.operator}
              onValueChange={(v) => setForm({ ...form, operator: v as AssumptionOperator })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(OPERATOR_LABELS) as AssumptionOperator[]).map((op) => (
                  <SelectItem key={op} value={op}>{op} {OPERATOR_LABELS[op]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="eşik" type="number" value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
            <Input placeholder="güncel" type="number" value={form.current_value}
              onChange={(e) => setForm({ ...form, current_value: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="birim (₺, %, adet)" value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <Input placeholder="kaynak (CRM, Finance)" value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_critical}
                onCheckedChange={(v) => setForm({ ...form, is_critical: v })} />
              <Label className="text-xs">Bozulursa karar yeniden açılır</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Vazgeç</Button>
              <Button size="sm" onClick={submit} disabled={create.isPending}>Ekle</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- OPTIONS ------------------------------- */

const EMPTY_OPTION = { label: "", pros: "", risks: "", cost_amount: "", time_impact: "", expected_return: "" };

function OptionsTab({ decisionId }: { decisionId: string }) {
  const { data: items } = useDecisionOptions(decisionId);
  const create = useCreateDecisionOption();
  const update = useUpdateDecisionOption();
  const remove = useDeleteDecisionOption();
  const [form, setForm] = useState(EMPTY_OPTION);
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    if (form.label.trim().length < 2) return toast.error("Seçenek adı çok kısa");
    try {
      await create.mutateAsync({
        decision_id: decisionId,
        label: form.label.trim(),
        pros: form.pros.trim() || null,
        risks: form.risks.trim() || null,
        cost_amount: form.cost_amount === "" ? null : Number(form.cost_amount),
        time_impact: form.time_impact.trim() || null,
        expected_return: form.expected_return.trim() || null,
        sort_order: (items?.length ?? 0) + 1,
      });
      setForm(EMPTY_OPTION);
      setAdding(false);
    } catch (e) {
      toast.error("Eklenemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Değerlendirilen yollar ve neden elendikleri — kararın kendisi kadar değerli olan kısım.
      </p>
      {(items ?? []).map((o) => (
        <div key={o.id} className={`space-y-1 rounded-md border p-3 ${o.is_chosen ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{o.label}</p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant={o.is_chosen ? "secondary" : "ghost"}
                onClick={() => update.mutate({ id: o.id, is_chosen: !o.is_chosen })}>
                <Check className="mr-1 h-3.5 w-3.5" /> {o.is_chosen ? "Seçilen" : "Seç"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(o.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {o.pros && <p className="text-xs text-muted-foreground">Artılar: {o.pros}</p>}
          {o.risks && <p className="text-xs text-muted-foreground">Riskler: {o.risks}</p>}
          <p className="text-xs text-muted-foreground">
            {o.cost_amount != null && `Maliyet: ${o.cost_amount.toLocaleString("tr-TR")} · `}
            {o.time_impact && `Zaman: ${o.time_impact} · `}
            {o.expected_return && `Beklenen getiri: ${o.expected_return}`}
          </p>
          {!o.is_chosen && (
            <Textarea
              className="mt-1 text-xs"
              rows={1}
              placeholder="Neden elendi?"
              defaultValue={o.rejection_reason ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (o.rejection_reason ?? "")) {
                  update.mutate({ id: o.id, rejection_reason: e.target.value || null });
                }
              }}
            />
          )}
        </div>
      ))}

      {!adding ? (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Seçenek ekle
        </Button>
      ) : (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <Input placeholder="Seçenek (örn: 2 kişi işe al + dış kaynak)" value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Textarea rows={2} placeholder="Artılar" value={form.pros}
              onChange={(e) => setForm({ ...form, pros: e.target.value })} />
            <Textarea rows={2} placeholder="Riskler" value={form.risks}
              onChange={(e) => setForm({ ...form, risks: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" placeholder="Maliyet" value={form.cost_amount}
              onChange={(e) => setForm({ ...form, cost_amount: e.target.value })} />
            <Input placeholder="Zaman etkisi" value={form.time_impact}
              onChange={(e) => setForm({ ...form, time_impact: e.target.value })} />
            <Input placeholder="Beklenen getiri" value={form.expected_return}
              onChange={(e) => setForm({ ...form, expected_return: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Vazgeç</Button>
            <Button size="sm" onClick={submit} disabled={create.isPending}>Ekle</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- EVENTS -------------------------------- */

function EventsTab({ decisionId }: { decisionId: string }) {
  const { data: events } = useDecisionEvents(decisionId);
  if (!events?.length) {
    return <p className="text-sm text-muted-foreground">Henüz olay yok.</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3 text-sm">
          <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p>
              {e.event_type === "assumption_breached"
                ? `Varsayım bozuldu — ${e.note}`
                : e.from_state
                  ? `${LIFECYCLE_LABELS[e.from_state as DecisionLifecycle] ?? e.from_state} → ${LIFECYCLE_LABELS[e.to_state as DecisionLifecycle] ?? e.to_state}`
                  : `Kayıt oluşturuldu (${LIFECYCLE_LABELS[e.to_state as DecisionLifecycle] ?? e.to_state})`}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(e.created_at), "d MMM yyyy HH:mm", { locale: tr })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
