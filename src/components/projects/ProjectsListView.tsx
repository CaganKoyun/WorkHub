import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '@/lib/projects-hooks';
import { useWorkspaceIssues } from '@/lib/tasks-hooks';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/projects-types';
import type { ProjectStatus, ProjectPriority, Project } from '@/lib/projects-types';
import { useWorkspacePermission } from '@/hooks/useWorkspacePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, Search, Calendar, FolderOpen, CheckCircle2, AlertTriangle,
  LayoutGrid, List, ClipboardList, Clock, User, Activity,
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

export function ProjectsListView() {
  const { data: projects, isLoading } = useProjects();
  const { data: tasks } = useWorkspaceIssues();
  const canCreate = useWorkspacePermission('projects', 'create');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ProjectStatus>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | ProjectPriority>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Task counts per project
  const taskStats = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    for (const t of tasks ?? []) {
      if (!t.project_id) continue;
      if (!map[t.project_id]) map[t.project_id] = { total: 0, done: 0 };
      map[t.project_id].total++;
      if (t.status === 'done') map[t.project_id].done++;
    }
    return map;
  }, [tasks]);

  // Stats
  const stats = useMemo(() => {
    const all = projects ?? [];
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: all.length,
      active: all.filter(p => p.status === 'active').length,
      completed: all.filter(p => p.status === 'completed').length,
      overdue: all.filter(p => p.end_date && p.end_date < today && p.status !== 'completed').length,
    };
  }, [projects]);

  const filtered = useMemo(() => {
    let r = projects ?? [];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') r = r.filter(p => p.status === filterStatus);
    if (filterPriority !== 'all') r = r.filter(p => p.priority === filterPriority);
    return r;
  }, [projects, search, filterStatus, filterPriority]);

  function getProgress(projectId: string) {
    const s = taskStats[projectId];
    if (!s || s.total === 0) return 0;
    return Math.round((s.done / s.total) * 100);
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Projeler</h1>
          <p className="text-sm text-muted-foreground">Ekip projelerini planla, takip et ve yonet</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {canCreate && (
            <Link to="/projects/new">
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />Yeni proje</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <FolderOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Toplam proje</p>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-emerald-500/10">
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{stats.active}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aktif</p>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-500/10">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{stats.completed}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tamamlanan</p>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Geciken</p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Proje ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as 'all' | ProjectStatus)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum durumlar</SelectItem>
            {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(s => (
              <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={v => setFilterPriority(v as 'all' | ProjectPriority)}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Oncelik" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum oncelikler</SelectItem>
            {(Object.keys(PRIORITY_LABELS) as ProjectPriority[]).map(p => (
              <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">Henuz proje yok</p>
          {canCreate && (
            <Link to="/projects/new" className="mt-3">
              <Button variant="outline" size="sm">Ilk projeni olustur</Button>
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} taskStats={taskStats[p.id]} progress={getProgress(p.id)} formatDate={formatDate} />
          ))}
        </div>
      ) : (
        <ProjectTable projects={filtered} taskStats={taskStats} getProgress={getProgress} formatDate={formatDate} />
      )}
    </div>
  );
}

// --- Grid card ---

function ProjectCard({
  project: p,
  taskStats: ts,
  progress,
  formatDate,
}: {
  project: Project;
  taskStats?: { total: number; done: number };
  progress: number;
  formatDate: (d: string | null) => string;
}) {
  const total = ts?.total ?? 0;
  const done = ts?.done ?? 0;

  return (
    <Link to={`/projects/${p.id}`}>
      <Card className="p-4 h-full hover:border-primary transition-colors cursor-pointer space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{ background: (p.color ?? '#6366f1') + '30' }}
            >
              <FolderOpen className="h-4 w-4" style={{ color: p.color ?? '#6366f1' }} />
            </div>
            <h3 className="font-semibold truncate">{p.name}</h3>
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge className={`text-xs border ${PROJECT_STATUS_COLORS[p.status]}`}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
          <Badge className={`text-xs border ${PRIORITY_COLORS[p.priority]}`}>{PRIORITY_LABELS[p.priority]}</Badge>
        </div>

        {/* Progress bar + task count */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              {total} gorev
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          {total > 0 && (
            <p className="text-xs text-muted-foreground">{done} / {total} tamamlandi</p>
          )}
        </div>

        {/* Dates */}
        {(p.start_date || p.end_date) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(p.start_date)} &rarr; {formatDate(p.end_date)}</span>
          </div>
        )}

        {/* Owner + last updated */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          {p.owner_id ? (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Sorumlu atandi
            </span>
          ) : (
            <span className="flex items-center gap-1 opacity-50">
              <User className="h-3 w-3" />
              Sorumlu yok
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(p.updated_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </Card>
    </Link>
  );
}

// --- List / table view ---

function ProjectTable({
  projects,
  taskStats,
  getProgress,
  formatDate,
}: {
  projects: Project[];
  taskStats: Record<string, { total: number; done: number }>;
  getProgress: (id: string) => number;
  formatDate: (d: string | null) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proje</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Oncelik</TableHead>
            <TableHead>Gorevler</TableHead>
            <TableHead>Ilerleme</TableHead>
            <TableHead>Bitis</TableHead>
            <TableHead>Son guncelleme</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map(p => {
            const ts = taskStats[p.id];
            const total = ts?.total ?? 0;
            const done = ts?.done ?? 0;
            const progress = getProgress(p.id);

            return (
              <TableRow key={p.id} className="group">
                <TableCell>
                  <Link to={`/projects/${p.id}`} className="flex items-center gap-2 hover:underline font-medium">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                      style={{ background: (p.color ?? '#6366f1') + '30' }}
                    >
                      <FolderOpen className="h-3 w-3" style={{ color: p.color ?? '#6366f1' }} />
                    </div>
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs border ${PROJECT_STATUS_COLORS[p.status]}`}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs border ${PRIORITY_COLORS[p.priority]}`}>{PRIORITY_LABELS[p.priority]}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {done}/{total}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(p.end_date)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(p.updated_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
