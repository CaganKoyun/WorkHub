-- ============================================================================
-- E2E fixtures — DO NOT RUN AGAINST PROD.
--
-- Creates one workspace with:
--   • 1 owner  (owner@e2e.test)
--   • 2 admin  (admin1@e2e.test, admin2@e2e.test)
--   • 2 member (member1@e2e.test, member2@e2e.test)
--   • 1 viewer (viewer@e2e.test)
-- Two projects, ten tasks with assignments, one chat channel + a couple
-- of messages, one decision. Enough surface for role-flow specs to
-- exercise assignment, comment, mention, visibility, and RLS.
--
-- All users share the password "TestPw!e2e2026" — keep this file out of
-- any DB you care about protecting; branch-preview / staging only.
--
-- Idempotent: safe to re-run. Anything with a fixed uuid uses upsert
-- semantics via ON CONFLICT.
-- ============================================================================

DO $$
DECLARE
  _pw text := 'TestPw!e2e2026';
  _hashed text := crypt(_pw, gen_salt('bf'));
  _ws uuid := '11111111-1111-1111-1111-111111111111';

  -- Deterministic user uuids so re-runs keep the same rows.
  _u_owner   uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  _u_admin1  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  _u_admin2  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';
  _u_member1 uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  _u_member2 uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc2';
  _u_viewer  uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  _proj1 uuid := 'eeeeeeee-1111-eeee-1111-eeeeeeeeeeee';
  _proj2 uuid := 'eeeeeeee-2222-eeee-2222-eeeeeeeeeeee';

  _rows record;
  _users_json jsonb := jsonb_build_array(
    jsonb_build_object('id', _u_owner,   'email', 'owner@e2e.test',   'name', 'Ece Owner'),
    jsonb_build_object('id', _u_admin1,  'email', 'admin1@e2e.test',  'name', 'Ali Admin'),
    jsonb_build_object('id', _u_admin2,  'email', 'admin2@e2e.test',  'name', 'Ayşe Admin'),
    jsonb_build_object('id', _u_member1, 'email', 'member1@e2e.test', 'name', 'Mert Member'),
    jsonb_build_object('id', _u_member2, 'email', 'member2@e2e.test', 'name', 'Melis Member'),
    jsonb_build_object('id', _u_viewer,  'email', 'viewer@e2e.test',  'name', 'Veli Viewer')
  );
BEGIN
  -- ----- auth.users -----
  FOR _rows IN SELECT * FROM jsonb_to_recordset(_users_json) AS x(id uuid, email text, name text)
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token,
      recovery_token, email_change_token_new, email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', _rows.id, 'authenticated', 'authenticated',
      _rows.email, _hashed,
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', _rows.name),
      '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      updated_at = now();

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    VALUES (
      _rows.id::text, _rows.id,
      jsonb_build_object('sub', _rows.id::text, 'email', _rows.email, 'email_verified', true),
      'email', now(), now(), now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;

    -- profiles is auto-inserted by a trigger on auth.users in this project;
    -- upsert a display name for anything the trigger left null.
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (_rows.id, _rows.name)
    ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;
  END LOOP;

  -- ----- workspace -----
  INSERT INTO public.workspaces (id, name, slug, industry, size, country, default_currency, owner_id, trial_ends_at)
  VALUES (_ws, 'E2E Test Corp', 'e2e-test-corp', 'SaaS', '11-50', 'Turkey', 'USD', _u_owner, now() + interval '90 days')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, slug = EXCLUDED.slug, owner_id = EXCLUDED.owner_id;

  INSERT INTO public.workspace_onboarding (workspace_id, finished_at, enabled_modules)
  VALUES (_ws, now(), ARRAY['work','crm','finance','people','goals'])
  ON CONFLICT (workspace_id) DO UPDATE SET finished_at = now();

  PERFORM public.seed_default_permissions(_ws);

  -- ----- workspace_members -----
  INSERT INTO public.workspace_members (workspace_id, user_id, role, is_active)
  VALUES
    (_ws, _u_owner,   'owner',   true),
    (_ws, _u_admin1,  'admin',   true),
    (_ws, _u_admin2,  'admin',   true),
    (_ws, _u_member1, 'member',  true),
    (_ws, _u_member2, 'member',  true),
    (_ws, _u_viewer,  'viewer',  true)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, is_active = true;

  INSERT INTO public.user_active_workspace (user_id, workspace_id)
  SELECT id::uuid, _ws FROM jsonb_to_recordset(_users_json) AS x(id uuid, email text, name text)
  ON CONFLICT (user_id) DO UPDATE SET workspace_id = _ws, updated_at = now();

  -- Impersonate the owner for the rest of the seed so triggers that read
  -- auth.uid() / current_workspace_id() have something to work with. Set
  -- both `sub` (legacy) and full `claims` JSON so any auth.uid() impl works.
  PERFORM set_config('request.jwt.claim.sub', _u_owner::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _u_owner::text, 'email', 'owner@e2e.test')::text, true);

  -- ----- projects -----
  INSERT INTO public.projects (id, workspace_id, name, description, status, priority, owner_id, created_by, start_date, end_date, color)
  VALUES
    (_proj1, _ws, 'Growth Q3', 'Q3 growth workstream — landing + pricing.', 'active', 'high',   _u_owner,  _u_owner, current_date - 14, current_date + 60, '#5E6AD2'),
    (_proj2, _ws, 'Platform Debt', 'RLS audit + migration reliability + storage cleanup.', 'active', 'medium', _u_admin1, _u_admin1, current_date - 7,  current_date + 30, '#C6F84F')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    status = EXCLUDED.status, priority = EXCLUDED.priority;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES
    (_proj1, _u_owner, 'owner'),
    (_proj1, _u_admin1, 'member'),
    (_proj1, _u_member1, 'member'),
    (_proj2, _u_admin1, 'owner'),
    (_proj2, _u_admin2, 'member'),
    (_proj2, _u_member2, 'member')
  ON CONFLICT DO NOTHING;

  -- ----- tasks (10) -----
  INSERT INTO public.tasks (workspace_id, project_id, title, description, status, priority, assignee_id, reporter_id, position, tags)
  VALUES
    (_ws, _proj1, 'Ship pricing page rewrite',           'Update copy + add lime CTA block.',          'in_progress', 'high',    _u_member1, _u_owner,  1, ARRAY['landing','copy']),
    (_ws, _proj1, 'Wire Stripe checkout',                 'Test mode first, live behind flag.',         'todo',        'high',    _u_admin1,  _u_owner,  2, ARRAY['billing']),
    (_ws, _proj1, 'A/B test hero headline',               'Two variants, GrowthBook flag.',             'backlog',     'medium',  _u_member1, _u_owner,  3, ARRAY['experiment']),
    (_ws, _proj1, 'SEO audit landing',                    'Lighthouse + meta tags.',                    'review',      'medium',  _u_admin2,  _u_owner,  4, ARRAY['seo','landing']),
    (_ws, _proj1, 'Draft press release',                  'Coordinate with PR agency.',                 'todo',        'low',     NULL,       _u_owner,  5, ARRAY['pr']),
    (_ws, _proj2, 'Pin search_path on definer funcs',     'Advisor warnings, 10 funcs.',                'in_progress', 'high',    _u_admin1,  _u_admin1, 1, ARRAY['security','db']),
    (_ws, _proj2, 'Add task_attachments preview',         'Image inline + PDF viewer.',                 'todo',        'medium',  _u_member2, _u_admin1, 2, ARRAY['storage']),
    (_ws, _proj2, 'Migrate email_queue to jsonb payload', 'Structured body for template swaps.',        'backlog',     'low',     _u_admin2,  _u_admin1, 3, ARRAY['email']),
    (_ws, _proj2, 'Cover RLS with test matrix',           'Owner vs member vs viewer for every table.', 'in_progress', 'urgent',  _u_admin1,  _u_admin1, 4, ARRAY['security','test']),
    (_ws, _proj2, 'Purge orphan attachments',             'Cron edge fn.',                              'done',        'low',     _u_member2, _u_admin1, 5, ARRAY['cleanup'])
  ON CONFLICT DO NOTHING;

  -- ----- one chat channel with two messages -----
  INSERT INTO public.chat_channels (id, workspace_id, name, slug, description, created_by)
  VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', _ws, 'general', 'general', 'Whole workspace.', _u_owner)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.chat_messages (workspace_id, channel_id, author_id, body)
  SELECT _ws, 'ffffffff-ffff-ffff-ffff-ffffffffffff', _u_owner,   'Hoş geldiniz — bugün pricing sayfası merged.'
   WHERE NOT EXISTS (SELECT 1 FROM public.chat_messages WHERE channel_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff');
  INSERT INTO public.chat_messages (workspace_id, channel_id, author_id, body)
  SELECT _ws, 'ffffffff-ffff-ffff-ffff-ffffffffffff', _u_admin1,  'RLS audit'' ilk turu bitti; 10 fonksiyonda search_path uyarısı var.'
   WHERE (SELECT count(*) FROM public.chat_messages WHERE channel_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff') < 2;

  -- ----- one seed decision so /decisions has something on it -----
  INSERT INTO public.decisions (workspace_id, title, status, created_by)
  SELECT _ws, 'Stripe test-mode first, sonra live', 'proposed', _u_owner
   WHERE NOT EXISTS (SELECT 1 FROM public.decisions WHERE workspace_id = _ws);
END $$;

-- ----- Sanity readback (comment out in prod) -----
SELECT 'users'   AS scope, count(*)::int FROM auth.users u WHERE u.email LIKE '%@e2e.test'
UNION ALL SELECT 'members', count(*)::int FROM public.workspace_members WHERE workspace_id = '11111111-1111-1111-1111-111111111111'
UNION ALL SELECT 'projects', count(*)::int FROM public.projects WHERE workspace_id = '11111111-1111-1111-1111-111111111111'
UNION ALL SELECT 'tasks',    count(*)::int FROM public.tasks    WHERE workspace_id = '11111111-1111-1111-1111-111111111111';
