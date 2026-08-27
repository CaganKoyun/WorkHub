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
import { EmptyState } from '@/components/EmptyState';
import { Plus, Users as UsersIcon, Mail, X, UserMinus, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DomainWorkspace } from "@/components/DomainWorkspace";

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
      toast.success('Ekip oluşturuldu');
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
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Mühendislik, Tasarım, Satış…" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Açıklama</Label>
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
            <Button type="submit" disabled={create.isPending}>Oluştur</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
      toast.success(`${ok} davet gönderildi`);
      setEmails('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Davet gönder</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>E-posta(lar)</Label>
            <Textarea rows={4} value={emails} onChange={e => setEmails(e.target.value)} placeholder="ali@sirket.com&#10;ayse@sirket.com&#10;mehmet@sirket.com" />
            <p className="text-[11px] text-muted-foreground">Virgül, boşluk veya satır ile ayır.</p>
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
            <Button type="submit" disabled={invite.isPending}>Davet gönder</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({
  member, profileMap, teams, canManage,
}: {
  member: WorkspaceMember;
  profileMap: Map<string, { name: string | null; avatar: string | null }>;
  teams: { id: string; name: string; color: string }[];
  canManage: boolean;
}) {
  const updateRole = useUpdateMemberRole();
  const assignTeam = useAssignMemberToTeam();
  const deactivate = useDeactivateMember();
  const profile = profileMap.get(member.user_id);
  const initials = (profile?.name ?? '?')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const team = teams.find(t => t.id === member.team_id);

  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2 hover:bg-sidebar-accent/30 last:border-b-0">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="bg-sidebar-accent text-[10px] font-semibold text-sidebar-accent-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium truncate">{profile?.name ?? 'Kullanıcı'}</span>
          {member.role === 'owner' && <Crown className="h-3 w-3 text-warning" />}
        </div>
        {member.job_title && <div className="text-[11px] text-muted-foreground truncate">{member.job_title}</div>}
      </div>
      <Select
        value={member.team_id ?? 'none'}
        onValueChange={(v) => assignTeam.mutate({ member_id: member.id, team_id: v === 'none' ? null : v })}
        disabled={!canManage}
      >
        <SelectTrigger className="w-36 h-7 text-[11.5px]">
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
        disabled={!canManage || member.role === 'owner'}
      >
        <SelectTrigger className="w-28 h-7 text-[11.5px]">
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
        variant="ghost" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100"
        disabled={!canManage || member.role === 'owner'}
        onClick={() => {
          if (confirm(`${profile?.name ?? 'kullanıcıyı'} workspace'ten çıkar?`)) {
            deactivate.mutate(member.id);
          }
        }}
        title="Kullanıcıyı çıkar"
      >
        <UserMinus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function Teams() {
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: members } = useWorkspaceMembers();
  const { data: profiles } = useAllProfiles();
  const { data: invitations } = useWorkspaceInvitations();
  const revoke = useRevokeInvitation();
  const [teamOpen, setTeamOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
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

  return (
    <DomainWorkspace
      domain="company"
      title="Takımlar"
      subtitle="Ekipleri organize et, üye rollerini yönet, yeni kullanıcıları davet et."
      showAgent={false}
      maxWidth="max-w-5xl"
      headerActions={canManage ? (
        <>
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="h-8 gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Davet
          </Button>
          <Button size="sm" onClick={() => setTeamOpen(true)} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Yeni ekip
          </Button>
        </>
      ) : undefined}
    >
      {/* Teams grid */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <UsersIcon className="h-3 w-3" /> Ekipler
        </h2>
        {teamsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (teams?.length ?? 0) === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Henuz ekip yok"
            description="Ekipleri organize etmek icin ilk ekibinizi olusturun."
            action={{ label: "Yeni ekip", onClick: () => setTeamOpen(true) }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(teams ?? []).map(t => (
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
                <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <UsersIcon className="h-3 w-3" />
                  <span className="tabular-nums">{teamCounts.get(t.id) ?? 0} üye</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Members */}
      <section>
        <h2 className="mb-2 flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Çalışma alanı üyeleri</span>
          <span className="font-mono normal-case tabular-nums text-muted-foreground/70">{members?.length ?? 0}</span>
        </h2>
        <div className="rounded-md border border-border/60 overflow-hidden">
          {(members ?? []).map(m => (
            <MemberRow key={m.id} member={m} profileMap={profileMap} teams={teams ?? []} canManage={canManage} />
          ))}
          {(members?.length ?? 0) === 0 && (
            <p className="py-8 text-center text-[13px] text-muted-foreground">Üye yok.</p>
          )}
        </div>
      </section>

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Bekleyen davetler</span>
            <span className="font-mono normal-case tabular-nums text-muted-foreground/70">{pendingInvites.length}</span>
          </h2>
          <div className="rounded-md border border-border/60 overflow-hidden">
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 border-b border-border/60 px-4 py-2 last:border-b-0">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate text-[13px] font-medium">{inv.email}</span>
                <span className={cn(
                  "text-[11px] rounded border px-1.5 py-0.5 uppercase tracking-wider",
                  "border-border bg-secondary/40 text-muted-foreground",
                )}>{ROLE_LABELS[inv.role]}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {format(new Date(inv.expires_at), 'd MMM', { locale: tr })} sona erer
                </span>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6 opacity-60 hover:opacity-100"
                  onClick={() => revoke.mutate(inv.id)}
                  title="İptal et"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <TeamCreateDialog open={teamOpen} onOpenChange={setTeamOpen} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </DomainWorkspace>
  );
}
