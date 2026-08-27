import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, User } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { useAllProfiles } from "@/lib/projects-hooks";
import {
  useBug,
  useBugComments,
  useBugCommentProfiles,
  useUpdateBug,
  useAddBugComment,
  useLogBugActivity,
} from "@/lib/bugs-hooks";

const statusFlow: Enums<"bug_status">[] = ["new", "assigned", "in_progress", "testing", "resolved", "closed"];

export default function BugDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState("");

  const { data: bug, isLoading } = useBug(id);
  const { data: comments = [] } = useBugComments(id);
  const { data: allProfiles } = useAllProfiles();

  const commentUserIds = useMemo(
    () => [...new Set(comments.map((c) => c.user_id))],
    [comments]
  );
  const { data: profiles = {} } = useBugCommentProfiles(commentUserIds);

  const profileMap = useMemo(
    () => new Map((allProfiles ?? []).map(p => [p.user_id, p.full_name])),
    [allProfiles],
  );

  const updateBug = useUpdateBug();
  const addComment = useAddBugComment();
  const logActivity = useLogBugActivity();

  const updateStatus = async (newStatus: Enums<"bug_status">) => {
    if (!bug || !user) return;
    try {
      await updateBug.mutateAsync({ id: bug.id, status: newStatus });
      await logActivity.mutateAsync({
        bug_id: bug.id,
        action: "status_change",
        old_value: bug.status,
        new_value: newStatus,
      });
      toast.success(`Durum güncellendi: ${newStatus.replace("_", " ")}`);
    } catch (error: any) {
      toast.error("Durum güncellenemedi: " + error.message);
    }
  };

  const updateAssignee = async (uid: string) => {
    if (!bug) return;
    try {
      await updateBug.mutateAsync({ id: bug.id, assignee_id: uid === '__none__' ? null : uid });
      toast.success("Atanan güncellendi");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateSeverity = async (sev: string) => {
    if (!bug) return;
    try {
      await updateBug.mutateAsync({ id: bug.id, severity: sev as any });
      await logActivity.mutateAsync({
        bug_id: bug.id,
        action: "severity_change",
        old_value: bug.severity,
        new_value: sev,
      });
      toast.success("Önem derecesi güncellendi");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !bug) return;
    try {
      await addComment.mutateAsync({ bug_id: bug.id, content: newComment.trim() });
      setNewComment("");
    } catch (error: any) {
      toast.error("Yorum eklenemedi: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!bug) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <p className="text-[13px] text-muted-foreground">Bug bulunamadı</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/bugs")} className="h-7 text-[12px]">
            Bug listesine dön
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 md:px-6 h-11 border-b border-border shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-7 w-7">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="font-mono text-[12px] text-muted-foreground">{bug.tracking_id}</span>
          <StatusBadge status={bug.status} />
          <SeverityBadge severity={bug.severity} />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex flex-col lg:flex-row">
            {/* Main content */}
            <div className="flex-1 min-w-0 border-r border-border">
              {/* Title */}
              <div className="px-4 md:px-6 py-4 border-b border-border">
                <h1 className="text-base font-medium">{bug.title}</h1>
              </div>

              {/* Description */}
              <div className="px-4 md:px-6 py-4 border-b border-border">
                <p className="text-[12px] text-muted-foreground mb-2 font-medium">Açıklama</p>
                <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{bug.description || "Açıklama eklenmemiş"}</p>
              </div>

              {bug.steps_to_reproduce && (
                <div className="px-4 md:px-6 py-4 border-b border-border">
                  <p className="text-[12px] text-muted-foreground mb-2 font-medium">Yeniden Üretme Adımları</p>
                  <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{bug.steps_to_reproduce}</p>
                </div>
              )}

              {(bug.expected_behavior || bug.actual_behavior) && (
                <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border">
                  {bug.expected_behavior && (
                    <div className="px-4 md:px-6 py-4 md:border-r border-border">
                      <p className="text-[12px] text-muted-foreground mb-2 font-medium">Beklenen Davranış</p>
                      <p className="text-[13px]">{bug.expected_behavior}</p>
                    </div>
                  )}
                  {bug.actual_behavior && (
                    <div className="px-4 md:px-6 py-4">
                      <p className="text-[12px] text-muted-foreground mb-2 font-medium">Gerçekleşen Davranış</p>
                      <p className="text-[13px]">{bug.actual_behavior}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Comments */}
              <div className="px-4 md:px-6 py-4">
                <p className="text-[12px] text-muted-foreground mb-3 font-medium">Aktivite · {comments.length}</p>
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-2xs font-medium text-muted-foreground">
                          {(profiles[c.user_id] || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium">{profiles[c.user_id] || "User"}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-[13px] mt-0.5 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <Textarea
                    placeholder="Yorum yaz..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    className="text-[13px] min-h-[60px] resize-none"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addComment.isPending}
                    size="sm"
                    className="shrink-0 self-end h-8"
                  >
                    {addComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-full lg:w-64 shrink-0">
              {/* Status workflow */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[12px] text-muted-foreground mb-2 font-medium">Status</p>
                <div className="flex flex-wrap gap-1">
                  {statusFlow.map((status) => (
                    <Button
                      key={status}
                      variant={bug.status === status ? "secondary" : "ghost"}
                      size="sm"
                      disabled={bug.status === status}
                      onClick={() => updateStatus(status)}
                      className="h-6 text-[11px] px-2"
                    >
                      {status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[12px] text-muted-foreground mb-2 font-medium">Önem</p>
                <Select value={bug.severity} onValueChange={updateSeverity}>
                  <SelectTrigger className="h-7 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.bug_severity.map(s => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[12px] text-muted-foreground mb-2 font-medium">Atanan</p>
                <Select value={bug.assignee_id ?? '__none__'} onValueChange={updateAssignee}>
                  <SelectTrigger className="h-7 text-[12px]">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{bug.assignee_id ? (profileMap.get(bug.assignee_id) ?? 'Kullanıcı') : 'Atanmamış'}</span>
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

              {/* Properties */}
              <div className="px-4 py-3 space-y-3 text-[13px]">
                <div>
                  <p className="text-[12px] text-muted-foreground mb-0.5">Ortam</p>
                  <p>{bug.environment || "—"}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground mb-0.5">Oluşturulma</p>
                  <p>{formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground mb-0.5">Güncelleme</p>
                  <p>{formatDistanceToNow(new Date(bug.updated_at), { addSuffix: true })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
