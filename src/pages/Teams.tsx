import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useTeams, useCreateTeam,
  useWorkspaceMembers, useUpdateMemberRole, useDeactivateMember, useAssignMemberToTeam,
  useWorkspaceInvitations, useCreateInvitation, useRevokeInvitation,
} from '@/lib/teams-hooks';
import {
  ROLE_LABELS, ROLE_ORDER,
  type WorkspaceRole, type WorkspaceMember,
} from '@/lib/teams-types';
import { useAllProfiles } from '@/lib/projects-hooks';
import { useWorkspacePermission } from '@/hooks/useWorkspacePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Users as UsersIcon, Mail, X, UserMinus, Crown,
  ChevronDown, ChevronUp, Briefcase, Calendar, FolderOpen,
  Sparkles, Linkedin, FileText, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Demo employee details (UI-only, not in DB)                        */
/* ------------------------------------------------------------------ */

interface EmployeeDetails {
  department: string;
  position: string;
  startDate: string;
  projects: string;
  skills: string;
  linkedin: string;
  notes: string;
  salary: string;
}

const DEMO_DETAILS: Record<string, EmployeeDetails> = {};

function getDemoDetails(userId: string, name: string): EmployeeDetails {
  if (DEMO_DETAILS[userId]) return DEMO_DETAILS[userId];

  const departments = ['Muhendislik', 'Tasarim', 'Pazarlama', 'Urun', 'Finans', 'Insan Kaynaklari'];
  const positions = ['Kidemli Yazilim Muhendisi', 'Urun Yoneticisi', 'UI/UX Tasarimci', 'Veri Analisti', 'Proje Yoneticisi', 'DevOps Muhendisi'];
  const skillSets = [
    'React, TypeScript, Node.js, PostgreSQL',
    'Figma, Adobe XD, CSS, Design Systems',
    'Python, Data Analysis, SQL, Tableau',
    'Project Management, Agile, Scrum',
    'AWS, Docker, Kubernetes, CI/CD',
    'Marketing, SEO, Analytics, Content Strategy',
  ];
  const projectSets = [
    'WorkHub Platform, Musteri Portali, API Gateway',
    'Mobil Uygulama v2, Dashboard Yeniden Tasarim',
    'Veri Pipeline, Raporlama Modulu',
    'E-ticaret Entegrasyonu, Odeme Sistemi',
  ];

  const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = <T,>(arr: T[]) => arr[hash % arr.length];

  const detail: EmployeeDetails = {
    department: pick(departments),
    position: pick(positions),
    startDate: `202${(hash % 4) + 1}-${String((hash % 12) + 1).padStart(2, '0')}-${String((hash % 28) + 1).padStart(2, '0')}`,
    projects: pick(projectSets),
    skills: pick(skillSets),
    linkedin: `https://linkedin.com/in/${(name ?? 'user').toLowerCase().replace(/\s+/g, '-')}`,
    notes: '',
    salary: '',
  };
  DEMO_DETAILS[userId] = detail;
  return detail;
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                              */
/* ------------------------------------------------------------------ */

type TabKey = 'teams' | 'members' | 'invitations';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'teams', label: 'Ekipler' },
  { key: 'members', label: 'Uyeler' },
  { key: 'invitations', label: 'Davetler' },
];

/* ------------------------------------------------------------------ */
/*  Team Create Dialog                                                */
/* ------------------------------------------------------------------ */

function TeamCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateTeam();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10b981');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined, color });
      toast.success('Ekip olusturuldu');
      setName(''); setDescription('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Yeni ekip</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Ad</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Engineering, Design, Sales..." autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Aciklama</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ekip ne yapar?" />
          </div>
          <div className="space-y-2">
            <Label>Renk</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-12 rounded border border-border bg-transparent cursor-pointer" />
              <span className="font-mono text-[11px] text-muted-foreground">{color}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending}>Olustur</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Iptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Invite Dialog                                                     */
/* ------------------------------------------------------------------ */

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invite = useCreateInvitation();
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = emails.split(/[,\s\n]+/).map(x => x.trim()).filter(Boolean);
    if (list.length === 0) return;
    try {
      let ok = 0;
      for (const email of list) {
        try { await invite.mutateAsync({ email, role }); ok++; } catch {/* skip */}
      }
      toast.success(`${ok} davet gonderildi`);
      setEmails('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Davet gonder</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>E-posta(lar)</Label>
            <Textarea rows={4} value={emails} onChange={e => setEmails(e.target.value)} placeholder="ali@sirket.com&#10;ayse@sirket.com&#10;mehmet@sirket.com" />
            <p className="text-[11px] text-muted-foreground">Virgul, bosluk veya satir ile ayir.</p>
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={v => setRole(v as WorkspaceRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_ORDER.filter(r => r !== 'owner').map(r => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={invite.isPending}>Davet gonder</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Iptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Role badge                                                        */
/* ------------------------------------------------------------------ */

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  admin: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  manager: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  member: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  viewer: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  guest: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
};

function RoleBadge({ role }: { role: WorkspaceRole }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
      ROLE_COLORS[role],
    )}>
      {role === 'owner' && <Crown className="mr-0.5 h-2.5 w-2.5" />}
      {ROLE_LABELS[role]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Member Card (expanded profile with employee details)              */
/* ------------------------------------------------------------------ */

function MemberCard({
  member, profileMap, teams,
}: {
  member: WorkspaceMember;
  profileMap: Map<string, { name: string | null; avatar: string | null }>;
  teams: { id: string; name: string; color: string }[];
}) {
  const updateRole = useUpdateMemberRole();
  const assignTeam = useAssignMemberToTeam();
  const deactivate = useDeactivateMember();
  const [expanded, setExpanded] = useState(false);

  const profile = profileMap.get(member.user_id);
  const name = profile?.name ?? 'Kullanici';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const team = teams.find(t => t.id === member.team_id);
  const details = getDemoDetails(member.user_id, name);

  return (
    <div className="border-b border-border/60 last:border-b-0">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent/30 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold truncate">{name}</span>
            <RoleBadge role={member.role} />
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {member.job_title && (
              <span className="text-[11px] text-muted-foreground truncate">{member.job_title}</span>
            )}
            {team && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: team.color }} />
                <span className="truncate">{team.name}</span>
              </span>
            )}
            <span className="text-[11px] text-muted-foreground truncate">{details.department}</span>
          </div>
        </div>

        {/* Controls */}
        <Select
          value={member.team_id ?? 'none'}
          onValueChange={(v) => {
            assignTeam.mutate({ member_id: member.id, team_id: v === 'none' ? null : v });
          }}
        >
          <SelectTrigger className="w-32 h-7 text-[11px]" onClick={e => e.stopPropagation()}>
            {team ? (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: team.color }} />
                <span className="truncate">{team.name}</span>
              </div>
            ) : <span className="text-muted-foreground">Ekip yok</span>}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ekip yok</SelectItem>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={member.role}
          onValueChange={(v) => updateRole.mutate({ id: member.id, role: v as WorkspaceRole })}
          disabled={member.role === 'owner'}
        >
          <SelectTrigger className="w-24 h-7 text-[11px]" onClick={e => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_ORDER.map(r => (
              <SelectItem key={r} value={r} disabled={r === 'owner' && member.role !== 'owner'}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100 shrink-0"
          disabled={member.role === 'owner'}
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`${name} workspace'ten cikar?`)) {
              deactivate.mutate(member.id);
            }
          }}
          title="Kullaniciyi cikar"
        >
          <UserMinus className="h-3.5 w-3.5" />
        </Button>

        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </div>

      {/* Expanded profile details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 ml-12 border-t border-border/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-3">
            <DetailRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Departman" value={details.department} />
            <DetailRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Pozisyon" value={details.position} />
            <DetailRow
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Ise Baslama Tarihi"
              value={format(new Date(details.startDate), 'dd MMM yyyy')}
            />
            <DetailRow
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Katilim Tarihi"
              value={format(new Date(member.joined_at), 'dd MMM yyyy')}
            />
            <DetailRow icon={<FolderOpen className="h-3.5 w-3.5" />} label="Projeler" value={details.projects} />
            <DetailRow icon={<Sparkles className="h-3.5 w-3.5" />} label="Beceriler" value={details.skills} />
            <DetailRow
              icon={<Linkedin className="h-3.5 w-3.5" />}
              label="LinkedIn"
              value={
                <a href={details.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                  {details.linkedin}
                </a>
              }
            />
            {details.notes && (
              <DetailRow icon={<FileText className="h-3.5 w-3.5" />} label="Notlar" value={details.notes} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-[12.5px] text-foreground mt-0.5 break-words">{value || '-'}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function Teams() {
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: members } = useWorkspaceMembers();
  const { data: profiles } = useAllProfiles();
  const { data: invitations } = useWorkspaceInvitations();
  const revoke = useRevokeInvitation();
  const [teamOpen, setTeamOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('teams');
  const [memberSearch, setMemberSearch] = useState('');
  const canManage = useWorkspacePermission("admin", "manage");

  const profileMap = useMemo(
    () => new Map((profiles ?? []).map(p => [p.user_id, { name: p.full_name, avatar: p.avatar_url }])),
    [profiles],
  );

  const teamCounts = useMemo(() => {
    const map = new Map<string, number>();
    (members ?? []).forEach(m => {
      if (m.team_id) map.set(m.team_id, (map.get(m.team_id) ?? 0) + 1);
    });
    return map;
  }, [members]);

  const pendingInvites = (invitations ?? []).filter(i => i.status === 'pending');

  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return members ?? [];
    return (members ?? []).filter(m => {
      const p = profileMap.get(m.user_id);
      const name = (p?.name ?? '').toLowerCase();
      const dept = (m.department ?? '').toLowerCase();
      const title = (m.job_title ?? '').toLowerCase();
      return name.includes(q) || dept.includes(q) || title.includes(q);
    });
  }, [members, memberSearch, profileMap]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Ekipler & Calisanlar</h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Ekipleri organize et, calisan profillerini goruntule, uye rollerini yonet.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="h-8 gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Davet
            </Button>
            <Button size="sm" onClick={() => setTeamOpen(true)} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Yeni ekip
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px',
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            {t.label}
            {t.key === 'invitations' && pendingInvites.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1">
                {pendingInvites.length}
              </span>
            )}
            {t.key === 'members' && members && (
              <span className="ml-1.5 text-[11px] text-muted-foreground font-mono">{members.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Ekipler */}
      {tab === 'teams' && (
        <section>
          {teamsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (teams?.length ?? 0) === 0 ? (
            <div className="rounded-md border border-border/60 py-10 text-center text-[13px] text-muted-foreground">
              Henuz ekip yok. "Yeni ekip" ile basla.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(teams ?? []).map(t => {
                const count = teamCounts.get(t.id) ?? 0;
                const teamMembers = (members ?? []).filter(m => m.team_id === t.id).slice(0, 5);
                return (
                  <Link
                    key={t.id}
                    to={`/teams/${t.id}`}
                    className="group rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-border"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                      <h3 className="text-[14px] font-semibold text-foreground truncate">{t.name}</h3>
                    </div>
                    {t.description && (
                      <p className="text-[12px] text-muted-foreground line-clamp-2">{t.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <UsersIcon className="h-3 w-3" />
                        <span className="tabular-nums">{count} uye</span>
                      </div>
                      {/* Stacked avatars */}
                      {teamMembers.length > 0 && (
                        <div className="flex -space-x-1.5">
                          {teamMembers.map(m => {
                            const p = profileMap.get(m.user_id);
                            const ini = (p?.name ?? '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                            return (
                              <Avatar key={m.id} className="h-5 w-5 border-2 border-card">
                                <AvatarFallback className="bg-sidebar-accent text-[8px] font-semibold text-sidebar-accent-foreground">
                                  {ini}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })}
                          {count > 5 && (
                            <span className="flex items-center justify-center h-5 w-5 rounded-full border-2 border-card bg-muted text-[8px] font-semibold text-muted-foreground">
                              +{count - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tab: Uyeler (Members / Employees combined) */}
      {tab === 'members' && (
        <section className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Isim, departman veya unvan ile ara..."
              className="pl-9 h-8 text-[13px]"
            />
          </div>

          <div className="rounded-md border border-border/60 overflow-hidden">
            {filteredMembers.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                {memberSearch ? 'Sonuc bulunamadi.' : 'Uye yok.'}
              </p>
            ) : (
              filteredMembers.map(m => (
                <MemberCard key={m.id} member={m} profileMap={profileMap} teams={teams ?? []} />
              ))
            )}
          </div>
        </section>
      )}

      {/* Tab: Davetler (Invitations) */}
      {tab === 'invitations' && (
        <section>
          {pendingInvites.length === 0 ? (
            <div className="rounded-md border border-border/60 py-10 text-center text-[13px] text-muted-foreground">
              Bekleyen davet yok.
            </div>
          ) : (
            <div className="rounded-md border border-border/60 overflow-hidden">
              {pendingInvites.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0 hover:bg-sidebar-accent/30">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium truncate block">{inv.email}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(inv.expires_at), 'dd MMM yyyy')} tarihinde sona erer
                    </span>
                  </div>
                  <RoleBadge role={inv.role} />
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100 shrink-0"
                    onClick={() => revoke.mutate(inv.id)}
                    title="Iptal et"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <TeamCreateDialog open={teamOpen} onOpenChange={setTeamOpen} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
