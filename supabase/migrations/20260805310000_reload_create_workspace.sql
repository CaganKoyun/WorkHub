-- Fix — "Could not find the function public.create_workspace(...)" surfaced
-- during onboarding.
--
-- Root cause on some Supabase projects: the 20260728113849 migration that
-- originally created public.create_workspace was applied before PostgREST
-- had refreshed its schema cache; the cache then never picked the new
-- signature up. Re-declaring the function here is idempotent (CREATE OR
-- REPLACE) and the NOTIFY at the bottom forces PostgREST to reload.

create or replace function public.create_workspace(
  _name     text,
  _slug     text default null,
  _industry text default null,
  _size     text default null,
  _country  text default null,
  _currency text default 'USD'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_slug text;
  v_id   uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  v_slug := coalesce(nullif(_slug, ''),
                     regexp_replace(lower(_name), '[^a-z0-9]+', '-', 'g'));
  if exists (select 1 from public.workspaces where slug = v_slug) then
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  end if;

  insert into public.workspaces
    (name, slug, industry, size, country, default_currency, owner_id, trial_ends_at)
  values
    (_name, v_slug, _industry, _size, _country, coalesce(_currency, 'USD'), v_uid, now() + interval '30 days')
  returning id into v_id;

  insert into public.workspace_members (workspace_id, user_id, role, is_active)
  values (v_id, v_uid, 'owner', true);

  insert into public.workspace_onboarding (workspace_id) values (v_id);

  perform public.seed_default_permissions(v_id);

  insert into public.user_active_workspace (user_id, workspace_id)
  values (v_uid, v_id)
  on conflict (user_id) do update set workspace_id = excluded.workspace_id, updated_at = now();

  return v_id;
end;
$$;

grant execute on function public.create_workspace(text, text, text, text, text, text) to authenticated;

-- Force PostgREST to reload; without this the schema cache can keep serving
-- the old (missing) definition for several minutes on hosted Supabase.
notify pgrst, 'reload schema';
