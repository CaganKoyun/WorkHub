import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useApprovals, useCreateApproval, useDecideApproval,
  useDelegateApproval, useWorkspaceMembers, type ApprovalFilter,
} from "@/lib/graph-hooks";
import {
  APPROVAL_KIND_LABELS, APPROVAL_PRIORITY_COLORS,
  type Approval, type ApprovalKind, type ApprovalPriority, type ApprovalStatus,
} from "@/lib/graph-types";
import {
  SNOOZE_LABELS, computeSnoozeUntil, canDecideApproval, type SnoozeOption,
} from "@/lib/approval-utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  CheckCircle2, XCircle, Clock, Plus, MessageCircleQuestion,
  AlarmClock, UserRoundPlus, Undo2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

export default function FounderInbox() {
  const [tab, setTab] = useState<ApprovalFilter>("pending");
  const { data, isLoading } = useApprovals({ status: tab });
  const decide = useDecideApproval();
  const delegate = useDelegateApproval();
  const { data: members } = useWorkspaceMembers();
  const [infoTarget, setInfoTarget] = useState<Approval | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<Approval | null>(null);

  const handleDecide = async (id: string, status: ApprovalStatus, note?: string, snoozeUntil?: string | null) => {
    try {
      await decide.mutateAsync({ id, status, note, snooze_until: snoozeUntil ?? null });
      toast.success(
        status === "approved" ? "Onaylandı"
        : status === "rejected" ? "Reddedildi"
        : status === "snoozed" ? "Ertelendi"
        : status === "pending" ? "Kuyruğa alındı"
        : "Güncellendi",
      );
    } catch (e) {
      toast.error("İşlem başarısız: " + (e instanceof Error ? e.message : "bilinmeyen hata"));
    }
  };

  const memberName = (userId: string | null) => {
    if (!userId) return "—";
    const m = members?.find((x) => x.user_id === userId);
    return m?.full_name ?? "Üye";
  };

  // F3 onay limitleri: UI, DB trigger'ının uygulayacağı kuralı önden gösterir
  const { user } = useAuth();
  const { role } = useWorkspace();
  const myLimit = members?.find((m) => m.user_id === user?.id)?.approval_limit ?? null;
  const decideCheck = (a: Approval) =>
    canDecideApproval({ role, approvalLimit: myLimit }, { kind: a.kind, amount: a.amount });

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Founder Inbox</h1>
            <p className="text-sm text-muted-foreground">
              Onayınızı, kararınızı veya müdahalenizi bekleyen tüm konular.
            </p>
          </div>
          <NewApprovalDialog />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as ApprovalFilter)}>
          <TabsList>
            <TabsTrigger value="pending">Bekleyen</TabsTrigger>
            <TabsTrigger value="snoozed">Ertelenen</TabsTrigger>
            <TabsTrigger value="delegated">Devredilen</TabsTrigger>
            <TabsTrigger value="info_requested">Bilgi İstenen</TabsTrigger>
            <TabsTrigger value="resolved">Sonuçlanan</TabsTrigger>
            <TabsTrigger value="all">Tümü</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : !data || data.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  {tab === "pending" ? "Bekleyen onay yok. 🎉"
                    : tab === "snoozed" ? "Ertelenmiş onay yok."
                    : tab === "delegated" ? "Devredilmiş onay yok."
                    : tab === "info_requested" ? "Bilgi beklenen onay yok."
                    : "Kayıt yok."}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {data.map(a => (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {APPROVAL_KIND_LABELS[a.kind]}
                            </Badge>
                            <Badge className={APPROVAL_PRIORITY_COLORS[a.priority]}>
                              {{low:"Düşük",normal:"Normal",high:"Yüksek",urgent:"Acil"}[a.priority] ?? a.priority}
                            </Badge>
                            {a.status !== "pending" && (
                              <Badge variant="secondary" className="text-xs">{({approved:"Onaylandı",rejected:"Reddedildi",snoozed:"Ertelendi",delegated:"Devredildi",pending:"Bekliyor"} as Record<string,string>)[a.status] ?? a.status}</Badge>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold mt-2">{a.title}</h3>
                          {a.summary && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.summary}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                            {a.amount != null && (
                              <span className="font-medium text-foreground">
                                {a.amount.toLocaleString()} {a.currency}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: tr })}
                            </span>
                            {a.due_at && (
                              <span>Son tarih: {new Date(a.due_at).toLocaleDateString("tr-TR")}</span>
                            )}
                            {a.decision_note && (
                              <span className="italic">Not: {a.decision_note}</span>
                            )}
                            {a.status === "snoozed" && a.snooze_until && (
                              <span className="flex items-center gap-1 text-warning">
                                <AlarmClock className="h-3 w-3" />
                                {format(new Date(a.snooze_until), "d MMM HH:mm", { locale: tr })}'e kadar ertelendi
                              </span>
                            )}
                            {a.status === "delegated" && (
                              <span className="flex items-center gap-1">
                                <UserRoundPlus className="h-3 w-3" />
                                Devredildi: {memberName(a.assigned_to)}
                              </span>
                            )}
                          </div>
                        </div>

                        {(a.status === "pending" || (a.status === "snoozed" && tab === "pending")) && (
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleDecide(a.id, "approved")}
                              disabled={decide.isPending || !decideCheck(a).allowed}
                              title={decideCheck(a).reason}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Onayla
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              onClick={() => handleDecide(a.id, "rejected")}
                              disabled={decide.isPending || !decideCheck(a).allowed}
                              title={decideCheck(a).reason}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reddet
                            </Button>
                            {!decideCheck(a).allowed && (
                              <p className="max-w-[160px] text-[10.5px] leading-snug text-muted-foreground">
                                {decideCheck(a).reason}
                              </p>
                            )}
                            <div className="flex gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="flex-1" disabled={decide.isPending}>
                                    <AlarmClock className="h-3.5 w-3.5 mr-1" />
                                    Ertele
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {(Object.keys(SNOOZE_LABELS) as SnoozeOption[]).map((opt) => (
                                    <DropdownMenuItem
                                      key={opt}
                                      onClick={() =>
                                        handleDecide(a.id, "snoozed", undefined, computeSnoozeUntil(opt, Date.now()))}
                                    >
                                      {SNOOZE_LABELS[opt]}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => setDelegateTarget(a)}
                              disabled={delegate.isPending}
                            >
                              <UserRoundPlus className="h-3.5 w-3.5 mr-1" />
                              Devret
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => setInfoTarget(a)}
                              disabled={decide.isPending}
                            >
                              <MessageCircleQuestion className="h-3.5 w-3.5 mr-1" />
                              Bilgi İste
                            </Button>
                          </div>
                        )}

                        {(a.status === "snoozed" && tab !== "pending") || a.status === "delegated" || a.status === "info_requested" ? (
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => handleDecide(a.id, "pending")}
                              disabled={decide.isPending}
                            >
                              <Undo2 className="h-3.5 w-3.5 mr-1" />
                              Kuyruğa Al
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <InfoRequestDialog
          approval={infoTarget}
          onClose={() => setInfoTarget(null)}
          onSubmit={async (note) => {
            if (infoTarget) await handleDecide(infoTarget.id, "info_requested", note);
            setInfoTarget(null);
          }}
        />
        <DelegateDialog
          approval={delegateTarget}
          members={members ?? []}
          onClose={() => setDelegateTarget(null)}
          onSubmit={async (userId) => {
            if (!delegateTarget) return;
            try {
              await delegate.mutateAsync({ id: delegateTarget.id, userId });
              toast.success(`Devredildi: ${memberName(userId)}`);
            } catch (e) {
              toast.error("Devredilemedi: " + (e instanceof Error ? e.message : ""));
            }
            setDelegateTarget(null);
          }}
        />
      </div>
    </AppLayout>
  );
}

function InfoRequestDialog({ approval, onClose, onSubmit }: {
  approval: Approval | null;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Dialog open={!!approval} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bilgi İste — {approval?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Neyi netleştirmek istiyorsun?</Label>
          <Textarea
            value={note} rows={3} autoFocus
            onChange={(e) => setNote(e.target.value)}
            placeholder="Örn: Bu harcamanın Q3 bütçesindeki kalemi hangisi?"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>İptal</Button>
          <Button
            disabled={!note.trim()}
            onClick={() => { onSubmit(note.trim()); setNote(""); }}
          >
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DelegateDialog({ approval, members, onClose, onSubmit }: {
  approval: Approval | null;
  members: { user_id: string; full_name: string | null; role: string }[];
  onClose: () => void;
  onSubmit: (userId: string) => void;
}) {
  const [userId, setUserId] = useState("");
  return (
    <Dialog open={!!approval} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Devret — {approval?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Workspace üyesi</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Üye seç" /></SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.full_name ?? "İsimsiz üye"} · {m.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {members.length <= 1 && (
            <p className="text-xs text-muted-foreground">
              Devredecek başka üye yok — önce Ayarlar → Üyeler'tan davet gönder.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>İptal</Button>
          <Button disabled={!userId} onClick={() => { onSubmit(userId); setUserId(""); }}>
            Devret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewApprovalDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ApprovalKind>("general");
  const [priority, setPriority] = useState<ApprovalPriority>("normal");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const create = useCreateApproval();

  const submit = async () => {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({
        kind, title, summary: summary || undefined,
        amount: amount ? Number(amount) : null, currency, priority,
      });
      toast.success("Onay talebi oluşturuldu");
      setOpen(false);
      setTitle(""); setSummary(""); setAmount("");
    } catch (e) {
      toast.error("Oluşturulamadı: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Onay Talep Et
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Onay Talebi</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tip</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as ApprovalKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(APPROVAL_KIND_LABELS) as ApprovalKind[]).map(k => (
                    <SelectItem key={k} value={k}>{APPROVAL_KIND_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Öncelik</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ApprovalPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Düşük</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                  <SelectItem value="urgent">Acil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Başlık *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kısa açıklama" />
          </div>
          <div>
            <Label>Detay</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tutar</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="opsiyonel" />
            </div>
            <div>
              <Label>Para birimi</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
          <Button onClick={submit} disabled={create.isPending || !title.trim()}>Oluştur</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
