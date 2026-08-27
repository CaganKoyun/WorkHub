-- Phase 10.6 — Workspace billing (display-only skeleton)
-- Adds a per-workspace billing row: plan tier + seat limit + Stripe pointers.
-- No seat-enforcement trigger; enforcement lives in the client + Stripe webhook
-- (out of scope here). Defaults every workspace to the free tier with 3 seats.

create table if not exists public.workspace_billing (
  workspace_id           uuid primary key references public.workspaces(id) on delete cascade,
  plan                   text not null default 'free', -- free | pro | business
  seat_limit             integer not null default 3,
  status                 text not null default 'active', -- active | past_due | canceled
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

alter table public.workspace_billing enable row level security;

drop policy if exists "workspace_billing readable by members"  on public.workspace_billing;
drop policy if exists "workspace_billing writable by admins"   on public.workspace_billing;

create policy "workspace_billing readable by members"
  on public.workspace_billing for select
  using (public.is_workspace_member(workspace_id, auth.uid()));

-- Client can toggle plan for demo/self-serve; production Stripe webhook
-- should replace this with service_role-only writes.
create policy "workspace_billing writable by admins"
  on public.workspace_billing for all
  using (public.is_workspace_admin(workspace_id, auth.uid()))
  with check (public.is_workspace_admin(workspace_id, auth.uid()));

-- Seed a free-tier row for every existing workspace.
insert into public.workspace_billing (workspace_id)
select id from public.workspaces
on conflict (workspace_id) do nothing;

-- Auto-seed on new workspace insert.
create or replace function public.seed_workspace_billing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspace_billing (workspace_id) values (NEW.id)
  on conflict (workspace_id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists trg_seed_workspace_billing on public.workspaces;
create trigger trg_seed_workspace_billing
  after insert on public.workspaces
  for each row execute function public.seed_workspace_billing();

-- Simple aggregate for the admin dashboard: seats used, storage bytes, etc.
create or replace function public.workspace_admin_summary(_ws uuid)
returns table (
  seats_used         integer,
  storage_bytes      bigint,
  automation_runs_24h integer,
  email_queue_pending integer
) language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.workspace_members
      where workspace_id = _ws and is_active = true),
    (select coalesce(sum(size_bytes), 0)::bigint from public.task_attachments
      where workspace_id = _ws),
    (select count(*)::int from public.automation_runs
      where workspace_id = _ws and created_at > now() - interval '24 hours'),
    (select count(*)::int from public.email_queue
      where user_id in (
        select user_id from public.workspace_members
         where workspace_id = _ws and is_active = true
      ) and status = 'pending')
$$;
