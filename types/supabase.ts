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
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          dismissible: boolean
          ends_at: string | null
          id: string
          priority: string
          published: boolean
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          dismissible?: boolean
          ends_at?: string | null
          id?: string
          priority: string
          published?: boolean
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          dismissible?: boolean
          ends_at?: string | null
          id?: string
          priority?: string
          published?: boolean
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      game_results: {
        Row: {
          achieved_at: string
          created_at: string
          id: string
          pattern_details: Json
          pattern_type: string
          space_id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          id?: string
          pattern_details?: Json
          pattern_type: string
          space_id: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          id?: string
          pattern_details?: Json
          pattern_type?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_results_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          expires_at: string
          id: string
          metadata: Json
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string
          id?: string
          metadata?: Json
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string
          id?: string
          metadata?: Json
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_source: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_source?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_source?: string | null
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
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_announcements: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          pinned: boolean
          space_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          pinned?: boolean
          space_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_announcements_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_announcements_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
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
          archive_retention_hours: number
          created_at: string | null
          default_user_role: string
          features: Json
          id: number
          max_participants_per_space: number
          max_spaces_per_user: number
          max_total_spaces: number
          space_expiration_hours: number
          spaces_archive_retention_hours: number
          updated_at: string | null
        }
        Insert: {
          archive_retention_hours?: number
          created_at?: string | null
          default_user_role?: string
          features?: Json
          id?: number
          max_participants_per_space?: number
          max_spaces_per_user?: number
          max_total_spaces?: number
          space_expiration_hours?: number
          spaces_archive_retention_hours?: number
          updated_at?: string | null
        }
        Update: {
          archive_retention_hours?: number
          created_at?: string | null
          default_user_role?: string
          features?: Json
          id?: number
          max_participants_per_space?: number
          max_spaces_per_user?: number
          max_total_spaces?: number
          space_expiration_hours?: number
          spaces_archive_retention_hours?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      twitch_broadcasters: {
        Row: {
          broadcaster_id: string
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string | null
          fetch_error: string | null
          fetched_at: string
          id: string
          profile_image_url: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          broadcaster_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          fetch_error?: string | null
          fetched_at?: string
          id?: string
          profile_image_url?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          broadcaster_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          fetch_error?: string | null
          fetched_at?: string
          id?: string
          profile_image_url?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      verified_social_channels: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          provider: string
          updated_at: string
          user_id: string
          verified_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      youtube_channels: {
        Row: {
          channel_id: string
          channel_title: string | null
          created_at: string
          created_by: string | null
          custom_url: string | null
          description: string | null
          fetch_error: string | null
          fetched_at: string
          handle: string | null
          id: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          channel_title?: string | null
          created_at?: string
          created_by?: string | null
          custom_url?: string | null
          description?: string | null
          fetch_error?: string | null
          fetched_at?: string
          handle?: string | null
          id?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          channel_title?: string | null
          created_at?: string
          created_by?: string | null
          custom_url?: string | null
          description?: string | null
          fetch_error?: string | null
          fetched_at?: string
          handle?: string | null
          id?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
      delete_oauth_token_for_user: {
        Args: { p_provider: string; p_user_id: string }
        Returns: Json
      }
      get_expired_oauth_tokens: {
        Args: never
        Returns: {
          expires_at: string
          lock_key: number
          provider: string
          refresh_token_secret_id: string
          user_id: string
        }[]
      }
      get_oauth_token: { Args: { p_provider: string }; Returns: Json }
      get_oauth_token_for_user: {
        Args: { p_provider: string; p_user_id: string }
        Returns: Json
      }
      get_system_settings: {
        Args: never
        Returns: {
          archive_retention_hours: number
          default_user_role: string
          features: Json
          max_participants_per_space: number
          max_spaces_per_user: number
          max_total_spaces: number
          space_expiration_hours: number
          spaces_archive_retention_hours: number
        }[]
      }
      release_oauth_token_lock: {
        Args: { p_lock_key: number }
        Returns: boolean
      }
      upsert_oauth_token: {
        Args: {
          p_access_token: string
          p_expires_at?: string
          p_provider: string
          p_refresh_token?: string
        }
        Returns: Json
      }
      upsert_oauth_token_for_user: {
        Args: {
          p_access_token: string
          p_expires_at?: string
          p_provider: string
          p_refresh_token?: string
          p_user_id: string
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

