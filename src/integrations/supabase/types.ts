export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          bug_id: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          action: string
          bug_id: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
          workspace_id?: string
        }
        Update: {
          action?: string
          bug_id?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          amount: number | null
          assigned_to: string | null
          context: Json
          created_at: string
          currency: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          due_at: string | null
          id: string
          kind: Database["public"]["Enums"]["approval_kind"]
          priority: Database["public"]["Enums"]["approval_priority"]
          requested_by: string | null
          resource_id: string | null
          resource_type: string | null
          snooze_until: string | null
          status: Database["public"]["Enums"]["approval_status"]
          summary: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number | null
          assigned_to?: string | null
          context?: Json
          created_at?: string
          currency?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          due_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["approval_kind"]
          priority?: Database["public"]["Enums"]["approval_priority"]
          requested_by?: string | null
          resource_id?: string | null
          resource_type?: string | null
          snooze_until?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          summary?: string | null
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          amount?: number | null
          assigned_to?: string | null
          context?: Json
          created_at?: string
          currency?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          due_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["approval_kind"]
          priority?: Database["public"]["Enums"]["approval_priority"]
          requested_by?: string | null
          resource_id?: string | null
          resource_type?: string | null
          snooze_until?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_assignments: {
        Row: {
          asset_id: string
          assigned_date: string
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          returned_date: string | null
          workspace_id: string
        }
        Insert: {
          asset_id: string
          assigned_date?: string
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          returned_date?: string | null
          workspace_id?: string
        }
        Update: {
          asset_id?: string
          assigned_date?: string
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          returned_date?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          created_at: string
          default_useful_life_years: number
          id: string
          name: string
          residual_value_percent: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_useful_life_years?: number
          id?: string
          name: string
          residual_value_percent?: number
          workspace_id?: string
        }
        Update: {
          created_at?: string
          default_useful_life_years?: number
          id?: string
          name?: string
          residual_value_percent?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category_id: string | null
          condition: Database["public"]["Enums"]["asset_condition"]
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean
          location: string | null
          name: string
          notes: string | null
          purchase_cost: number
          purchase_date: string
          residual_value_percent: number
          serial_number: string | null
          updated_at: string
          useful_life_years: number
          workspace_id: string
        }
        Insert: {
          category_id?: string | null
          condition?: Database["public"]["Enums"]["asset_condition"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          location?: string | null
          name: string
          notes?: string | null
          purchase_cost?: number
          purchase_date: string
          residual_value_percent?: number
          serial_number?: string | null
          updated_at?: string
          useful_life_years?: number
          workspace_id?: string
        }
        Update: {
          category_id?: string | null
          condition?: Database["public"]["Enums"]["asset_condition"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          location?: string | null
          name?: string
          notes?: string | null
          purchase_cost?: number
          purchase_date?: string
          residual_value_percent?: number
          serial_number?: string | null
          updated_at?: string
          useful_life_years?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          bug_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          bug_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          user_id: string
          workspace_id?: string
        }
        Update: {
          bug_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bugs: {
        Row: {
          actual_behavior: string | null
          assignee_id: string | null
          created_at: string
          description: string
          environment: string | null
          expected_behavior: string | null
          id: string
          project_id: string | null
          reporter_id: string
          severity: Database["public"]["Enums"]["bug_severity"]
          sla_deadline: string | null
          status: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce: string | null
          title: string
          tracking_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actual_behavior?: string | null
          assignee_id?: string | null
          created_at?: string
          description?: string
          environment?: string | null
          expected_behavior?: string | null
          id?: string
          project_id?: string | null
          reporter_id: string
          severity?: Database["public"]["Enums"]["bug_severity"]
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce?: string | null
          title: string
          tracking_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          actual_behavior?: string | null
          assignee_id?: string | null
          created_at?: string
          description?: string
          environment?: string | null
          expected_behavior?: string | null
          id?: string
          project_id?: string | null
          reporter_id?: string
          severity?: Database["public"]["Enums"]["bug_severity"]
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce?: string | null
          title?: string
          tracking_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bugs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bugs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_functions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_functions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          bug_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          bug_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          workspace_id?: string
        }
        Update: {
          bug_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          company_logo_url: string | null
          company_name: string
          company_size: string | null
          company_website: string | null
          created_at: string
          id: string
          industry: string | null
          phone: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          address?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string
        }
        Update: {
          address?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          body: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          kind: Database["public"]["Enums"]["crm_activity_kind"]
          occurred_at: string
          opportunity_id: string | null
          outcome: string | null
          performed_by: string | null
          source_record_id: string | null
          source_system: string | null
          subject: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["crm_activity_kind"]
          occurred_at?: string
          opportunity_id?: string | null
          outcome?: string | null
          performed_by?: string | null
          source_record_id?: string | null
          source_system?: string | null
          subject: string
          workspace_id?: string
        }
        Update: {
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["crm_activity_kind"]
          occurred_at?: string
          opportunity_id?: string | null
          outcome?: string | null
          performed_by?: string | null
          source_record_id?: string | null
          source_system?: string | null
          subject?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          address: string | null
          annual_revenue: number | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          domain: string | null
          employee_count: number | null
          health: Database["public"]["Enums"]["crm_customer_health"] | null
          id: string
          industry: string | null
          is_archived: boolean
          legal_name: string | null
          lifecycle: Database["public"]["Enums"]["crm_lifecycle"]
          name: string
          owner_id: string | null
          phone: string | null
          source: string | null
          source_record_id: string | null
          source_system: string | null
          tags: string[]
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          annual_revenue?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          health?: Database["public"]["Enums"]["crm_customer_health"] | null
          id?: string
          industry?: string | null
          is_archived?: boolean
          legal_name?: string | null
          lifecycle?: Database["public"]["Enums"]["crm_lifecycle"]
          name: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          source_record_id?: string | null
          source_system?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Update: {
          address?: string | null
          annual_revenue?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          health?: Database["public"]["Enums"]["crm_customer_health"] | null
          id?: string
          industry?: string | null
          is_archived?: boolean
          legal_name?: string | null
          lifecycle?: Database["public"]["Enums"]["crm_lifecycle"]
          name?: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          source_record_id?: string | null
          source_system?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_decision_maker: boolean
          is_primary: boolean
          last_name: string | null
          lifecycle: Database["public"]["Enums"]["crm_lifecycle"]
          linkedin_url: string | null
          owner_id: string | null
          phone: string | null
          seniority: string | null
          source: string | null
          source_record_id: string | null
          source_system: string | null
          tags: string[]
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          last_name?: string | null
          lifecycle?: Database["public"]["Enums"]["crm_lifecycle"]
          linkedin_url?: string | null
          owner_id?: string | null
          phone?: string | null
          seniority?: string | null
          source?: string | null
          source_record_id?: string | null
          source_system?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          last_name?: string | null
          lifecycle?: Database["public"]["Enums"]["crm_lifecycle"]
          linkedin_url?: string | null
          owner_id?: string | null
          phone?: string | null
          seniority?: string | null
          source?: string | null
          source_record_id?: string | null
          source_system?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contracts: {
        Row: {
          approval_history: Json
          auto_renew: boolean
          company_id: string | null
          contract_number: string
          counterparty_email: string | null
          counterparty_name: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          end_date: string | null
          esign_url: string | null
          file_url: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          owner_id: string | null
          renewal_date: string | null
          renewal_notice_days: number | null
          risky_clauses: string | null
          signed_at: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["crm_contract_status"]
          terminated_at: string | null
          termination_reason: string | null
          title: string
          updated_at: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          approval_history?: Json
          auto_renew?: boolean
          company_id?: string | null
          contract_number: string
          counterparty_email?: string | null
          counterparty_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          esign_url?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          renewal_date?: string | null
          renewal_notice_days?: number | null
          risky_clauses?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["crm_contract_status"]
          terminated_at?: string | null
          termination_reason?: string | null
          title: string
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Update: {
          approval_history?: Json
          auto_renew?: boolean
          company_id?: string | null
          contract_number?: string
          counterparty_email?: string | null
          counterparty_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          esign_url?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          renewal_date?: string | null
          renewal_notice_days?: number | null
          risky_clauses?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["crm_contract_status"]
          terminated_at?: string | null
          termination_reason?: string | null
          title?: string
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contracts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_customers: {
        Row: {
          am_owner_id: string | null
          arr: number | null
          churn_reason: string | null
          churned_at: string | null
          company_id: string | null
          created_at: string
          cs_owner_id: string | null
          currency: string | null
          health: Database["public"]["Enums"]["crm_customer_health"]
          health_score: number | null
          health_updated_at: string | null
          id: string
          last_contact_at: string | null
          mrr: number | null
          notes: string | null
          nps: number | null
          nps_updated_at: string | null
          onboarded_at: string
          renewal_date: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          am_owner_id?: string | null
          arr?: number | null
          churn_reason?: string | null
          churned_at?: string | null
          company_id?: string | null
          created_at?: string
          cs_owner_id?: string | null
          currency?: string | null
          health?: Database["public"]["Enums"]["crm_customer_health"]
          health_score?: number | null
          health_updated_at?: string | null
          id?: string
          last_contact_at?: string | null
          mrr?: number | null
          notes?: string | null
          nps?: number | null
          nps_updated_at?: string | null
          onboarded_at?: string
          renewal_date?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          am_owner_id?: string | null
          arr?: number | null
          churn_reason?: string | null
          churned_at?: string | null
          company_id?: string | null
          created_at?: string
          cs_owner_id?: string | null
          currency?: string | null
          health?: Database["public"]["Enums"]["crm_customer_health"]
          health_score?: number | null
          health_updated_at?: string | null
          id?: string
          last_contact_at?: string | null
          mrr?: number | null
          notes?: string | null
          nps?: number | null
          nps_updated_at?: string | null
          onboarded_at?: string
          renewal_date?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          actual_close_date: string | null
          amount: number
          amount_base: number | null
          campaign: string | null
          company_id: string | null
          competitor: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          expected_close_date: string | null
          forecast_category: Database["public"]["Enums"]["crm_forecast_category"]
          fx_rate: number | null
          id: string
          last_activity_at: string | null
          lost_reason: string | null
          name: string
          next_action: string | null
          next_action_date: string | null
          owner_id: string | null
          pipeline_id: string
          primary_contact_id: string | null
          probability: number | null
          source: string | null
          source_record_id: string | null
          source_system: string | null
          stage_entered_at: string
          stage_id: string
          status: Database["public"]["Enums"]["crm_opp_status"]
          tags: string[]
          updated_at: string
          won_reason: string | null
          workspace_id: string
        }
        Insert: {
          actual_close_date?: string | null
          amount?: number
          amount_base?: number | null
          campaign?: string | null
          company_id?: string | null
          competitor?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          forecast_category?: Database["public"]["Enums"]["crm_forecast_category"]
          fx_rate?: number | null
          id?: string
          last_activity_at?: string | null
          lost_reason?: string | null
          name: string
          next_action?: string | null
          next_action_date?: string | null
          owner_id?: string | null
          pipeline_id: string
          primary_contact_id?: string | null
          probability?: number | null
          source?: string | null
          source_record_id?: string | null
          source_system?: string | null
          stage_entered_at?: string
          stage_id: string
          status?: Database["public"]["Enums"]["crm_opp_status"]
          tags?: string[]
          updated_at?: string
          won_reason?: string | null
          workspace_id?: string
        }
        Update: {
          actual_close_date?: string | null
          amount?: number
          amount_base?: number | null
          campaign?: string | null
          company_id?: string | null
          competitor?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          forecast_category?: Database["public"]["Enums"]["crm_forecast_category"]
          fx_rate?: number | null
          id?: string
          last_activity_at?: string | null
          lost_reason?: string | null
          name?: string
          next_action?: string | null
          next_action_date?: string | null
          owner_id?: string | null
          pipeline_id?: string
          primary_contact_id?: string | null
          probability?: number | null
          source?: string | null
          source_record_id?: string | null
          source_system?: string | null
          stage_entered_at?: string
          stage_id?: string
          status?: Database["public"]["Enums"]["crm_opp_status"]
          tags?: string[]
          updated_at?: string
          won_reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          forecast_category: Database["public"]["Enums"]["crm_forecast_category"]
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          pipeline_id: string
          position: number
          probability: number
          sla_days: number | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          forecast_category?: Database["public"]["Enums"]["crm_forecast_category"]
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          pipeline_id: string
          position?: number
          probability?: number
          sla_days?: number | null
          workspace_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          forecast_category?: Database["public"]["Enums"]["crm_forecast_category"]
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          pipeline_id?: string
          position?: number
          probability?: number
          sla_days?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pipeline_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          is_archived: boolean
          is_default: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quote_items: {
        Row: {
          created_at: string
          description: string | null
          discount_pct: number
          id: string
          line_total: number
          name: string
          position: number
          quantity: number
          quote_id: string
          sku: string | null
          tax_pct: number
          unit_price: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_pct?: number
          id?: string
          line_total?: number
          name: string
          position?: number
          quantity?: number
          quote_id: string
          sku?: string | null
          tax_pct?: number
          unit_price?: number
          workspace_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_pct?: number
          id?: string
          line_total?: number
          name?: string
          position?: number
          quantity?: number
          quote_id?: string
          sku?: string | null
          tax_pct?: number
          unit_price?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "crm_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quote_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quotes: {
        Row: {
          accepted_at: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_amount: number
          discount_pct: number
          esign_url: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          owner_id: string | null
          pdf_url: string | null
          quote_number: string
          sent_at: string | null
          status: Database["public"]["Enums"]["crm_quote_status"]
          subtotal: number
          tax_amount: number
          tax_pct: number
          terms: string | null
          total: number
          updated_at: string
          valid_until: string | null
          version: number
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          discount_pct?: number
          esign_url?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          pdf_url?: string | null
          quote_number: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["crm_quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_pct?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
          workspace_id?: string
        }
        Update: {
          accepted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          discount_pct?: number
          esign_url?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          pdf_url?: string | null
          quote_number?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["crm_quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_pct?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_subscriptions: {
        Row: {
          arr: number | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          id: string
          mrr: number
          notes: string | null
          plan_name: string
          renewal_date: string | null
          seats: number | null
          source_record_id: string | null
          source_system: string | null
          start_date: string
          status: Database["public"]["Enums"]["crm_subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          arr?: number | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          id?: string
          mrr?: number
          notes?: string | null
          plan_name: string
          renewal_date?: string | null
          seats?: number | null
          source_record_id?: string | null
          source_system?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["crm_subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          arr?: number | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          id?: string
          mrr?: number
          notes?: string | null
          plan_name?: string
          renewal_date?: string | null
          seats?: number | null
          source_record_id?: string | null
          source_system?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["crm_subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_assumptions: {
        Row: {
          breached_at: string | null
          created_at: string
          created_by: string | null
          current_value: number | null
          decision_id: string
          id: string
          is_critical: boolean
          last_checked_at: string | null
          metric_key: string | null
          operator: string
          source: string | null
          statement: string
          status: Database["public"]["Enums"]["assumption_status"]
          threshold: number | null
          unit: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          breached_at?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          decision_id: string
          id?: string
          is_critical?: boolean
          last_checked_at?: string | null
          metric_key?: string | null
          operator?: string
          source?: string | null
          statement: string
          status?: Database["public"]["Enums"]["assumption_status"]
          threshold?: number | null
          unit?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          breached_at?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          decision_id?: string
          id?: string
          is_critical?: boolean
          last_checked_at?: string | null
          metric_key?: string | null
          operator?: string
          source?: string | null
          statement?: string
          status?: Database["public"]["Enums"]["assumption_status"]
          threshold?: number | null
          unit?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_assumptions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_events: {
        Row: {
          actor_id: string | null
          created_at: string
          decision_id: string
          event_type: string
          from_state: string | null
          id: string
          note: string | null
          payload: Json
          to_state: string | null
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          decision_id: string
          event_type: string
          from_state?: string | null
          id?: string
          note?: string | null
          payload?: Json
          to_state?: string | null
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          decision_id?: string
          event_type?: string
          from_state?: string | null
          id?: string
          note?: string | null
          payload?: Json
          to_state?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_events_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_options: {
        Row: {
          cost_amount: number | null
          created_at: string
          created_by: string | null
          decision_id: string
          expected_return: string | null
          id: string
          is_chosen: boolean
          label: string
          pros: string | null
          rejection_reason: string | null
          risks: string | null
          sort_order: number
          time_impact: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cost_amount?: number | null
          created_at?: string
          created_by?: string | null
          decision_id: string
          expected_return?: string | null
          id?: string
          is_chosen?: boolean
          label: string
          pros?: string | null
          rejection_reason?: string | null
          risks?: string | null
          sort_order?: number
          time_impact?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cost_amount?: number | null
          created_at?: string
          created_by?: string | null
          decision_id?: string
          expected_return?: string | null
          id?: string
          is_chosen?: boolean
          label?: string
          pros?: string | null
          rejection_reason?: string | null
          risks?: string | null
          sort_order?: number
          time_impact?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_options_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          acceptable_loss: string | null
          actual_outcome: string | null
          confidence: number | null
          context: string | null
          cost_of_delay_amount: number | null
          created_at: string
          created_by: string | null
          currency: string
          decide_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_type: string | null
          do_nothing_cost: string | null
          expected_outcome: string | null
          id: string
          impact_amount: number | null
          lesson: string | null
          lifecycle_state: Database["public"]["Enums"]["decision_lifecycle"]
          owner_id: string | null
          problem: string | null
          rationale: string | null
          reopen_reason: string | null
          reopened_at: string | null
          reversibility: string | null
          reversibility_note: string | null
          review_at: string | null
          reviewed_at: string | null
          source_approval_id: string | null
          state_snapshot: Json | null
          status: Database["public"]["Enums"]["decision_status"]
          success_metric: string | null
          target_value: number | null
          title: string
          updated_at: string
          verdict: string | null
          workspace_id: string
          worst_case: string | null
        }
        Insert: {
          acceptable_loss?: string | null
          actual_outcome?: string | null
          confidence?: number | null
          context?: string | null
          cost_of_delay_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          decide_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_type?: string | null
          do_nothing_cost?: string | null
          expected_outcome?: string | null
          id?: string
          impact_amount?: number | null
          lesson?: string | null
          lifecycle_state?: Database["public"]["Enums"]["decision_lifecycle"]
          owner_id?: string | null
          problem?: string | null
          rationale?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reversibility?: string | null
          reversibility_note?: string | null
          review_at?: string | null
          reviewed_at?: string | null
          source_approval_id?: string | null
          state_snapshot?: Json | null
          status?: Database["public"]["Enums"]["decision_status"]
          success_metric?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
          verdict?: string | null
          workspace_id?: string
          worst_case?: string | null
        }
        Update: {
          acceptable_loss?: string | null
          actual_outcome?: string | null
          confidence?: number | null
          context?: string | null
          cost_of_delay_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          decide_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_type?: string | null
          do_nothing_cost?: string | null
          expected_outcome?: string | null
          id?: string
          impact_amount?: number | null
          lesson?: string | null
          lifecycle_state?: Database["public"]["Enums"]["decision_lifecycle"]
          owner_id?: string | null
          problem?: string | null
          rationale?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reversibility?: string | null
          reversibility_note?: string | null
          review_at?: string | null
          reviewed_at?: string | null
          source_approval_id?: string | null
          state_snapshot?: Json | null
          status?: Database["public"]["Enums"]["decision_status"]
          success_metric?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
          verdict?: string | null
          workspace_id?: string
          worst_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          color: string | null
          created_at: string
          description: string | null
          head_user_id: string | null
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          parent_id: string | null
          position: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          code?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          head_user_id?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          parent_id?: string | null
          position?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          code?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          head_user_id?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string
          description: string | null
          effort: string | null
          id: string
          impact: string | null
          owner_id: string | null
          priority: string
          product_id: string | null
          status: string
          target_release_id: string | null
          title: string
          updated_at: string
          votes: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          effort?: string | null
          id?: string
          impact?: string | null
          owner_id?: string | null
          priority?: string
          product_id?: string | null
          status?: string
          target_release_id?: string | null
          title: string
          updated_at?: string
          votes?: number
          workspace_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          effort?: string | null
          id?: string
          impact?: string | null
          owner_id?: string | null
          priority?: string
          product_id?: string | null
          status?: string
          target_release_id?: string | null
          title?: string
          updated_at?: string
          votes?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "features_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "features_release_fk"
            columns: ["target_release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          body: string | null
          category: string | null
          created_at: string
          customer_id: string | null
          feature_id: string | null
          id: string
          product_id: string | null
          sentiment: string | null
          source: string
          status: string
          submitter_email: string | null
          submitter_name: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          created_at?: string
          customer_id?: string | null
          feature_id?: string | null
          id?: string
          product_id?: string | null
          sentiment?: string | null
          source?: string
          status?: string
          submitter_email?: string | null
          submitter_name?: string | null
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          body?: string | null
          category?: string | null
          created_at?: string
          customer_id?: string | null
          feature_id?: string | null
          id?: string
          product_id?: string | null
          sentiment?: string | null
          source?: string
          status?: string
          submitter_email?: string | null
          submitter_name?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          opening_balance: number
          opening_date: string
          type: Database["public"]["Enums"]["fin_account_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_archived?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          opening_date?: string
          type?: Database["public"]["Enums"]["fin_account_type"]
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          opening_date?: string
          type?: Database["public"]["Enums"]["fin_account_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_budgets: {
        Row: {
          alert_threshold_pct: number
          amount: number
          amount_base: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          department: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          period: Database["public"]["Enums"]["fin_budget_period"]
          period_end: string
          period_start: string
          project_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          alert_threshold_pct?: number
          amount: number
          amount_base?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          period?: Database["public"]["Enums"]["fin_budget_period"]
          period_end: string
          period_start: string
          project_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          alert_threshold_pct?: number
          amount?: number
          amount_base?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          period?: Database["public"]["Enums"]["fin_budget_period"]
          period_end?: string
          period_start?: string
          project_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_archived: boolean
          name: string
          parent_id: string | null
          txn_type: Database["public"]["Enums"]["fin_txn_type"]
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          parent_id?: string | null
          txn_type?: Database["public"]["Enums"]["fin_txn_type"]
          workspace_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          parent_id?: string | null
          txn_type?: Database["public"]["Enums"]["fin_txn_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_fx_rates: {
        Row: {
          created_at: string
          from_currency: string
          id: string
          rate: number
          rate_date: string
          source: string | null
          to_currency: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          from_currency: string
          id?: string
          rate: number
          rate_date?: string
          source?: string | null
          to_currency?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          from_currency?: string
          id?: string
          rate?: number
          rate_date?: string
          source?: string | null
          to_currency?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_fx_rates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_transactions: {
        Row: {
          account_id: string | null
          amount: number
          amount_base: number | null
          attachment_url: string | null
          category_id: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          crm_company_id: string | null
          crm_customer_id: string | null
          currency: string
          department: string | null
          description: string
          employee_id: string | null
          fx_date: string | null
          fx_rate: number | null
          id: string
          invoice_number: string | null
          is_recurring: boolean
          notes: string | null
          project_id: string | null
          recurring_interval: string | null
          status: Database["public"]["Enums"]["fin_txn_status"]
          tags: string[]
          txn_date: string
          type: Database["public"]["Enums"]["fin_txn_type"]
          updated_at: string
          vendor_name: string | null
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          amount_base?: number | null
          attachment_url?: string | null
          category_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          crm_customer_id?: string | null
          currency?: string
          department?: string | null
          description: string
          employee_id?: string | null
          fx_date?: string | null
          fx_rate?: number | null
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean
          notes?: string | null
          project_id?: string | null
          recurring_interval?: string | null
          status?: Database["public"]["Enums"]["fin_txn_status"]
          tags?: string[]
          txn_date?: string
          type: Database["public"]["Enums"]["fin_txn_type"]
          updated_at?: string
          vendor_name?: string | null
          workspace_id?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          amount_base?: number | null
          attachment_url?: string | null
          category_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          crm_customer_id?: string | null
          currency?: string
          department?: string | null
          description?: string
          employee_id?: string | null
          fx_date?: string | null
          fx_rate?: number | null
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean
          notes?: string | null
          project_id?: string | null
          recurring_interval?: string | null
          status?: Database["public"]["Enums"]["fin_txn_status"]
          tags?: string[]
          txn_date?: string
          type?: Database["public"]["Enums"]["fin_txn_type"]
          updated_at?: string
          vendor_name?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "crm_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_crm_customer_id_fkey"
            columns: ["crm_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number | null
          description: string | null
          end_date: string | null
          id: string
          owner_id: string | null
          parent_goal_id: string | null
          period: Database["public"]["Enums"]["goal_period"]
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          owner_id?: string | null
          parent_goal_id?: string | null
          period?: Database["public"]["Enums"]["goal_period"]
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          owner_id?: string | null
          parent_goal_id?: string | null
          period?: Database["public"]["Enums"]["goal_period"]
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          commander_id: string | null
          created_at: string
          detected_at: string | null
          id: string
          impact: string | null
          postmortem: string | null
          product_id: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: string
          started_at: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          commander_id?: string | null
          created_at?: string
          detected_at?: string | null
          id?: string
          impact?: string | null
          postmortem?: string | null
          product_id?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          started_at?: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          commander_id?: string | null
          created_at?: string
          detected_at?: string | null
          id?: string
          impact?: string | null
          postmortem?: string | null
          product_id?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          started_at?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations_catalog: {
        Row: {
          auth_type: string
          category: string
          created_at: string
          description: string | null
          docs_url: string | null
          domains: string[]
          featured: boolean
          icon: string | null
          id: string
          key: string
          mcp_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          auth_type?: string
          category: string
          created_at?: string
          description?: string | null
          docs_url?: string | null
          domains?: string[]
          featured?: boolean
          icon?: string | null
          id?: string
          key: string
          mcp_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          auth_type?: string
          category?: string
          created_at?: string
          description?: string | null
          docs_url?: string | null
          domains?: string[]
          featured?: boolean
          icon?: string | null
          id?: string
          key?: string
          mcp_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      job_titles: {
        Row: {
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          level: string | null
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          level?: string | null
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          level?: string | null
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_titles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_titles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_entities: {
        Row: {
          country: string | null
          created_at: string
          currency: string | null
          id: string
          is_primary: boolean
          legal_name: string | null
          name: string
          tax_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_primary?: boolean
          legal_name?: string | null
          name: string
          tax_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_primary?: boolean
          legal_name?: string | null
          name?: string
          tax_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_entities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_oauth_states: {
        Row: {
          authorization_endpoint: string
          client_id: string
          client_secret: string | null
          code_verifier: string
          connection_id: string
          created_at: string
          expires_at: string
          redirect_uri: string
          scope: string | null
          state: string
          token_endpoint: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          authorization_endpoint: string
          client_id: string
          client_secret?: string | null
          code_verifier: string
          connection_id: string
          created_at?: string
          expires_at?: string
          redirect_uri: string
          scope?: string | null
          state: string
          token_endpoint: string
          user_id: string
          workspace_id: string
        }
        Update: {
          authorization_endpoint?: string
          client_id?: string
          client_secret?: string | null
          code_verifier?: string
          connection_id?: string
          created_at?: string
          expires_at?: string
          redirect_uri?: string
          scope?: string | null
          state?: string
          token_endpoint?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_states_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "workspace_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      module_ownership: {
        Row: {
          created_at: string
          id: string
          module: string
          owner_department_id: string | null
          system_admin_user_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: string
          owner_department_id?: string | null
          system_admin_user_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          owner_department_id?: string | null
          system_admin_user_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_ownership_owner_department_id_fkey"
            columns: ["owner_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_ownership_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          daily_digest: boolean
          email_on_assignment: boolean
          email_on_comment: boolean
          email_on_new_bug: boolean
          email_on_sla_breach: boolean
          email_on_status_change: boolean
          id: string
          review_reminder: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_digest?: boolean
          email_on_assignment?: boolean
          email_on_comment?: boolean
          email_on_new_bug?: boolean
          email_on_sla_breach?: boolean
          email_on_status_change?: boolean
          id?: string
          review_reminder?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_digest?: boolean
          email_on_assignment?: boolean
          email_on_comment?: boolean
          email_on_new_bug?: boolean
          email_on_sla_breach?: boolean
          email_on_status_change?: boolean
          id?: string
          review_reminder?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
          workspace_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      object_links: {
        Row: {
          created_at: string
          created_by: string | null
          from_id: string
          from_type: string
          id: string
          link_kind: string
          note: string | null
          to_id: string
          to_type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_id: string
          from_type: string
          id?: string
          link_kind?: string
          note?: string | null
          to_id: string
          to_type: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_id?: string
          from_type?: string
          id?: string
          link_kind?: string
          note?: string | null
          to_id?: string
          to_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          permission_map: Json
          scope: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          permission_map?: Json
          scope?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permission_map?: Json
          scope?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_sets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string | null
          slug: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          slug?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          external_url: string | null
          id: string
          mime_type: string | null
          name: string
          project_id: string
          size_bytes: number | null
          source: string
          storage_path: string | null
          uploaded_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          size_bytes?: number | null
          source?: string
          storage_path?: string | null
          uploaded_by: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          size_bytes?: number | null
          source?: string
          storage_path?: string | null
          uploaded_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_member_role"]
          user_id: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          project_id: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          project_id: string
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          owner_id: string | null
          priority: Database["public"]["Enums"]["project_priority"]
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          changelog: string | null
          created_at: string
          id: string
          name: string | null
          notes: string | null
          owner_id: string | null
          product_id: string | null
          release_date: string | null
          released_at: string | null
          status: string
          updated_at: string
          version: string
          workspace_id: string
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          owner_id?: string | null
          product_id?: string | null
          release_date?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
          version: string
          workspace_id?: string
        }
        Update: {
          changelog?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          owner_id?: string | null
          product_id?: string | null
          release_date?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
          version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          impact: number
          level: Database["public"]["Enums"]["risk_level"]
          likelihood: number
          mitigation: string | null
          owner_id: string | null
          status: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact?: number
          level?: Database["public"]["Enums"]["risk_level"]
          likelihood?: number
          mitigation?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          impact?: number
          level?: Database["public"]["Enums"]["risk_level"]
          likelihood?: number
          mitigation?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["risk_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_events: {
        Row: {
          approval_id: string | null
          created_at: string
          id: string
          object_id: string
          rule_key: string
          workspace_id: string
        }
        Insert: {
          approval_id?: string | null
          created_at?: string
          id?: string
          object_id: string
          rule_key: string
          workspace_id: string
        }
        Update: {
          approval_id?: string | null
          created_at?: string
          id?: string
          object_id?: string
          rule_key?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_events_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_rules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          params: Json
          rule_key: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          params?: Json
          rule_key: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          params?: Json
          rule_key?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_value: string | null
          id: string
          task_id: string
          to_value: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          task_id: string
          to_value?: string | null
          workspace_id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          task_id?: string
          to_value?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          token_prefix: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          token_prefix: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          token_prefix?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      saved_views: {
        Row: {
          created_at: string
          description: string | null
          filters: Json
          group_by: string | null
          id: string
          is_shared: boolean
          name: string
          owner_id: string
          sort: Json
          target: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filters?: Json
          group_by?: string | null
          id?: string
          is_shared?: boolean
          name: string
          owner_id: string
          sort?: Json
          target: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filters?: Json
          group_by?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          owner_id?: string
          sort?: Json
          target?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      saved_view_favorites: {
        Row: {
          created_at: string
          user_id: string
          view_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          view_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          view_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          changed_keys: string[]
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          metadata: Json
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          changed_keys?: string[]
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          changed_keys?: string[]
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          workspace_id?: string
        }
        Relationships: []
      }
      meeting_notes: {
        Row: {
          action_items: Json
          created_at: string
          created_by: string | null
          id: string
          meeting_at: string
          project_id: string | null
          summary: string
          title: string
          transcript: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_items?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_at?: string
          project_id?: string | null
          summary?: string
          title?: string
          transcript?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action_items?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_at?: string
          project_id?: string | null
          summary?: string
          title?: string
          transcript?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          archived_at: string | null
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          owner_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      portfolio_projects: {
        Row: {
          created_at: string
          portfolio_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          portfolio_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          portfolio_id?: string
          project_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assignee_id: string | null
          body: string
          created_at: string
          first_response_at: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          requester_email: string | null
          requester_name: string | null
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          submitter_ip: string | null
          tracking_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          body?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requester_email?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          submitter_ip?: string | null
          tracking_id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          body?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requester_email?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          submitter_ip?: string | null
          tracking_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          workspace_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      whiteboards: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          elements: Json
          id: string
          name: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          elements?: Json
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          elements?: Json
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          id: string
          is_open: boolean
          is_public: boolean
          name: string
          slug: string
          submission_count: number
          submit_message: string
          target_kind: string
          target_project_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_open?: boolean
          is_public?: boolean
          name: string
          slug: string
          submission_count?: number
          submit_message?: string
          target_kind?: string
          target_project_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_open?: boolean
          is_public?: boolean
          name?: string
          slug?: string
          submission_count?: number
          submit_message?: string
          target_kind?: string
          target_project_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          submitter_email: string | null
          task_id: string | null
          values: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          submitter_email?: string | null
          task_id?: string | null
          values?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          submitter_email?: string | null
          task_id?: string | null
          values?: Json
          workspace_id?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          trigger: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          automation_id: string
          created_at: string
          detail: string | null
          id: string
          outcome: string
          task_id: string | null
          workspace_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          detail?: string | null
          id?: string
          outcome: string
          task_id?: string | null
          workspace_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          outcome?: string
          task_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_private: boolean
          name: string
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          author_id: string | null
          body: string
          channel_id: string
          created_at: string
          edited_at: string | null
          id: string
          mentions: string[]
          parent_id: string | null
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          channel_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: string[]
          parent_id?: string | null
          workspace_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          channel_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: string[]
          parent_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      docs: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          parent_id: string | null
          position: number
          title: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          parent_id?: string | null
          position?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          parent_id?: string | null
          position?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      custom_field_defs: {
        Row: {
          config: Json
          created_at: string
          entity_type: string
          id: string
          is_archived: boolean
          key: string
          kind: Database["public"]["Enums"]["custom_field_kind"]
          name: string
          position: number
          required: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          entity_type: string
          id?: string
          is_archived?: boolean
          key: string
          kind: Database["public"]["Enums"]["custom_field_kind"]
          name: string
          position?: number
          required?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          config?: Json
          created_at?: string
          entity_type?: string
          id?: string
          is_archived?: boolean
          key?: string
          kind?: Database["public"]["Enums"]["custom_field_kind"]
          name?: string
          position?: number
          required?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          created_at: string
          def_id: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
          updated_by: string | null
          value: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          def_id: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
          workspace_id?: string
        }
        Update: {
          created_at?: string
          def_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
          workspace_id?: string
        }
        Relationships: []
      }
      workflow_states: {
        Row: {
          category: Database["public"]["Enums"]["workflow_state_category"]
          color: string
          created_at: string
          id: string
          is_default: boolean
          key: string
          name: string
          position: number
          team_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["workflow_state_category"]
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          key: string
          name: string
          position?: number
          team_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["workflow_state_category"]
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          key?: string
          name?: string
          position?: number
          team_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      cycles: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          goal: string | null
          id: string
          name: string
          number: number
          start_date: string
          status: Database["public"]["Enums"]["cycle_status"]
          team_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          goal?: string | null
          id?: string
          name: string
          number?: number
          start_date: string
          status?: Database["public"]["Enums"]["cycle_status"]
          team_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          goal?: string | null
          id?: string
          name?: string
          number?: number
          start_date?: string
          status?: Database["public"]["Enums"]["cycle_status"]
          team_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          billable: boolean
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          note: string | null
          started_at: string
          task_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          billable?: boolean
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at?: string
          task_id: string
          user_id: string
          workspace_id?: string
        }
        Update: {
          billable?: boolean
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at?: string
          task_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          task_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          task_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          task_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          body: Json
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          body?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          body: Json
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          body?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          blocked_task_id: string
          blocking_task_id: string
          created_at: string
          created_by: string | null
          id: string
          workspace_id: string
        }
        Insert: {
          blocked_task_id: string
          blocking_task_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          workspace_id: string
        }
        Update: {
          blocked_task_id?: string
          blocking_task_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_blocking_task_id_fkey"
            columns: ["blocking_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_blocked_task_id_fkey"
            columns: ["blocked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          cycle_id: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          parent_task_id: string | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          recurrence: Json | null
          recurrence_count_completed: number
          recurrence_source_id: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["task_status"]
          story_points: number | null
          tags: string[]
          title: string
          tracking_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actual_hours?: number | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          recurrence?: Json | null
          recurrence_count_completed?: number
          recurrence_source_id?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["task_status"]
          story_points?: number | null
          tags?: string[]
          title: string
          tracking_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          actual_hours?: number | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          recurrence?: Json | null
          recurrence_count_completed?: number
          recurrence_source_id?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          story_points?: number | null
          tags?: string[]
          title?: string
          tracking_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          is_archived: boolean
          lead_user_id: string | null
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          lead_user_id?: string | null
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          lead_user_id?: string | null
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_active_workspace: {
        Row: {
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_active_workspace_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mcp_servers: {
        Row: {
          created_at: string
          id: string
          name: string
          oauth_tokens: Json | null
          transport: string
          updated_at: string
          url: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          oauth_tokens?: Json | null
          transport?: string
          updated_at?: string
          url: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          oauth_tokens?: Json | null
          transport?: string
          updated_at?: string
          url?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_mcp_servers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_sets: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          expires_at: string | null
          id: string
          permission_set_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          permission_set_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          permission_set_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_sets_permission_set_id_fkey"
            columns: ["permission_set_id"]
            isOneToOne: false
            referencedRelation: "permission_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_sets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_connections: {
        Row: {
          auth_url: string | null
          catalog_key: string | null
          created_at: string
          dcr_client: Json | null
          display_name: string
          error: string | null
          id: string
          mcp_url: string
          oauth_tokens: Json | null
          owner_user_id: string | null
          scope: string
          state: string
          transport: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auth_url?: string | null
          catalog_key?: string | null
          created_at?: string
          dcr_client?: Json | null
          display_name: string
          error?: string | null
          id?: string
          mcp_url: string
          oauth_tokens?: Json | null
          owner_user_id?: string | null
          scope?: string
          state?: string
          transport?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auth_url?: string | null
          catalog_key?: string | null
          created_at?: string
          dcr_client?: Json | null
          display_name?: string
          error?: string | null
          id?: string
          mcp_url?: string
          oauth_tokens?: Json | null
          owner_user_id?: string | null
          scope?: string
          state?: string
          transport?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          department: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          department?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          approval_currency: string | null
          approval_limit: number | null
          cost_center: string | null
          created_at: string
          department: string | null
          department_id: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          job_title: string | null
          job_title_id: string | null
          joined_at: string
          legal_entity_id: string | null
          manager_id: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          team_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          approval_currency?: string | null
          approval_limit?: number | null
          cost_center?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          job_title?: string | null
          job_title_id?: string | null
          joined_at?: string
          legal_entity_id?: string | null
          manager_id?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          team_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          approval_currency?: string | null
          approval_limit?: number | null
          cost_center?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          job_title?: string | null
          job_title_id?: string | null
          joined_at?: string
          legal_entity_id?: string | null
          manager_id?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          team_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_onboarding: {
        Row: {
          company_setup_done: boolean
          created_at: string
          enabled_modules: string[]
          finished_at: string | null
          modules_selected_done: boolean
          sample_data_seeded: boolean
          team_invited_done: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_setup_done?: boolean
          created_at?: string
          enabled_modules?: string[]
          finished_at?: string | null
          modules_selected_done?: boolean
          sample_data_seeded?: boolean
          team_invited_done?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_setup_done?: boolean
          created_at?: string
          enabled_modules?: string[]
          finished_at?: string | null
          modules_selected_done?: boolean
          sample_data_seeded?: boolean
          team_invited_done?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_onboarding_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          country: string | null
          created_at: string
          default_currency: string
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string
          plan: Database["public"]["Enums"]["workspace_plan"]
          size: string | null
          slug: string
          timezone: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          default_currency?: string
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          size?: string | null
          slug: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          default_currency?: string
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          size?: string | null
          slug?: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invitation: { Args: { _token: string }; Returns: string }
      build_company_snapshot: { Args: { _ws: string }; Returns: Json }
      can_create_projects: { Args: { _user_id: string }; Returns: boolean }
      create_workspace: {
        Args: {
          _country?: string
          _currency?: string
          _industry?: string
          _name: string
          _size?: string
          _slug?: string
        }
        Returns: string
      }
      current_workspace_id: { Args: never; Returns: string }
      cycle_progress: {
        Args: { _cycle_id: string }
        Returns: {
          total_tasks: number
          done_tasks: number
          total_points: number
          done_points: number
        }[]
      }
      time_task_totals: {
        Args: { _task_id: string }
        Returns: { user_id: string; total_seconds: number }[]
      }
      portfolio_rollup: {
        Args: { _portfolio_id: string }
        Returns: {
          project_id: string
          project_name: string
          project_status: string
          total_tasks: number
          done_tasks: number
          active_tasks: number
          overdue_tasks: number
          completion_pct: number
        }[]
      }
      audit_log_page: {
        Args: {
          _workspace_id: string
          _entity_type?: string
          _actor_id?: string
          _action_prefix?: string
          _limit?: number
          _offset?: number
        }
        Returns: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          changed_keys: string[]
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          metadata: Json
          workspace_id: string
        }[]
      }
      log_audit: {
        Args: {
          _workspace_id: string
          _action: string
          _entity_type: string
          _entity_id?: string
          _entity_label?: string
          _metadata?: Json
        }
        Returns: string
      }
      create_api_token: {
        Args: {
          _workspace_id: string
          _name: string
          _scopes?: string[]
          _expires_at?: string
        }
        Returns: { id: string; token: string }[]
      }
      revoke_api_token: {
        Args: { _token_id: string }
        Returns: boolean
      }
      verify_api_token: {
        Args: { _raw: string }
        Returns: { user_id: string; workspace_id: string; scopes: string[] }[]
      }
      fin_burn_rate: { Args: { _days?: number }; Returns: number }
      fin_cash_balance: { Args: never; Returns: number }
      fin_lookup_fx: {
        Args: { _date: string; _from: string; _to: string }
        Returns: number
      }
      get_team_members: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          job_title: string
          role: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_permission: {
        Args: {
          _action: string
          _module: string
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      seed_default_permissions: {
        Args: { _workspace_id: string }
        Returns: undefined
      }
      workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "manager"
      approval_kind:
        | "expense"
        | "hiring"
        | "contract"
        | "discount"
        | "budget_change"
        | "project_escalation"
        | "risk_acceptance"
        | "payment"
        | "time_off"
        | "general"
      approval_priority: "low" | "normal" | "high" | "urgent"
      approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "info_requested"
        | "delegated"
        | "snoozed"
        | "cancelled"
      asset_condition: "excellent" | "good" | "fair" | "poor" | "retired"
      assumption_status: "holding" | "at_risk" | "breached" | "unknown"
      bug_severity: "critical" | "high" | "medium" | "low"
      bug_status:
        | "new"
        | "assigned"
        | "in_progress"
        | "testing"
        | "resolved"
        | "closed"
      crm_activity_kind:
        | "call"
        | "email"
        | "meeting"
        | "note"
        | "task"
        | "whatsapp"
        | "demo"
        | "proposal_sent"
        | "contract_sent"
        | "other"
      crm_contract_status:
        | "draft"
        | "internal_review"
        | "counterparty_review"
        | "pending_approval"
        | "pending_signature"
        | "active"
        | "renewal"
        | "expired"
        | "terminated"
      crm_customer_health: "healthy" | "watch" | "at_risk" | "critical"
      crm_forecast_category:
        | "pipeline"
        | "best_case"
        | "commit"
        | "closed_won"
        | "closed_lost"
        | "omitted"
      crm_lifecycle:
        | "lead"
        | "prospect"
        | "customer"
        | "partner"
        | "vendor"
        | "churned"
      crm_opp_status: "open" | "won" | "lost" | "abandoned"
      crm_quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "declined"
        | "expired"
        | "revised"
      crm_subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "cancelled"
        | "paused"
        | "expired"
      decision_lifecycle:
        | "detected"
        | "framed"
        | "challenged"
        | "approved"
        | "committed"
        | "executing"
        | "checkpoint_due"
        | "outcome_recorded"
        | "learned"
        | "policy"
      decision_status: "proposed" | "decided" | "revisit" | "revoked"
      fin_account_type: "bank" | "cash" | "credit_card" | "wallet" | "other"
      fin_budget_period: "monthly" | "quarterly" | "yearly" | "custom"
      fin_txn_status: "planned" | "posted" | "reconciled" | "cancelled"
      fin_txn_type: "income" | "expense" | "transfer"
      goal_period: "monthly" | "quarterly" | "yearly" | "custom"
      goal_status:
        | "draft"
        | "on_track"
        | "at_risk"
        | "off_track"
        | "achieved"
        | "missed"
        | "archived"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      project_member_role: "owner" | "member" | "viewer"
      project_priority: "low" | "medium" | "high" | "urgent"
      project_status:
        | "planned"
        | "active"
        | "on_hold"
        | "completed"
        | "archived"
      risk_level: "low" | "medium" | "high" | "critical"
      risk_status: "open" | "mitigating" | "accepted" | "closed"
      task_priority: "low" | "medium" | "high" | "urgent"
      cycle_status: "planned" | "active" | "completed"
      custom_field_kind:
        | "text" | "long_text" | "number" | "currency" | "percent"
        | "select" | "multi_select" | "date" | "datetime" | "boolean"
        | "url" | "email"
      workflow_state_category: "backlog" | "unstarted" | "started" | "completed" | "canceled"
      task_status: "backlog" | "todo" | "in_progress" | "review" | "done"
      ticket_status: "open" | "in_progress" | "waiting" | "resolved" | "closed"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      workspace_plan: "trial" | "starter" | "growth" | "scale" | "enterprise"
      workspace_role:
        | "owner"
        | "admin"
        | "manager"
        | "member"
        | "viewer"
        | "guest"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "manager"],
      approval_kind: [
        "expense",
        "hiring",
        "contract",
        "discount",
        "budget_change",
        "project_escalation",
        "risk_acceptance",
        "payment",
        "time_off",
        "general",
      ],
      approval_priority: ["low", "normal", "high", "urgent"],
      approval_status: [
        "pending",
        "approved",
        "rejected",
        "info_requested",
        "delegated",
        "snoozed",
        "cancelled",
      ],
      asset_condition: ["excellent", "good", "fair", "poor", "retired"],
      assumption_status: ["holding", "at_risk", "breached", "unknown"],
      bug_severity: ["critical", "high", "medium", "low"],
      bug_status: [
        "new",
        "assigned",
        "in_progress",
        "testing",
        "resolved",
        "closed",
      ],
      crm_activity_kind: [
        "call",
        "email",
        "meeting",
        "note",
        "task",
        "whatsapp",
        "demo",
        "proposal_sent",
        "contract_sent",
        "other",
      ],
      crm_contract_status: [
        "draft",
        "internal_review",
        "counterparty_review",
        "pending_approval",
        "pending_signature",
        "active",
        "renewal",
        "expired",
        "terminated",
      ],
      crm_customer_health: ["healthy", "watch", "at_risk", "critical"],
      crm_forecast_category: [
        "pipeline",
        "best_case",
        "commit",
        "closed_won",
        "closed_lost",
        "omitted",
      ],
      crm_lifecycle: [
        "lead",
        "prospect",
        "customer",
        "partner",
        "vendor",
        "churned",
      ],
      crm_opp_status: ["open", "won", "lost", "abandoned"],
      crm_quote_status: [
        "draft",
        "sent",
        "accepted",
        "declined",
        "expired",
        "revised",
      ],
      crm_subscription_status: [
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "paused",
        "expired",
      ],
      decision_lifecycle: [
        "detected",
        "framed",
        "challenged",
        "approved",
        "committed",
        "executing",
        "checkpoint_due",
        "outcome_recorded",
        "learned",
        "policy",
      ],
      decision_status: ["proposed", "decided", "revisit", "revoked"],
      fin_account_type: ["bank", "cash", "credit_card", "wallet", "other"],
      fin_budget_period: ["monthly", "quarterly", "yearly", "custom"],
      fin_txn_status: ["planned", "posted", "reconciled", "cancelled"],
      fin_txn_type: ["income", "expense", "transfer"],
      goal_period: ["monthly", "quarterly", "yearly", "custom"],
      goal_status: [
        "draft",
        "on_track",
        "at_risk",
        "off_track",
        "achieved",
        "missed",
        "archived",
      ],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      project_member_role: ["owner", "member", "viewer"],
      project_priority: ["low", "medium", "high", "urgent"],
      project_status: ["planned", "active", "on_hold", "completed", "archived"],
      risk_level: ["low", "medium", "high", "critical"],
      risk_status: ["open", "mitigating", "accepted", "closed"],
      task_priority: ["low", "medium", "high", "urgent"],
      cycle_status: ["planned", "active", "completed"],
      custom_field_kind: [
        "text", "long_text", "number", "currency", "percent",
        "select", "multi_select", "date", "datetime", "boolean",
        "url", "email",
      ],
      workflow_state_category: ["backlog", "unstarted", "started", "completed", "canceled"],
      task_status: ["backlog", "todo", "in_progress", "review", "done"],
      ticket_status: ["open", "in_progress", "waiting", "resolved", "closed"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      workspace_plan: ["trial", "starter", "growth", "scale", "enterprise"],
      workspace_role: [
        "owner",
        "admin",
        "manager",
        "member",
        "viewer",
        "guest",
      ],
    },
  },
} as const
