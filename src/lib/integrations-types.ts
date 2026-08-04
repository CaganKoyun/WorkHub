export type IntegrationDomain =
  | "crm" | "revenue" | "comms" | "inbox" | "tasks" | "product"
  | "bugs" | "dev" | "docs" | "goals" | "finance" | "support"
  | "assets" | "projects" | "custom";

export type CatalogEntry = {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string | null;
  icon: string | null;
  auth_type: "oauth" | "apikey" | "mcp" | "none";
  mcp_url: string | null;
  docs_url: string | null;
  domains: string[];
  featured: boolean;
};

export type ConnectionState = "ready" | "authenticating" | "failed";
export type ConnectionScope = "workspace" | "personal";

export type WorkspaceConnection = {
  id: string;
  catalog_key: string | null;
  display_name: string;
  scope: ConnectionScope;
  owner_user_id: string | null;
  state: ConnectionState;
  auth_url: string | null;
  mcp_url: string;
  transport: "http" | "sse";
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type McpTool = {
  connection_id: string;
  connection_name: string;
  catalog_key: string | null;
  name: string;
  description?: string;
  input_schema?: unknown;
};
