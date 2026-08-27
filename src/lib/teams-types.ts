export type WorkspaceRole =
  | 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'guest';

export type InvitationStatus =
  | 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Team {
  id: string;
  workspace_id: string;
  department_id: string | null;
  name: string;
  description: string | null;
  lead_user_id: string | null;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  team_id: string | null;
  department: string | null;
  department_id: string | null;
  job_title: string | null;
  is_active: boolean;
  joined_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  token: string;
  expires_at: string;
  invited_by: string;
  created_at: string;
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
  guest: 'Guest',
};

export const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  owner: 'Tam yetki — workspace silme, plan, faturalama',
  admin: 'Kullanıcı ve modül yönetimi',
  manager: 'Proje ve ekip yönetimi',
  member: 'Görev, karar, kayıt oluşturma / düzenleme',
  viewer: 'Sadece okuma',
  guest: 'Belirli projelere sınırlı erişim',
};

export const ROLE_ORDER: WorkspaceRole[] = ['owner', 'admin', 'manager', 'member', 'viewer', 'guest'];
