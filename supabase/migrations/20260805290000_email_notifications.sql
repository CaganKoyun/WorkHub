-- Phase 10.4 — Email notifications
-- Adds a per-user preference table and an outbound email_queue.
-- On every INSERT into public.notifications we consult the sender's
-- preferences; if email is enabled for that `kind` (or default),
-- we drop a row into email_queue for the Edge Function to send.

-- ---------------------------------------------------------------
-- Preferences
-- ---------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id    uuid    references auth.users(id) on delete cascade,
  kind       text    not null,   -- '*' = default for all kinds
  email      boolean not null default true,
  in_app     boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notif_prefs select own" on public.notification_preferences;
drop policy if exists "notif_prefs upsert own" on public.notification_preferences;

create policy "notif_prefs select own"
  on public.notification_preferences for select
  using (user_id = auth.uid());

create policy "notif_prefs upsert own"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------
-- Outbound email queue
-- ---------------------------------------------------------------
create table if not exists public.email_queue (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  to_email    text not null,
  subject     text not null,
  body        text not null,        -- plain text; sender may wrap it in a template
  link        text,
  kind        text,
  status      text not null default 'pending',   -- pending | sent | error
  error       text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_email_queue_pending
  on public.email_queue(created_at) where status = 'pending';

alter table public.email_queue enable row level security;

drop policy if exists "email_queue select own" on public.email_queue;

create policy "email_queue select own"
  on public.email_queue for select
  using (user_id = auth.uid());
-- Only service_role writes / updates. No INSERT/UPDATE/DELETE policies
-- for authenticated (the trigger below runs as SECURITY DEFINER).

-- ---------------------------------------------------------------
-- Trigger: notifications → email_queue
-- ---------------------------------------------------------------
create or replace function public.enqueue_notification_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _email text;
  _pref  public.notification_preferences%rowtype;
begin
  select email into _email from auth.users where id = NEW.user_id;
  if _email is null then return NEW; end if;

  -- Kind-specific preference wins; fall back to '*'; default = true.
  select * into _pref from public.notification_preferences
    where user_id = NEW.user_id and kind = NEW.kind;
  if not found then
    select * into _pref from public.notification_preferences
      where user_id = NEW.user_id and kind = '*';
  end if;
  if found and coalesce(_pref.email, true) = false then
    return NEW;
  end if;

  insert into public.email_queue (user_id, to_email, subject, body, link, kind)
  values (NEW.user_id, _email, NEW.title, coalesce(NEW.body, ''), NEW.link, NEW.kind);
  return NEW;
end;
$$;

drop trigger if exists trg_enqueue_notification_email on public.notifications;
create trigger trg_enqueue_notification_email
  after insert on public.notifications
  for each row execute function public.enqueue_notification_email();

do $$ begin
  alter publication supabase_realtime add table public.notification_preferences;
exception when duplicate_object then null;
end $$;
