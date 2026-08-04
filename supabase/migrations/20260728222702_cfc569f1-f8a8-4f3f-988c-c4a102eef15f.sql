
CREATE TABLE public.integrations_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  icon text,
  auth_type text NOT NULL DEFAULT 'oauth' CHECK (auth_type IN ('oauth','apikey','mcp','none')),
  mcp_url text,
  docs_url text,
  domains text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integrations_catalog TO anon, authenticated;
GRANT ALL ON public.integrations_catalog TO service_role;
ALTER TABLE public.integrations_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog readable by everyone" ON public.integrations_catalog FOR SELECT USING (true);

CREATE TABLE public.workspace_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  catalog_key text,
  display_name text NOT NULL,
  scope text NOT NULL DEFAULT 'workspace' CHECK (scope IN ('workspace','personal')),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'authenticating' CHECK (state IN ('ready','authenticating','failed')),
  auth_url text,
  mcp_url text NOT NULL,
  transport text NOT NULL DEFAULT 'http' CHECK (transport IN ('http','sse')),
  oauth_tokens jsonb,
  dcr_client jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_requires_owner CHECK (scope <> 'personal' OR owner_user_id IS NOT NULL)
);
CREATE INDEX ON public.workspace_connections (workspace_id);
CREATE INDEX ON public.workspace_connections (owner_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_connections TO authenticated;
GRANT ALL ON public.workspace_connections TO service_role;
ALTER TABLE public.workspace_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read workspace or own personal connections"
  ON public.workspace_connections FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (scope = 'workspace' OR owner_user_id = auth.uid())
  );

CREATE POLICY "insert personal by self, workspace by admin"
  ON public.workspace_connections FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      (scope = 'personal' AND owner_user_id = auth.uid())
      OR (scope = 'workspace' AND public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'))
    )
  );

CREATE POLICY "update own or workspace by admin"
  ON public.workspace_connections FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      (scope = 'personal' AND owner_user_id = auth.uid())
      OR (scope = 'workspace' AND public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'))
    )
  );

CREATE POLICY "delete own or workspace by admin"
  ON public.workspace_connections FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      (scope = 'personal' AND owner_user_id = auth.uid())
      OR (scope = 'workspace' AND public.workspace_role(workspace_id, auth.uid()) IN ('owner','admin'))
    )
  );

CREATE TRIGGER workspace_connections_touch
  BEFORE UPDATE ON public.workspace_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  transport text NOT NULL DEFAULT 'http' CHECK (transport IN ('http','sse')),
  oauth_tokens jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_mcp_servers (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_mcp_servers TO authenticated;
GRANT ALL ON public.user_mcp_servers TO service_role;
ALTER TABLE public.user_mcp_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own mcp servers" ON public.user_mcp_servers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER user_mcp_servers_touch
  BEFORE UPDATE ON public.user_mcp_servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.integrations_catalog (key, name, category, description, icon, auth_type, mcp_url, docs_url, domains, featured) VALUES
  ('hubspot',       'HubSpot',         'crm',      'Sync contacts, deals and pipeline with HubSpot CRM.',            '🎯', 'oauth', 'https://mcp.hubspot.com/mcp',                   'https://developers.hubspot.com/mcp', ARRAY['crm','revenue'], true),
  ('salesforce',    'Salesforce',      'crm',      'Read and update Salesforce leads, opportunities and accounts.',   '☁️', 'oauth', NULL,                                            'https://developer.salesforce.com',   ARRAY['crm','revenue'], true),
  ('slack',         'Slack',           'comms',    'Send messages, read channels, run workflows in Slack.',           '💬', 'oauth', 'https://mcp.slack.com/mcp',                     'https://api.slack.com/docs/mcp',     ARRAY['comms','inbox','tasks'], true),
  ('linear',        'Linear',          'dev',      'Manage issues, cycles and projects in Linear.',                   '📐', 'oauth', 'https://mcp.linear.app/sse',                    'https://linear.app/developers/mcp',  ARRAY['product','tasks','bugs'], true),
  ('notion',        'Notion',          'docs',     'Search and edit Notion pages and databases.',                     '📓', 'oauth', 'https://mcp.notion.com/mcp',                    'https://developers.notion.com/mcp',  ARRAY['docs','product','goals'], true),
  ('github',        'GitHub',          'dev',      'Read repos, issues and PRs from GitHub.',                         '🐙', 'oauth', 'https://api.githubcopilot.com/mcp',             'https://github.com/github/github-mcp-server', ARRAY['product','bugs','dev'], true),
  ('google_drive',  'Google Drive',    'storage',  'Search and read files from Google Drive.',                        '📁', 'oauth', NULL,                                            'https://developers.google.com/drive', ARRAY['docs','assets'], false),
  ('google_calendar','Google Calendar','comms',    'Read and create Google Calendar events.',                         '📅', 'oauth', NULL,                                            'https://developers.google.com/calendar', ARRAY['comms','tasks'], false),
  ('gmail',         'Gmail',           'comms',    'Send and read Gmail messages.',                                   '✉️', 'oauth', NULL,                                            'https://developers.google.com/gmail', ARRAY['comms','inbox'], false),
  ('stripe',        'Stripe',          'finance',  'Read customers, invoices and payments from Stripe.',              '💳', 'oauth', 'https://mcp.stripe.com',                        'https://docs.stripe.com/mcp',        ARRAY['finance','revenue'], true),
  ('figma',         'Figma',           'product',  'Read Figma files and designs.',                                   '🎨', 'oauth', NULL,                                            'https://www.figma.com/developers/api', ARRAY['product'], false),
  ('intercom',      'Intercom',        'support',  'Read conversations and users from Intercom.',                     '💭', 'oauth', 'https://mcp.intercom.com/mcp',                  'https://developers.intercom.com/mcp', ARRAY['support','crm'], false),
  ('sentry',        'Sentry',          'dev',      'Read Sentry issues, releases and events.',                        '🔺', 'oauth', 'https://mcp.sentry.dev/mcp',                    'https://docs.sentry.io/product/sentry-mcp/', ARRAY['bugs','product'], false),
  ('asana',         'Asana',           'tasks',    'Read and update Asana tasks and projects.',                       '✅', 'oauth', NULL,                                            'https://developers.asana.com',       ARRAY['tasks','projects'], false),
  ('custom_mcp',    'Custom MCP',      'custom',   'Connect any Model Context Protocol server by URL.',                '🔌', 'mcp',   NULL,                                            'https://modelcontextprotocol.io',    ARRAY['custom'], true);
