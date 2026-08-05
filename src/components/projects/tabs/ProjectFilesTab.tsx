import { useRef, useState } from 'react';
import { useProjectFiles, useUploadProjectFile, useDeleteProjectFile, useAddExternalProjectFile, getProjectFileSignedUrl } from '@/lib/project-content-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link2, Trash2, FileIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const EXTERNAL_SOURCES = [
  { id: 'google_drive', label: 'Google Drive' },
  { id: 'onedrive', label: 'OneDrive/SharePoint' },
  { id: 'dropbox', label: 'Dropbox' },
  { id: 'box', label: 'Box' },
];

function bytes(n: number | null) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ProjectFilesTab({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string | undefined;
}) {
  const { user } = useAuth();
  const { data: files, isLoading } = useProjectFiles(projectId);
  const upload = useUploadProjectFile();
  const del = useDeleteProjectFile();
  const addExternal = useAddExternalProjectFile();
  const fileInput = useRef<HTMLInputElement>(null);
  const [extOpen, setExtOpen] = useState<string | null>(null);
  const [extName, setExtName] = useState('');
  const [extUrl, setExtUrl] = useState('');

  const handleUpload = async (files: FileList | null) => {
    if (!files || !workspaceId) return;
    for (const f of Array.from(files)) {
      try {
        await upload.mutateAsync({ project_id: projectId, workspace_id: workspaceId, file: f });
      } catch (e: any) { toast.error(`${f.name}: ${e.message}`); }
    }
    toast.success('Yüklendi');
  };

  const openFile = async (f: (NonNullable<typeof files>)[number]) => {
    try {
      if (f.external_url) {
        window.open(f.external_url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (f.storage_path) {
        const url = await getProjectFileSignedUrl(f.storage_path);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const submitExternal = async (source: string) => {
    if (!extName.trim() || !extUrl.trim()) return;
    try {
      await addExternal.mutateAsync({ project_id: projectId, name: extName.trim(), external_url: extUrl.trim(), source });
      toast.success('Bağlantı eklendi');
      setExtName(''); setExtUrl(''); setExtOpen(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Yükle</TabsTrigger>
          {EXTERNAL_SOURCES.map(s => (
            <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="upload" className="mt-3">
          <div
            className="rounded-lg border-2 border-dashed p-8 text-center hover:border-primary transition"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          >
            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm mb-2">Bilgisayarından dosya seç veya sürükle bırak</p>
            <input ref={fileInput} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
            <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()} disabled={!workspaceId || upload.isPending}>
              Dosya seç
            </Button>
          </div>
        </TabsContent>
        {EXTERNAL_SOURCES.map(s => (
          <TabsContent key={s.id} value={s.id} className="mt-3">
            <div className="rounded-lg border p-6 text-center">
              <Link2 className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm mb-3">{s.label} bağlantısı ekle</p>
              <Dialog open={extOpen === s.id} onOpenChange={o => setExtOpen(o ? s.id : null)}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">Bağlantı ekle</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{s.label} bağlantısı</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Dosya adı" value={extName} onChange={e => setExtName(e.target.value)} />
                    <Input placeholder="https://..." value={extUrl} onChange={e => setExtUrl(e.target.value)} />
                    <Button className="w-full" onClick={() => submitExternal(s.id)} disabled={addExternal.isPending}>Ekle</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : (files ?? []).length === 0 ? (
        <p className="text-center py-10 text-sm text-muted-foreground">Bu projeye ait dosya yok</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(files ?? []).map(f => (
            <Card key={f.id} className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-muted flex items-center justify-center">
                {f.external_url ? <ExternalLink className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
              </div>
              <button onClick={() => openFile(f)} className="flex-1 min-w-0 text-left">
                <p className="text-sm truncate">{f.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {f.source === 'upload' ? bytes(f.size_bytes) : EXTERNAL_SOURCES.find(s => s.id === f.source)?.label ?? f.source}
                  {' · '}{new Date(f.created_at).toLocaleDateString('tr-TR')}
                </p>
              </button>
              {f.uploaded_by === user?.id && (
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Dosyayı sil" onClick={() => del.mutate({ file: f, project_id: projectId })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
