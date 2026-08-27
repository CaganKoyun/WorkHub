import { useRef, useState } from 'react';
import { Paperclip, Upload, X, Loader2, FileText, ImageIcon, File as FileIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTaskAttachments, useUploadTaskAttachment, useDeleteAttachment,
  signedDownloadUrl, formatBytes, type Attachment,
} from '@/lib/attachments-hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_BYTES = 25 * 1024 * 1024;

function typeIcon(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('text/') || mime === 'application/pdf') return FileText;
  return FileIcon;
}

export function TaskAttachments({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const { data: attachments } = useTaskAttachments(taskId);
  const upload = useUploadTaskAttachment();
  const del = useDeleteAttachment();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: 25 MB üzeri`);
        continue;
      }
      try {
        await upload.mutateAsync({ taskId, file: f });
      } catch (e: any) {
        toast.error(`${f.name}: ${e.message ?? 'yüklenemedi'}`);
      }
    }
  };

  const onDownload = async (att: Attachment) => {
    try {
      const url = await signedDownloadUrl(att.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e.message ?? 'İndirilemedi');
    }
  };

  const items = attachments ?? [];

  return (
    <section>
      <h4 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Paperclip className="h-3 w-3" />
        Ekler ({items.length})
      </h4>

      <div
        className={cn(
          'rounded-md border border-dashed border-border/70 bg-card/40 p-2 transition-colors',
          dragOver && 'border-primary bg-primary/5',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        {items.length === 0 && (
          <p className="py-1 text-center text-[11.5px] text-muted-foreground/80">
            Dosya sürükle bırak veya seç
          </p>
        )}
        <div className="space-y-1">
          {items.map((a) => {
            const Icon = typeIcon(a.mime_type);
            const canDelete = a.uploaded_by === user?.id;
            return (
              <div key={a.id} className="group flex items-center gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5 hover:border-border">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <button
                  className="min-w-0 flex-1 truncate text-left text-[12.5px] font-medium hover:text-primary"
                  title={a.filename}
                  onClick={() => onDownload(a)}
                >
                  {a.filename}
                </button>
                <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-muted-foreground">
                  {formatBytes(a.size_bytes)}
                </span>
                {canDelete && (
                  <button
                    className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                    onClick={() => del.mutate(a)}
                    aria-label="Sil"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10.5px] text-muted-foreground/70">
            Maks. 25 MB / dosya
          </span>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="inline-flex h-6 items-center gap-1 rounded border border-border bg-secondary px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            {upload.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Dosya seç
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}
