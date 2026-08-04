import { useState } from 'react';
import {
  useTaskTemplates, useCreateTaskTemplate, useDeleteTaskTemplate,
  useProjectTemplates, useCreateProjectTemplate, useDeleteProjectTemplate,
  type TaskTemplate, type ProjectTemplate,
} from '@/lib/templates-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, FileText, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function TaskTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateTaskTemplate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [tags, setTags] = useState('');
  const [subtasks, setSubtasks] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim()) {
      toast.error('Template adı ve varsayılan başlık gerekli');
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        body: {
          title: title.trim(),
          priority: priority as any,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          subtasks: subtasks
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => ({ title: s })),
        },
      });
      toast.success('Template oluşturuldu');
      setName(''); setDescription(''); setCategory(''); setTitle(''); setTags(''); setSubtasks('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Yeni task template</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Template adı</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Weekly retro" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ne zaman kullanılır?" />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori (opsiyonel)</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Engineering, Marketing…" />
          </div>
          <div className="border-t border-border/60 pt-3 space-y-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Varsayılan içerik</div>
            <div className="space-y-1.5">
              <Label>Task başlığı</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sprint retrospective" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Öncelik</Label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                  <option value="urgent">Acil</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Etiketler</Label>
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="retro, meeting" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Alt görevler (satır başına 1)</Label>
              <Textarea rows={3} value={subtasks} onChange={e => setSubtasks(e.target.value)} placeholder="Gündem hazırla&#10;Toplantıya katıl&#10;Notları paylaş" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending}>Kaydet</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateProjectTemplate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [projectName, setProjectName] = useState('');
  const [tasks, setTasks] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectName.trim()) return toast.error('Ad ve varsayılan proje adı gerekli');
    try {
      await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        body: {
          name: projectName.trim(),
          tasks: tasks.split('\n').map(t => t.trim()).filter(Boolean).map(t => ({ title: t })),
        },
      });
      toast.success('Project template oluşturuldu');
      setName(''); setDescription(''); setCategory(''); setProjectName(''); setTasks('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Yeni project template</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Template adı</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Product launch" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ne için kullanılır?" />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Product, Marketing…" />
          </div>
          <div className="border-t border-border/60 pt-3 space-y-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Varsayılan içerik</div>
            <div className="space-y-1.5">
              <Label>Proje adı</Label>
              <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="New feature launch" />
            </div>
            <div className="space-y-1.5">
              <Label>Görevler (satır başına 1)</Label>
              <Textarea rows={5} value={tasks} onChange={e => setTasks(e.target.value)} placeholder="Kickoff toplantısı&#10;Kapsam tanımla&#10;Tasarım brief'i&#10;Uygulama&#10;QA + go-live" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending}>Kaydet</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  tpl, icon: Icon, meta, onDelete,
}: {
  tpl: TaskTemplate | ProjectTemplate;
  icon: React.ElementType;
  meta: string;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[13.5px] font-semibold text-foreground truncate">{tpl.name}</h3>
          </div>
          {tpl.description && <p className="text-[11.5px] text-muted-foreground line-clamp-2">{tpl.description}</p>}
          <div className="mt-2 flex items-center gap-2 text-[10.5px] text-muted-foreground">
            {tpl.category && <span className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 uppercase tracking-wider">{tpl.category}</span>}
            <span>{meta}</span>
            <span className="opacity-60">·</span>
            <span>{format(new Date(tpl.created_at), 'MMM d')}</span>
          </div>
        </div>
        <Button
          size="icon" variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function Templates() {
  const { data: taskTpls, isLoading: taskLoading } = useTaskTemplates();
  const { data: projectTpls, isLoading: projectLoading } = useProjectTemplates();
  const delTask = useDeleteTaskTemplate();
  const delProject = useDeleteProjectTemplate();

  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">Templates</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Sık kullandığınız görev ve proje şablonlarını kaydedin, tek tıkla yeni bir kopya oluşturun.
        </p>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Task templates ({taskTpls?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="projects">Project templates ({projectTpls?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <div className="mb-3 flex items-center justify-end">
            <Button size="sm" onClick={() => setTaskOpen(true)} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Yeni task template
            </Button>
          </div>
          {taskLoading ? (
            <div className="grid gap-2 md:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : (taskTpls?.length ?? 0) === 0 ? (
            <div className="rounded-md border border-border/60 py-10 text-center text-[13px] text-muted-foreground">
              Henüz task template yok. "Yeni task template" ile başla.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {(taskTpls ?? []).map(t => {
                const subCount = (t.body?.subtasks?.length ?? 0);
                return (
                  <TemplateCard
                    key={t.id}
                    tpl={t}
                    icon={FileText}
                    meta={`${subCount} alt görev`}
                    onDelete={() => delTask.mutate(t.id)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <div className="mb-3 flex items-center justify-end">
            <Button size="sm" onClick={() => setProjectOpen(true)} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Yeni project template
            </Button>
          </div>
          {projectLoading ? (
            <div className="grid gap-2 md:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : (projectTpls?.length ?? 0) === 0 ? (
            <div className="rounded-md border border-border/60 py-10 text-center text-[13px] text-muted-foreground">
              Henüz project template yok. "Yeni project template" ile başla.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {(projectTpls ?? []).map(p => {
                const taskCount = (p.body?.tasks?.length ?? 0);
                return (
                  <TemplateCard
                    key={p.id}
                    tpl={p}
                    icon={FolderKanban}
                    meta={`${taskCount} görev`}
                    onDelete={() => delProject.mutate(p.id)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TaskTemplateDialog open={taskOpen} onOpenChange={setTaskOpen} />
      <ProjectTemplateDialog open={projectOpen} onOpenChange={setProjectOpen} />
    </div>
  );
}
