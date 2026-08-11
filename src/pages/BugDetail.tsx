import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
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

  const commentUserIds = useMemo(
    () => [...new Set(comments.map((c) => c.user_id))],
    [comments]
  );
  const { data: profiles = {} } = useBugCommentProfiles(commentUserIds);

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
      toast.success(`Durum guncellendi: ${newStatus.replace("_", " ")}`);
    } catch (error: any) {
      toast.error("Durum guncellenemedi: " + error.message);
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
          <p className="text-[13px] text-muted-foreground">Bug not found</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="h-7 text-[12px]">
            Back to Dashboard
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
                <p className="text-[12px] text-muted-foreground mb-2 font-medium">Description</p>
                <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{bug.description || "No description"}</p>
              </div>

              {bug.steps_to_reproduce && (
                <div className="px-4 md:px-6 py-4 border-b border-border">
                  <p className="text-[12px] text-muted-foreground mb-2 font-medium">Steps to Reproduce</p>
                  <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{bug.steps_to_reproduce}</p>
                </div>
              )}

              {(bug.expected_behavior || bug.actual_behavior) && (
                <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border">
                  {bug.expected_behavior && (
                    <div className="px-4 md:px-6 py-4 md:border-r border-border">
                      <p className="text-[12px] text-muted-foreground mb-2 font-medium">Expected</p>
                      <p className="text-[13px]">{bug.expected_behavior}</p>
                    </div>
                  )}
                  {bug.actual_behavior && (
                    <div className="px-4 md:px-6 py-4">
                      <p className="text-[12px] text-muted-foreground mb-2 font-medium">Actual</p>
                      <p className="text-[13px]">{bug.actual_behavior}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Comments */}
              <div className="px-4 md:px-6 py-4">
                <p className="text-[12px] text-muted-foreground mb-3 font-medium">Activity · {comments.length}</p>
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
                    placeholder="Leave a comment..."
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

              {/* Properties */}
              <div className="px-4 py-3 space-y-3 text-[13px]">
                <div>
                  <p className="text-[12px] text-muted-foreground mb-0.5">Environment</p>
                  <p>{bug.environment || "—"}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground mb-0.5">Created</p>
                  <p>{formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}</p>
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground mb-0.5">Updated</p>
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
