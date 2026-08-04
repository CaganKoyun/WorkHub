import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '@/lib/projects-hooks';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/projects-types';
import type { ProjectStatus, ProjectPriority } from '@/lib/projects-types';
import { useUserRole, canCreateProject } from '@/lib/user-role';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Calendar } from 'lucide-react';

export function ProjectsListView() {
  const { data: projects, isLoading } = useProjects();
  const { data: role } = useUserRole();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ProjectStatus>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | ProjectPriority>('all');

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Projeler</h1>
          <p className="text-sm text-muted-foreground">Ekip projelerini planla, takip et ve yönet</p>
        </div>
        {canCreateProject(role) && (
          <Link to="/projects/new">
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Yeni proje</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Proje ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(s => (
              <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={v => setFilterPriority(v as any)}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Öncelik" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm öncelikler</SelectItem>
            {(Object.keys(PRIORITY_LABELS) as ProjectPriority[]).map(p => (
              <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">Henüz proje yok</p>
          {canCreateProject(role) && (
            <Link to="/projects/new" className="mt-3">
              <Button variant="outline" size="sm">İlk projeni oluştur</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`}>
              <Card className="p-4 h-full hover:border-primary transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded flex items-center justify-center text-lg shrink-0" style={{ background: (p.color ?? '#6366f1') + '30' }}>
                      {p.icon ?? '📁'}
                    </div>
                    <h3 className="font-semibold truncate">{p.name}</h3>
                  </div>
                </div>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge className={`text-xs border ${PROJECT_STATUS_COLORS[p.status]}`}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
                  <Badge className={`text-xs border ${PRIORITY_COLORS[p.priority]}`}>{PRIORITY_LABELS[p.priority]}</Badge>
                </div>
                {(p.start_date || p.end_date) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{p.start_date ?? '—'} → {p.end_date ?? '—'}</span>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
