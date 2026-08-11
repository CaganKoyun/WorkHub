import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useProject, useProjectMembers, useDeleteProject, useAllProfiles, useAddMember, useRemoveMember } from '@/lib/projects-hooks';
import { useTasks, useMoveTask, useDeleteTask } from '@/lib/tasks-hooks';
import { useUserRole } from '@/lib/user-role';
import { useAuth } from '@/contexts/AuthContext';
import {
  PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
} from '@/lib/projects-types';
import {
  TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS,
} from '@/lib/tasks-types';
import type { Task, TaskStatus } from '@/lib/tasks-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, ArrowLeft, UserPlus, X, Calendar as CalendarIcon, LayoutDashboard, List, KanbanSquare, GanttChart, CalendarDays, MessageSquare, Paperclip, Users as UsersIcon, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { TaskFormDialog } from '../tasks/TaskFormDialog';
import { TaskDetailDialog } from '../tasks/TaskDetailDialog';
import { TaskRow } from '../tasks/TaskRow';
import { TaskStatusIcon, TaskPriorityIcon } from '../tasks/TaskStatusIcon';
import { RelatedObjectsPanel } from '@/components/graph/RelatedObjectsPanel';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ProjectOverviewTab } from './tabs/ProjectOverviewTab';
import { ProjectCalendarTab } from './tabs/ProjectCalendarTab';
import { ProjectTimelineTab } from './tabs/ProjectTimelineTab';
import { ProjectDashboardTab } from './tabs/ProjectDashboardTab';
import { ProjectMessagesTab } from './tabs/ProjectMessagesTab';
import { ProjectFilesTab } from './tabs/ProjectFilesTab';

function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`p-2.5 rounded-md border border-border/70 bg-card hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <TaskPriorityIcon priority={task.priority} size={12} />
        <span className="font-mono text-[10.5px] text-muted-foreground/80 tabular-nums">{task.tracking_id ?? 'WH-—'}</span>
        <TaskStatusIcon status={task.status} size={12} />
      </div>
      <p className="text-[13px] font-medium leading-snug text-foreground">{task.title}</p>
      {task.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map(t => (
            <span key={t} className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
      {task.due_date && (
        <div className="mt-1.5 flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <CalendarIcon className="h-3 w-3" /> {task.due_date}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ status, tasks, onOpen }: { status: TaskStatus; tasks: Task[]; onOpen: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 p-2.5 rounded-lg border border-border/60 bg-secondary/30 min-h-[300px] transition-colors ${isOver ? 'border-primary/50 bg-primary/5' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1 px-0.5">
        <TaskStatusIcon status={status} size={12} />
        <span className="text-[12px] font-medium text-foreground">{TASK_STATUS_LABELS[status]}</span>
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground/70">{tasks.length}</span>
      </div>
      {tasks.map(t => <TaskCard key={t.id} task={t} onOpen={() => onOpen(t)} />)}
    </div>
  );
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const { data: project, isLoading } = useProject(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: profiles } = useAllProfiles();
  const { data: tasks } = useTasks(projectId);
  const { currentWorkspace } = useWorkspace();
  const deleteProject = useDeleteProject();
  const moveTask = useMoveTask();
  const deleteTask = useDeleteTask();
  const addMember = useAddMember();
  const removeMember = useRemoveMember();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const isOwner = project?.owner_id === user?.id;
  const isAdmin = role === 'admin';
  const canManage = isOwner || isAdmin;

  const profileMap = useMemo(() => {
    const m = new Map<string, { name: string | null; avatar: string | null }>();
    (profiles ?? []).forEach(p => m.set(p.user_id, { name: p.full_name, avatar: p.avatar_url }));
    return m;
  }, [profiles]);

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { backlog: [], todo: [], in_progress: [], review: [], done: [] };
    (tasks ?? []).forEach(t => { groups[t.status].push(t); });
    return groups;
  }, [tasks]);

  const memberProfiles = (members ?? []).map(m => ({ ...m, profile: profileMap.get(m.user_id) }));

  if (isLoading) return <div className="text-muted-foreground">Yükleniyor...</div>;
  if (!project) return <div className="text-muted-foreground">Proje bulunamadı</div>;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const taskId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const targetStatus = overId as TaskStatus;
    const task = tasks?.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    moveTask.mutate({ id: taskId, status: targetStatus, position: 0, project_id: projectId });
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(projectId);
      toast.success('Proje silindi');
      navigate('/projects');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddMember = async () => {
    if (!newMemberId) return;
    try {
      await addMember.mutateAsync({ project_id: projectId, user_id: newMemberId, role: 'member' });
      toast.success('Üye eklendi');
      setNewMemberId(''); setMemberDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const availableProfiles = (profiles ?? []).filter(p =>
    p.user_id !== user?.id && !(members ?? []).some(m => m.user_id === p.user_id),
  );

  const activeTask = tasks?.find(t => t.id === activeId);

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />Projeler
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ background: (project.color ?? '#6366f1') + '30' }}>
              {project.icon ?? '📁'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge className={`text-xs border ${PROJECT_STATUS_COLORS[project.status]}`}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
                <Badge className={`text-xs border ${PRIORITY_COLORS[project.priority]}`}>{PRIORITY_LABELS[project.priority]}</Badge>
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/edit`)}>
                <Pencil className="h-4 w-4 mr-1" />Düzenle
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-1" />Sil
              </Button>
            </div>
          )}
        </div>
        {project.description && <p className="text-sm text-muted-foreground mt-3 max-w-3xl">{project.description}</p>}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="h-3.5 w-3.5 mr-1" />Genel</TabsTrigger>
          <TabsTrigger value="list"><List className="h-3.5 w-3.5 mr-1" />Liste</TabsTrigger>
          <TabsTrigger value="board"><KanbanSquare className="h-3.5 w-3.5 mr-1" />Board</TabsTrigger>
          <TabsTrigger value="timeline"><GanttChart className="h-3.5 w-3.5 mr-1" />Zaman</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="h-3.5 w-3.5 mr-1" />Takvim</TabsTrigger>
          <TabsTrigger value="dashboard"><LayoutDashboard className="h-3.5 w-3.5 mr-1" />Panel</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="h-3.5 w-3.5 mr-1" />Mesajlar</TabsTrigger>
          <TabsTrigger value="files"><Paperclip className="h-3.5 w-3.5 mr-1" />Dosyalar</TabsTrigger>
          <TabsTrigger value="members"><UsersIcon className="h-3.5 w-3.5 mr-1" />Üyeler ({memberProfiles.length})</TabsTrigger>
          <TabsTrigger value="graph"><Link2 className="h-3.5 w-3.5 mr-1" />Bağlantılar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ProjectOverviewTab project={project} tasks={tasks ?? []} memberCount={memberProfiles.length} />
        </TabsContent>

        <TabsContent value="board" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Görev ekle
            </Button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {TASK_STATUS_ORDER.map(s => (
                <KanbanColumn key={s} status={s} tasks={groupedTasks[s]} onOpen={setOpenTask} />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} onOpen={() => {}} /> : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Görev ekle
            </Button>
          </div>
          <div className="rounded-md border border-border/60 overflow-hidden">
            {(tasks ?? []).length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Görev yok</p>
            ) : (tasks ?? []).map(t => (
              <TaskRow
                key={t.id}
                task={t}
                assigneeName={t.assignee_id ? profileMap.get(t.assignee_id)?.name : null}
                onClick={() => setOpenTask(t)}
                rightSlot={
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); setEditingTask(t); setTaskDialogOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => {
                      e.stopPropagation();
                      if (confirm('Görevi silmek istiyor musun?')) deleteTask.mutate({ id: t.id, project_id: projectId });
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ProjectTimelineTab tasks={tasks ?? []} onOpen={setOpenTask} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <ProjectCalendarTab tasks={tasks ?? []} onOpen={setOpenTask} />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <ProjectDashboardTab tasks={tasks ?? []} members={memberProfiles} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <ProjectMessagesTab projectId={projectId} profileMap={profileMap} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <ProjectFilesTab projectId={projectId} workspaceId={currentWorkspace?.id} />
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-3">
          {canManage && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setMemberDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1" />Üye ekle
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {memberProfiles.map(m => (
              <Card key={m.id} className="p-3 flex items-center gap-3">
                <Avatar className="h-9 w-9"><AvatarFallback>{m.profile?.name?.[0] ?? '?'}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.profile?.name ?? 'Kullanıcı'}</p>
                  <p className="text-xs text-muted-foreground">{m.role}</p>
                </div>
                {canManage && m.role !== 'owner' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMember.mutate({ id: m.id, project_id: projectId })}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="graph" className="mt-4 space-y-3">
          <RelatedObjectsPanel type="project" id={projectId} />
          <p className="text-xs text-muted-foreground">
            Bu projeyi bir müşteriye, hedefe, sözleşmeye, gidere veya başka bir kayda bağlayın. Company Graph bağlantıları raporlarda ve founder inbox'ta bağlam olarak kullanılır.
          </p>
        </TabsContent>
      </Tabs>


      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={projectId}
        task={editingTask}
        members={memberProfiles}
      />

      {openTask && (
        <TaskDetailDialog
          task={openTask}
          onOpenChange={o => !o && setOpenTask(null)}
          members={memberProfiles}
        />
      )}

      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Üye ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Kullanıcı</Label>
              <Select value={newMemberId} onValueChange={setNewMemberId}>
                <SelectTrigger><SelectValue placeholder="Kullanıcı seç" /></SelectTrigger>
                <SelectContent>
                  {availableProfiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name ?? 'Kullanıcı'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddMember} disabled={!newMemberId || addMember.isPending} className="w-full">Ekle</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projeyi sil?</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem geri alınamaz. Tüm görevler ve yorumlar da silinir.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
