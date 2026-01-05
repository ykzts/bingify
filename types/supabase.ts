export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bingo_cards: {
        Row: {
          created_at: string | null
          id: string
          numbers: Json
          space_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          numbers: Json
          space_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          numbers?: Json
          space_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bingo_cards_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "active_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_cards_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      called_numbers: {
        Row: {
          called_at: string | null
          id: string
          space_id: string | null
          value: number
        }
        Insert: {
          called_at?: string | null
          id?: string
          space_id?: string | null
          value: number
        }
        Update: {
          called_at?: string | null
          id?: string
          space_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "called_numbers_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "active_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "called_numbers_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          bingo_status: string | null
          id: string
          joined_at: string | null
          space_id: string
          user_id: string
        }
        Insert: {
          bingo_status?: string | null
          id?: string
          joined_at?: string | null
          space_id: string
          user_id: string
        }
        Update: {
          bingo_status?: string | null
          id?: string
          joined_at?: string | null
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "active_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      screen_settings: {
        Row: {
          background: string
          created_at: string | null
          display_mode: string
          id: string
          locale: string | null
          space_id: string
          theme: string
          updated_at: string | null
        }
        Insert: {
          background?: string
          created_at?: string | null
          display_mode?: string
          id?: string
          locale?: string | null
          space_id: string
          theme?: string
          updated_at?: string | null
        }
        Update: {
          background?: string
          created_at?: string | null
          display_mode?: string
          id?: string
          locale?: string | null
          space_id?: string
          theme?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_settings_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: true
            referencedRelation: "active_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_settings_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: true
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_roles_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "active_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_roles_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string | null
          description: string | null
          gatekeeper_rules: Json | null
          id: string
          max_participants: number
          owner_id: string | null
          settings: Json | null
          share_key: string
          status: string | null
          title: string | null
          updated_at: string | null
          view_token: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gatekeeper_rules?: Json | null
          id?: string
          max_participants: number
          owner_id?: string | null
          settings?: Json | null
          share_key: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          view_token: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gatekeeper_rules?: Json | null
          id?: string
          max_participants?: number
          owner_id?: string | null
          settings?: Json | null
          share_key?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          view_token?: string
        }
        Relationships: []
      }
      spaces_archive: {
        Row: {
          archived_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          gatekeeper_rules: Json | null
          id: string
          max_participants: number | null
          owner_id: string | null
          settings: Json | null
          share_key: string
          status: string | null
          title: string | null
          updated_at: string | null
          view_token: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          gatekeeper_rules?: Json | null
          id: string
          max_participants?: number | null
          owner_id?: string | null
          settings?: Json | null
          share_key: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          view_token?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          gatekeeper_rules?: Json | null
          id?: string
          max_participants?: number | null
          owner_id?: string | null
          settings?: Json | null
          share_key?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          view_token?: string | null
        }
        Relationships: []
      }
      system_auth_providers: {
        Row: {
          created_at: string | null
          is_enabled: boolean
          label: string | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          is_enabled?: boolean
          label?: string | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          is_enabled?: boolean
          label?: string | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          default_user_role: string
          features: Json
          id: number
          max_participants_per_space: number
          max_spaces_per_user: number
          max_total_spaces: number
          space_expiration_hours: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_user_role?: string
          features?: Json
          id?: number
          max_participants_per_space?: number
          max_spaces_per_user?: number
          max_total_spaces?: number
          space_expiration_hours?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_user_role?: string
          features?: Json
          id?: number
          max_participants_per_space?: number
          max_spaces_per_user?: number
          max_total_spaces?: number
          space_expiration_hours?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_spaces: {
        Row: {
          created_at: string | null
          gatekeeper_rules: Json | null
          id: string | null
          max_participants: number | null
          owner_id: string | null
          settings: Json | null
          share_key: string | null
          status: string | null
          updated_at: string | null
          view_token: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_spaces: {
        Args: never
        Returns: {
          expired_count: number
          expired_space_ids: string[]
        }[]
      }
      delete_oauth_token: { Args: { p_provider: string }; Returns: Json }
      get_oauth_token: { Args: { p_provider: string }; Returns: Json }
      get_system_settings: {
        Args: never
        Returns: {
          default_user_role: string
          features: Json
          max_participants_per_space: number
          max_spaces_per_user: number
          max_total_spaces: number
          space_expiration_hours: number
        }[]
      }
      is_space_expired: { Args: { space_created_at: string }; Returns: boolean }
      upsert_oauth_token: {
        Args: {
          p_access_token: string
          p_expires_at?: string
          p_provider: string
          p_refresh_token?: string
        }
        Returns: Json
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

