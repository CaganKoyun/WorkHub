-- Referral tracking table
create table if not exists public.referrals (
  id          uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  referrer_id  uuid not null references auth.users(id) on delete cascade,
  code         text not null unique,
  referred_email text,
  referred_user_id uuid references auth.users(id),
  status       text not null default 'pending'
               check (status in ('pending','signed_up','activated','rewarded')),
  reward_type  text,
  reward_granted_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_referrals_workspace on public.referrals(workspace_id);
create index if not exists idx_referrals_code on public.referrals(code);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

alter table public.referrals enable row level security;

create policy "Members can view own workspace referrals"
  on public.referrals for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Authenticated users can create referrals"
  on public.referrals for insert
  with check (referrer_id = auth.uid());

create policy "Referrer can update own referrals"
  on public.referrals for update
  using (referrer_id = auth.uid());
