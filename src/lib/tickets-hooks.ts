import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type TicketStatus =
  | 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  workspace_id: string;
  tracking_id: string;
  subject: string;
  body: string;
  requester_name: string | null;
  requester_email: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: string | null;
  sla_due_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  submitter_ip: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  workspace_id: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Açık',
  in_progress: 'İşleniyor',
  waiting: 'Bekliyor',
  resolved: 'Çözüldü',
  closed: 'Kapalı',
};

export const TICKET_STATUS_ORDER: TicketStatus[] = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Düşük', medium: 'Orta', high: 'Yüksek', urgent: 'Acil',
};

/** Hours-per-priority mirror of the DB trigger — only used for UI hints. */
export const TICKET_SLA_HOURS: Record<TicketPriority, number> = {
  urgent: 4, high: 24, medium: 48, low: 72,
};

export function useTickets(filters?: {
  status?: TicketStatus | 'all';
  assignedToMe?: boolean;
}) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tickets', currentWorkspace?.id, filters],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<Ticket[]> => {
      let q = supabase.from('tickets').select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.assignedToMe && user) q = q.eq('assignee_id', user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Ticket[];
    },
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    enabled: !!id,
    queryFn: async (): Promise<Ticket | null> => {
      const { data, error } = await supabase
        .from('tickets').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as Ticket | null;
    },
  });
}

export function useTicketReplies(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-replies', ticketId],
    enabled: !!ticketId,
    queryFn: async (): Promise<TicketReply[]> => {
      const { data, error } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TicketReply[];
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Ticket> & { id: string }) => {
      const { data, error } = await supabase
        .from('tickets').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as Ticket;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', t.id] });
    },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tickets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useAddReply() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { ticket_id: string; workspace_id: string; body: string; is_internal?: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: input.ticket_id,
          workspace_id: input.workspace_id,
          author_id: user.id,
          body: input.body,
          is_internal: input.is_internal ?? false,
        })
        .select().single();
      if (error) throw error;
      return data as TicketReply;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ticket-replies', r.ticket_id] });
      qc.invalidateQueries({ queryKey: ['ticket', r.ticket_id] });
    },
  });
}

/** Public form-style submit used by /support/:workspaceId. Anon-safe. */
export function useSubmitTicket() {
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string; subject: string; body: string;
      requester_email: string; requester_name?: string;
      priority?: TicketPriority;
    }) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          workspace_id: input.workspace_id,
          tracking_id: '',
          subject: input.subject,
          body: input.body,
          requester_email: input.requester_email,
          requester_name: input.requester_name ?? null,
          priority: input.priority ?? 'medium',
        })
        .select().single();
      if (error) throw error;
      return data as Ticket;
    },
  });
}
