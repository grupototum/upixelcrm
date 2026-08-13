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
      api_keys: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          id: string
          last_used_at: string | null
          name: string
          token_hash: string
          token_preview: string
        }
        Insert: {
          active?: boolean
          client_id?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          name: string
          token_hash: string
          token_preview: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          token_hash?: string
          token_preview?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          tenant_id: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          tenant_id?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          tenant_id?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          automation_id: string
          created_at: string | null
          duration_ms: number | null
          id: string
          input: Json | null
          lead_id: string
          node_id: string
          node_type: string
          output: Json | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          input?: Json | null
          lead_id: string
          node_id: string
          node_type: string
          output?: Json | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          input?: Json | null
          lead_id?: string
          node_id?: string
          node_type?: string
          output?: Json | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_runs_summary"
            referencedColumns: ["automation_id"]
          },
          {
            foreignKeyName: "automation_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_queue: {
        Row: {
          automation_id: string
          context: Json | null
          created_at: string | null
          error: string | null
          executed_at: string | null
          id: string
          lead_id: string
          next_retry_at: string | null
          node_id: string
          retry_count: number
          scheduled_at: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          automation_id: string
          context?: Json | null
          created_at?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          lead_id: string
          next_retry_at?: string | null
          node_id: string
          retry_count?: number
          scheduled_at: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          automation_id?: string
          context?: Json | null
          created_at?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string
          next_retry_at?: string | null
          node_id?: string
          retry_count?: number
          scheduled_at?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_queue_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_runs_summary"
            referencedColumns: ["automation_id"]
          },
          {
            foreignKeyName: "automation_queue_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          active: boolean
          client_id: string
          column_id: string | null
          created_at: string
          exceptions: Json
          id: string
          name: string
          pipeline_id: string | null
          tenant_id: string | null
          trigger: Json
          updated_at: string
        }
        Insert: {
          actions?: Json
          active?: boolean
          client_id?: string
          column_id?: string | null
          created_at?: string
          exceptions?: Json
          id?: string
          name?: string
          pipeline_id?: string | null
          tenant_id?: string | null
          trigger?: Json
          updated_at?: string
        }
        Update: {
          actions?: Json
          active?: boolean
          client_id?: string
          column_id?: string | null
          created_at?: string
          exceptions?: Json
          id?: string
          name?: string
          pipeline_id?: string | null
          tenant_id?: string | null
          trigger?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_id: string
          client_id: string
          context: Json
          current_node_id: string | null
          error: string | null
          finished_at: string | null
          id: string
          lead_id: string
          started_at: string
          status: string
          steps_executed: number
          tenant_id: string | null
          trigger_event: string | null
          updated_at: string
        }
        Insert: {
          automation_id: string
          client_id: string
          context?: Json
          current_node_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          lead_id: string
          started_at?: string
          status?: string
          steps_executed?: number
          tenant_id?: string | null
          trigger_event?: string | null
          updated_at?: string
        }
        Update: {
          automation_id?: string
          client_id?: string
          context?: Json
          current_node_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          lead_id?: string
          started_at?: string
          status?: string
          steps_executed?: number
          tenant_id?: string | null
          trigger_event?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_runs_summary"
            referencedColumns: ["automation_id"]
          },
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          allow_re_enroll: boolean
          client_id: string
          created_at: string
          description: string | null
          edges: Json
          id: string
          name: string
          nodes: Json
          status: string
          tenant_id: string | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          allow_re_enroll?: boolean
          client_id?: string
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          name: string
          nodes?: Json
          status?: string
          tenant_id?: string | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          allow_re_enroll?: boolean
          client_id?: string
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          status?: string
          tenant_id?: string | null
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_configs: {
        Row: {
          client_id: string
          created_at: string
          enabled: boolean
          id: string
          interval_hours: number
          retain_count: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          interval_hours?: number
          retain_count?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          interval_hours?: number
          retain_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      backup_runs: {
        Row: {
          client_id: string
          error_msg: string | null
          file_size_bytes: number | null
          finished_at: string | null
          id: string
          row_counts: Json | null
          started_at: string
          status: string
          storage_path: string | null
          type: string
        }
        Insert: {
          client_id: string
          error_msg?: string | null
          file_size_bytes?: number | null
          finished_at?: string | null
          id?: string
          row_counts?: Json | null
          started_at?: string
          status?: string
          storage_path?: string | null
          type?: string
        }
        Update: {
          client_id?: string
          error_msg?: string | null
          file_size_bytes?: number | null
          finished_at?: string | null
          id?: string
          row_counts?: Json | null
          started_at?: string
          status?: string
          storage_path?: string | null
          type?: string
        }
        Relationships: []
      }
      bot_sessions: {
        Row: {
          bot_id: string
          client_id: string
          created_at: string
          current_node_id: string | null
          expires_at: string | null
          id: string
          lead_id: string
          status: string
          updated_at: string
          variables: Json
        }
        Insert: {
          bot_id: string
          client_id: string
          created_at?: string
          current_node_id?: string | null
          expires_at?: string | null
          id?: string
          lead_id: string
          status?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          bot_id?: string
          client_id?: string
          created_at?: string
          current_node_id?: string | null
          expires_at?: string | null
          id?: string
          lead_id?: string
          status?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bot_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          client_id: string
          created_at: string
          draft_edges: Json | null
          draft_nodes: Json | null
          edges: Json
          embed_url: string
          folder: string
          id: string
          name: string
          nodes: Json
          published_at: string | null
          status: string
          trigger_type: string
          trigger_value: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          draft_edges?: Json | null
          draft_nodes?: Json | null
          edges?: Json
          embed_url?: string
          folder?: string
          id?: string
          name: string
          nodes?: Json
          published_at?: string | null
          status?: string
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          draft_edges?: Json | null
          draft_nodes?: Json | null
          edges?: Json
          embed_url?: string
          folder?: string
          id?: string
          name?: string
          nodes?: Json
          published_at?: string | null
          status?: string
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      broadcast_campaigns: {
        Row: {
          channel: string
          client_id: string
          created_at: string
          created_by: string | null
          delay_max_seconds: number
          delay_min_seconds: number
          failed_count: number
          id: string
          lead_ids: string[]
          message_content: string | null
          name: string
          route: string
          scheduled_at: string | null
          sent_count: number
          status: string
          template_id: string | null
          tenant_id: string | null
          total_recipients: number
          updated_at: string
        }
        Insert: {
          channel?: string
          client_id: string
          created_at?: string
          created_by?: string | null
          delay_max_seconds?: number
          delay_min_seconds?: number
          failed_count?: number
          id?: string
          lead_ids?: string[]
          message_content?: string | null
          name: string
          route?: string
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          delay_max_seconds?: number
          delay_min_seconds?: number
          failed_count?: number
          id?: string
          lead_ids?: string[]
          message_content?: string | null
          name?: string
          route?: string
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_dispatch_logs: {
        Row: {
          campaign_id: string | null
          campaign_name: string
          channel: string
          client_id: string
          created_at: string
          delay_max_seconds: number | null
          delay_min_seconds: number | null
          delivered_at: string | null
          error: string | null
          id: string
          lead_id: string | null
          message_content: string | null
          phone: string | null
          read_at: string | null
          retry_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          tenant_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          campaign_name: string
          channel?: string
          client_id: string
          created_at?: string
          delay_max_seconds?: number | null
          delay_min_seconds?: number | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          message_content?: string | null
          phone?: string | null
          read_at?: string | null
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string
          channel?: string
          client_id?: string
          created_at?: string
          delay_max_seconds?: number | null
          delay_min_seconds?: number | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          message_content?: string | null
          phone?: string | null
          read_at?: string | null
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_dispatch_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_dispatch_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      canned_responses: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          short_code: string
          title: string
        }
        Insert: {
          client_id?: string
          content: string
          created_at?: string
          id?: string
          short_code: string
          title: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          short_code?: string
          title?: string
        }
        Relationships: []
      }
      client_credits: {
        Row: {
          balance: number
          client_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          client_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          client_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_label_assignments: {
        Row: {
          conversation_id: string
          created_at: string
          label_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          label_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_label_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "conversation_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_labels: {
        Row: {
          client_id: string
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          client_id?: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assignee_id: string | null
          channel: string
          client_id: string
          created_at: string
          csat_requested_at: string | null
          csat_sent_at: string | null
          first_reply_at: string | null
          id: string
          integration_id: string | null
          last_inbound_at: string | null
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          message_window_status: string | null
          metadata: Json
          opened_at: string | null
          priority: string | null
          resolved_at: string | null
          snoozed_until: string | null
          status: string
          tenant_id: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          channel?: string
          client_id?: string
          created_at?: string
          csat_requested_at?: string | null
          csat_sent_at?: string | null
          first_reply_at?: string | null
          id?: string
          integration_id?: string | null
          last_inbound_at?: string | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          message_window_status?: string | null
          metadata?: Json
          opened_at?: string | null
          priority?: string | null
          resolved_at?: string | null
          snoozed_until?: string | null
          status?: string
          tenant_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          channel?: string
          client_id?: string
          created_at?: string
          csat_requested_at?: string | null
          csat_sent_at?: string | null
          first_reply_at?: string | null
          id?: string
          integration_id?: string | null
          last_inbound_at?: string | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          message_window_status?: string | null
          metadata?: Json
          opened_at?: string | null
          priority?: string | null
          resolved_at?: string | null
          snoozed_until?: string | null
          status?: string
          tenant_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      csat_responses: {
        Row: {
          client_id: string
          comment: string | null
          conversation_id: string
          id: string
          lead_id: string | null
          rating: number
          responded_at: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          conversation_id: string
          id?: string
          lead_id?: string | null
          rating: number
          responded_at?: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          conversation_id?: string
          id?: string
          lead_id?: string | null
          rating?: number
          responded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "csat_responses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          client_id: string | null
          created_at: string | null
          display_order: number | null
          field_type: string
          id: string
          is_required: boolean | null
          name: string
          options: Json | null
          slug: string
          tenant_id: string | null
          updated_at: string | null
          visible_pipelines: string[] | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          display_order?: number | null
          field_type: string
          id?: string
          is_required?: boolean | null
          name: string
          options?: Json | null
          slug: string
          tenant_id?: string | null
          updated_at?: string | null
          visible_pipelines?: string[] | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          display_order?: number | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          name?: string
          options?: Json | null
          slug?: string
          tenant_id?: string | null
          updated_at?: string | null
          visible_pipelines?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          client_id: string | null
          context: Json
          created_at: string
          id: string
          message: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          message: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          batch_id: string
          client_id: string
          created_at: string
          errors: number
          filename: string | null
          id: string
          inserted: number
          rolled_back_at: string | null
          skipped: number
          skipped_duplicate: number
          skipped_no_name: number
          tenant_id: string | null
          total_rows: number
          updated: number
          user_id: string | null
        }
        Insert: {
          batch_id: string
          client_id: string
          created_at?: string
          errors?: number
          filename?: string | null
          id?: string
          inserted?: number
          rolled_back_at?: string | null
          skipped?: number
          skipped_duplicate?: number
          skipped_no_name?: number
          tenant_id?: string | null
          total_rows?: number
          updated?: number
          user_id?: string | null
        }
        Update: {
          batch_id?: string
          client_id?: string
          created_at?: string
          errors?: number
          filename?: string | null
          id?: string
          inserted?: number
          rolled_back_at?: string | null
          skipped?: number
          skipped_duplicate?: number
          skipped_no_name?: number
          tenant_id?: string | null
          total_rows?: number
          updated?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_templates: {
        Row: {
          category: string
          client_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          short_code: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          client_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          short_code?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          short_code?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          client_id: string
          config: Json
          consecutive_failures: number | null
          created_at: string
          health_status: string | null
          id: string
          instance_name: string | null
          last_heartbeat: string | null
          provider: string
          refresh_token: string | null
          status: string
          tenant_id: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string
          config?: Json
          consecutive_failures?: number | null
          created_at?: string
          health_status?: string | null
          id?: string
          instance_name?: string | null
          last_heartbeat?: string | null
          provider: string
          refresh_token?: string | null
          status?: string
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          client_id?: string
          config?: Json
          consecutive_failures?: number | null
          created_at?: string
          health_status?: string | null
          id?: string
          instance_name?: string | null
          last_heartbeat?: string | null
          provider?: string
          refresh_token?: string | null
          status?: string
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_duplicate_exceptions: {
        Row: {
          client_id: string
          created_at: string
          group_key: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          group_key: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          group_key?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_duplicate_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_adset_id: string | null
          ad_campaign_id: string | null
          ad_id: string | null
          category: string | null
          city: string | null
          client_id: string
          column_id: string | null
          company: string | null
          created_at: string
          custom_fields: Json
          deleted_at: string | null
          email: string | null
          facebook_id: string | null
          faturamento_mensal: number | null
          fbclid: string | null
          gclid: string | null
          id: string
          import_batch_id: string | null
          instagram_id: string | null
          name: string
          notes: string | null
          notes_local: string | null
          origin: string | null
          phone: string | null
          position: string | null
          responsible_id: string | null
          segmento: string | null
          tags: string[]
          tenant_id: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number | null
        }
        Insert: {
          ad_adset_id?: string | null
          ad_campaign_id?: string | null
          ad_id?: string | null
          category?: string | null
          city?: string | null
          client_id?: string
          column_id?: string | null
          company?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          email?: string | null
          facebook_id?: string | null
          faturamento_mensal?: number | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          import_batch_id?: string | null
          instagram_id?: string | null
          name: string
          notes?: string | null
          notes_local?: string | null
          origin?: string | null
          phone?: string | null
          position?: string | null
          responsible_id?: string | null
          segmento?: string | null
          tags?: string[]
          tenant_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
        }
        Update: {
          ad_adset_id?: string | null
          ad_campaign_id?: string | null
          ad_id?: string | null
          category?: string | null
          city?: string | null
          client_id?: string
          column_id?: string | null
          company?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          email?: string | null
          facebook_id?: string | null
          faturamento_mensal?: number | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          import_batch_id?: string | null
          instagram_id?: string | null
          name?: string
          notes?: string | null
          notes_local?: string | null
          origin?: string | null
          phone?: string | null
          position?: string | null
          responsible_id?: string | null
          segmento?: string | null
          tags?: string[]
          tenant_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "pipeline_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      macro_executions: {
        Row: {
          conversation_id: string | null
          executed_at: string
          executed_by: string | null
          id: string
          lead_id: string | null
          macro_id: string
          results: Json
        }
        Insert: {
          conversation_id?: string | null
          executed_at?: string
          executed_by?: string | null
          id?: string
          lead_id?: string | null
          macro_id: string
          results?: Json
        }
        Update: {
          conversation_id?: string | null
          executed_at?: string
          executed_by?: string | null
          id?: string
          lead_id?: string | null
          macro_id?: string
          results?: Json
        }
        Relationships: [
          {
            foreignKeyName: "macro_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "macro_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "macro_executions_macro_id_fkey"
            columns: ["macro_id"]
            isOneToOne: false
            referencedRelation: "macros"
            referencedColumns: ["id"]
          },
        ]
      }
      macros: {
        Row: {
          actions: Json
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          actions?: Json
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          actions?: Json
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "macros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_sequence_steps: {
        Row: {
          content: string
          created_at: string
          delay_unit: string
          delay_value: number
          id: string
          metadata: Json | null
          sequence_id: string
          step_order: number
          type: string
        }
        Insert: {
          content?: string
          created_at?: string
          delay_unit?: string
          delay_value?: number
          id?: string
          metadata?: Json | null
          sequence_id: string
          step_order?: number
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          delay_unit?: string
          delay_value?: number
          id?: string
          metadata?: Json | null
          sequence_id?: string
          step_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      message_sequences: {
        Row: {
          active: boolean
          channel: string
          client_id: string
          created_at: string
          description: string | null
          enrollment_count: number
          id: string
          name: string
          tenant_id: string | null
          trigger_column_id: string | null
          trigger_pipeline_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          channel?: string
          client_id: string
          created_at?: string
          description?: string | null
          enrollment_count?: number
          id?: string
          name: string
          tenant_id?: string | null
          trigger_column_id?: string | null
          trigger_pipeline_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          channel?: string
          client_id?: string
          created_at?: string
          description?: string | null
          enrollment_count?: number
          id?: string
          name?: string
          tenant_id?: string | null
          trigger_column_id?: string | null
          trigger_pipeline_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_id: string
          content: string
          content_type: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          is_private: boolean
          metadata: Json
          sender_name: string | null
          tenant_id: string | null
          type: string
        }
        Insert: {
          client_id?: string
          content?: string
          content_type?: string
          conversation_id: string
          created_at?: string
          direction?: string
          id?: string
          is_private?: boolean
          metadata?: Json
          sender_name?: string | null
          tenant_id?: string | null
          type?: string
        }
        Update: {
          client_id?: string
          content?: string
          content_type?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          is_private?: boolean
          metadata?: Json
          sender_name?: string | null
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_oauth_sessions: {
        Row: {
          access_token: string
          client_id: string
          created_at: string | null
          discovered: Json
          expires_at: string
          id: string
          tenant_subdomain: string
          type: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string | null
          discovered?: Json
          expires_at?: string
          id?: string
          tenant_subdomain: string
          type: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string | null
          discovered?: Json
          expires_at?: string
          id?: string
          tenant_subdomain?: string
          type?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          client_id: string
          created_at: string | null
          id: string
          lead_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string
          client_id: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          read?: boolean
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          slug: string
          subdomain: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          slug: string
          subdomain?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          slug?: string
          subdomain?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_columns: {
        Row: {
          client_id: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          order: number
          pipeline_id: string
          tenant_id: string | null
        }
        Insert: {
          client_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order?: number
          pipeline_id?: string
          tenant_id?: string | null
        }
        Update: {
          client_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order?: number
          pipeline_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_columns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          client_id?: string
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          avatar_url: string | null
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_blocked: boolean
          name: string
          organization_id: string | null
          role: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          avatar_url?: string | null
          client_id?: string
          created_at?: string
          email?: string | null
          id: string
          is_blocked?: boolean
          name?: string
          organization_id?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          avatar_url?: string | null
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean
          name?: string
          organization_id?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          client_id: string
          created_at: string
          endpoint: string
          id: string
          keys: Json
          tenant_id: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          client_id?: string
          created_at?: string
          endpoint: string
          id?: string
          keys?: Json
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_context: {
        Row: {
          agent_id: string | null
          client_id: string
          created_at: string
          document_id: string | null
          id: string
          query: string
          similarity_score: number
          tenant_id: string | null
        }
        Insert: {
          agent_id?: string | null
          client_id?: string
          created_at?: string
          document_id?: string | null
          id?: string
          query?: string
          similarity_score?: number
          tenant_id?: string | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string
          created_at?: string
          document_id?: string | null
          id?: string
          query?: string
          similarity_score?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_context_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_documents: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          is_global: boolean
          metadata: Json
          partition: string
          tenant_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          is_global?: boolean
          metadata?: Json
          partition?: string
          tenant_id?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          is_global?: boolean
          metadata?: Json
          partition?: string
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          client_id: string
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
          is_global: boolean
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          chunk_index?: number
          chunk_text?: string
          client_id?: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          is_global?: boolean
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          client_id?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          is_global?: boolean
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_embeddings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket_key: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          hits?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      recharge_intents: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          credits_to_add: number
          external_id: string | null
          id: string
          payment_link: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          credits_to_add: number
          external_id?: string | null
          id?: string
          payment_link?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          credits_to_add?: number
          external_id?: string | null
          id?: string
          payment_link?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      saved_views: {
        Row: {
          client_id: string
          created_at: string
          filters: Json
          id: string
          is_shared: boolean
          name: string
          scope: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          filters?: Json
          id?: string
          is_shared?: boolean
          name: string
          scope?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          filters?: Json
          id?: string
          is_shared?: boolean
          name?: string
          scope?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string | null
          color: string
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          category?: string | null
          color?: string
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          category?: string | null
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          result: string | null
          status: string
          tenant_id: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          result?: string | null
          status?: string
          tenant_id?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          result?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string | null
          plan: string
          subdomain: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id?: string | null
          plan?: string
          subdomain: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string | null
          plan?: string
          subdomain?: string
          updated_at?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          lead_id: string | null
          tenant_id: string | null
          type: string
          user_name: string | null
        }
        Insert: {
          client_id?: string
          content: string
          created_at?: string
          id?: string
          lead_id?: string | null
          tenant_id?: string | null
          type: string
          user_name?: string | null
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          tenant_id?: string | null
          type?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          description: string | null
          events: string[]
          id: string
          secret: string
          url: string
        }
        Insert: {
          active?: boolean
          client_id?: string
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          secret: string
          url: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          secret?: string
          url?: string
        }
        Relationships: []
      }
      whatsapp_message_dedup: {
        Row: {
          client_id: string
          id: string
          processed_at: string
          source: string
          whatsapp_msg_id: string
        }
        Insert: {
          client_id: string
          id?: string
          processed_at?: string
          source: string
          whatsapp_msg_id: string
        }
        Update: {
          client_id?: string
          id?: string
          processed_at?: string
          source?: string
          whatsapp_msg_id?: string
        }
        Relationships: []
      }
      whatsapp_message_queue: {
        Row: {
          attempt_count: number
          client_id: string
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          max_attempts: number
          message_data: Json
          processed_at: string | null
          route: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          client_id: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          message_data: Json
          processed_at?: string | null
          route?: string
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          client_id?: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          message_data?: Json
          processed_at?: string | null
          route?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string
          client_id: string
          components: Json | null
          content: string
          created_at: string
          id: string
          language: string | null
          name: string
          rejected_reason: string | null
          status: string | null
          typebot_flow_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          client_id: string
          components?: Json | null
          content: string
          created_at?: string
          id?: string
          language?: string | null
          name: string
          rejected_reason?: string | null
          status?: string | null
          typebot_flow_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          components?: Json | null
          content?: string
          created_at?: string
          id?: string
          language?: string | null
          name?: string
          rejected_reason?: string | null
          status?: string | null
          typebot_flow_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      automation_runs_summary: {
        Row: {
          automation_id: string | null
          client_id: string | null
          completed_count: number | null
          failed_count: number | null
          last_run_at: string | null
          paused_count: number | null
          running_count: number | null
          tenant_id: string | null
          total_runs: number | null
          waiting_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_add_org_member: {
        Args: { target_org_id: string; target_user_id: string }
        Returns: undefined
      }
      admin_approve_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      admin_remove_org_member: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      admin_toggle_block: {
        Args: { block_status: boolean; target_user_id: string }
        Returns: undefined
      }
      bulk_update_lead_custom_field: {
        Args: { p_lead_ids: string[]; p_slug: string; p_value: string }
        Returns: number
      }
      bump_rate_limit: {
        Args: { p_key: string; p_window_seconds: number }
        Returns: number
      }
      cleanup_meta_oauth_sessions: { Args: never; Returns: undefined }
      csat_stats: {
        Args: { p_end: string; p_start: string }
        Returns: {
          avg_rating: number
          rating_1: number
          rating_2: number
          rating_3: number
          rating_4: number
          rating_5: number
          total_responses: number
        }[]
      }
      dashboard_kpis: { Args: { p_client_id?: string }; Returns: Json }
      default_pipeline_column: {
        Args: { p_client_id: string }
        Returns: string
      }
      execute_backup_restore: { Args: { sql_text: string }; Returns: Json }
      find_trigger_node_id: {
        Args: { p_event_type: string; p_nodes: Json }
        Returns: string
      }
      get_org_tenant_id: { Args: { org_id: string }; Returns: string }
      get_user_client_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      get_user_tenant_id: { Args: never; Returns: string }
      get_window_remaining_seconds: {
        Args: { conv_id: string }
        Returns: number
      }
      increment_client_credits: {
        Args: { amount_param: number; client_id_param: string }
        Returns: undefined
      }
      is_master_user: { Args: never; Returns: boolean }
      is_user_blocked: { Args: never; Returns: boolean }
      is_within_24h_window: { Args: { conv_id: string }; Returns: boolean }
      match_or_create_lead: {
        Args: {
          p_client_id: string
          p_email?: string
          p_facebook_id?: string
          p_instagram_id?: string
          p_name?: string
          p_origin?: string
          p_phone?: string
          p_target_column_id?: string
        }
        Returns: Json
      }
      merge_leads_into: {
        Args: { p_duplicate_ids: string[]; p_primary_id: string }
        Returns: undefined
      }
      normalize_email: { Args: { e: string }; Returns: string }
      normalize_name: { Args: { n: string }; Returns: string }
      normalize_phone: { Args: { p: string }; Returns: string }
      owner_add_org_member: {
        Args: { target_org_id: string; target_user_id: string }
        Returns: undefined
      }
      owner_remove_org_member: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      prune_rate_limits: { Args: never; Returns: undefined }
      read_secret: { Args: { secret_name: string }; Returns: string }
      supervisor_set_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      supervisor_toggle_block: {
        Args: { block_status: boolean; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "supervisor" | "atendente" | "vendedor"
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
      user_role: ["supervisor", "atendente", "vendedor"],
    },
  },
} as const
