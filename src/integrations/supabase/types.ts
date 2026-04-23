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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
          trigger?: Json
          updated_at?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          client_id: string
          created_at: string
          edges: Json
          id: string
          name: string
          nodes: Json
          status: string
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string
          created_at?: string
          edges?: Json
          id?: string
          name: string
          nodes?: Json
          status?: string
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          status?: string
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          channel: string
          client_id: string
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          metadata: Json
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          channel?: string
          client_id?: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          client_id?: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          client_id: string
          config: Json
          created_at: string
          id: string
          provider: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string
          config?: Json
          created_at?: string
          id?: string
          provider: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          client_id?: string
          config?: Json
          created_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          category: string
          city: string | null
          client_id: string
          column_id: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          origin: string | null
          phone: string | null
          position: string | null
          responsible_id: string | null
          tags: string[]
          updated_at: string
          value: number | null
        }
        Insert: {
          category?: string
          city?: string | null
          client_id?: string
          column_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          position?: string | null
          responsible_id?: string | null
          tags?: string[]
          updated_at?: string
          value?: number | null
        }
        Update: {
          category?: string
          city?: string | null
          client_id?: string
          column_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          position?: string | null
          responsible_id?: string | null
          tags?: string[]
          updated_at?: string
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
        ]
      }
      messages: {
        Row: {
          client_id: string
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          metadata: Json
          sender_name: string | null
          type: string
        }
        Insert: {
          client_id?: string
          content?: string
          conversation_id: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json
          sender_name?: string | null
          type?: string
        }
        Update: {
          client_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json
          sender_name?: string | null
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
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_columns: {
        Row: {
          client_id: string
          color: string | null
          created_at: string
          id: string
          name: string
          order: number
          pipeline_id: string
        }
        Insert: {
          client_id?: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
          order?: number
          pipeline_id?: string
        }
        Update: {
          client_id?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          order?: number
          pipeline_id?: string
        }
        Relationships: []
      }
      pipelines: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_blocked: boolean
          name: string
          organization_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string
          created_at?: string
          email?: string | null
          id: string
          is_blocked?: boolean
          name?: string
          organization_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean
          name?: string
          organization_id?: string | null
          role?: string
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
        ]
      }
      push_subscriptions: {
        Row: {
          client_id: string
          created_at: string
          endpoint: string
          id: string
          keys: Json
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
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
        }
        Insert: {
          agent_id?: string | null
          client_id?: string
          created_at?: string
          document_id?: string | null
          id?: string
          query?: string
          similarity_score?: number
        }
        Update: {
          agent_id?: string | null
          client_id?: string
          created_at?: string
          document_id?: string | null
          id?: string
          query?: string
          similarity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "rag_context_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
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
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          status?: string
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
        ]
      }
      timeline_events: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          lead_id: string | null
          type: string
          user_name: string | null
        }
        Insert: {
          client_id?: string
          content: string
          created_at?: string
          id?: string
          lead_id?: string | null
          type: string
          user_name?: string | null
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          lead_id?: string | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_org_member: {
        Args: { target_org_id: string; target_user_id: string }
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
      get_user_client_id: { Args: never; Returns: string }
      is_master_user: { Args: never; Returns: boolean }
      match_rag_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_client_id?: string
          query_embedding: string
        }
        Returns: {
          chunk_text: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      owner_add_org_member: {
        Args: { target_org_id: string; target_user_id: string }
        Returns: undefined
      }
      owner_remove_org_member: {
        Args: { target_user_id: string }
        Returns: undefined
      }
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
