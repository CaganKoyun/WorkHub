import { useState } from 'react';
import { useProjectMessages, useCreateProjectMessage, useDeleteProjectMessage } from '@/lib/project-content-hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function ProjectMessagesTab({
  projectId,
  profileMap,
}: {
  projectId: string;
  profileMap: Map<string, { name: string | null; avatar: string | null }>;
}) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useProjectMessages(projectId);
  const create = useCreateProjectMessage();
  const del = useDeleteProjectMessage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const submit = async () => {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ project_id: projectId, title: title.trim(), body: body.trim() });
      toast.success('Mesaj gönderildi');
      setTitle(''); setBody(''); setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><MessageSquarePlus className="h-4 w-4 mr-1" />Mesaj yaz</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni mesaj</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Başlık" value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea placeholder="Ekibe bildirmek istediğin şey..." value={body} onChange={e => setBody(e.target.value)} rows={6} />
              <Button className="w-full" onClick={submit} disabled={create.isPending || !title.trim()}>Gönder</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : (messages ?? []).length === 0 ? (
        <p className="text-center py-16 text-sm text-muted-foreground">Henüz mesaj yok. Proje güncellemelerini burada duyur.</p>
      ) : (
        <div className="space-y-3">
          {(messages ?? []).map(m => {
            const p = profileMap.get(m.author_id);
            return (
              <Card key={m.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8"><AvatarFallback>{p?.name?.[0] ?? '?'}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{p?.name ?? 'Kullanıcı'} · {new Date(m.created_at).toLocaleString('tr-TR')}</p>
                      </div>
                      {m.author_id === user?.id && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate({ id: m.id, project_id: projectId })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {m.body && <p className="text-sm mt-2 whitespace-pre-wrap">{m.body}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
