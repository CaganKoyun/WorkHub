-- Invitation → email_queue bridge.
-- When a workspace_invitations row is inserted (bulk-invite from onboarding
-- CSV, or single Teams-page invite), enqueue a magic-link email pointing at
-- /invite/:token. The send-email Edge Function (Phase 10.4) picks it up.

create or replace function public.enqueue_invitation_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _ws_name text;
  _inviter text;
  _base    text;
  _subject text;
  _body    text;
  _link    text;
begin
  -- Site URL is stored on workspace or falls back to the platform default.
  -- Prefer an env-style config row if you have one; otherwise a sensible default.
  select coalesce(
           (select value from public.company_settings where key = 'site_url' limit 1),
           'https://work-hub-nine-henna.vercel.app'
         ) into _base;

  select name into _ws_name from public.workspaces where id = NEW.workspace_id;
  select coalesce(full_name, 'Bir yönetici') into _inviter
    from public.profiles where user_id = NEW.invited_by;

  _link    := _base || '/invite/' || NEW.token;
  _subject := coalesce(_ws_name, 'WorkHub') || ' seni davet ediyor';
  _body    := _inviter || E' seni ' || coalesce(_ws_name, 'workspace') ||
              E'\'a davet etti (rol: ' || NEW.role || E').\n\n' ||
              'Aşağıdaki bağlantıya tıkla, hesabın yoksa yeni açılır:' ||
              E'\n\n' || _link || E'\n\n' ||
              'Bağlantı 14 gün geçerli.';

  insert into public.email_queue (user_id, to_email, subject, body, link, kind)
  values (null, NEW.email, _subject, _body, _link, 'workspace_invitation');

  return NEW;
end;
$$;

drop trigger if exists trg_enqueue_invitation_email on public.workspace_invitations;
create trigger trg_enqueue_invitation_email
  after insert on public.workspace_invitations
  for each row execute function public.enqueue_invitation_email();

-- Guard: company_settings may not exist yet; make the function safe by wrapping.
-- (If your project doesn't have it, the coalesce falls straight to the default.)
