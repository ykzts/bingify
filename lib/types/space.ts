import type { Tables } from "@/types/supabase";

/**
 * Gatekeeper rules for space access control
 */
export interface GatekeeperRules {
  email?: {
    allowed?: string[];
    blocked?: string[];
  };
  twitch?: {
    broadcasterId: string;
    requirement?: string; // "follower" or "subscriber"
    requireFollow?: boolean; // Legacy format, for backward compatibility
    requireSub?: boolean; // Legacy format, for backward compatibility
  };
  youtube?: {
    channelId: string;
    requirement?: string; // "subscriber" or "member"
    required?: boolean; // Legacy format, for backward compatibility
  };
}

/**
 * Space settings configuration
 */
export interface SpaceSettings {
  hide_metadata_before_join?: boolean;
}

/**
 * Space type with properly typed JSON fields
 */
export type Space = Omit<Tables<"spaces">, "gatekeeper_rules" | "settings"> & {
  gatekeeper_rules: GatekeeperRules | null;
  settings: SpaceSettings | null;
};

/**
 * Public space information (metadata visible before joining)
 * This type is used when displaying space info to non-participants
 * with masked/redacted sensitive information
 */
export interface PublicSpaceInfo {
  description: string | null;
  gatekeeper_rules: {
    email?: {
      allowed: string[]; // Masked email patterns
    };
    twitch?: {
      requirement: string;
    };
    youtube?: {
      requirement: string;
    };
  } | null;
  hideMetadata: boolean;
  id: string;
  share_key: string;
  status: string | null;
  title: string | null;
}

/**
 * Space admin type (profiles joined with space_roles)
 */
export interface SpaceAdmin {
  avatar_url: string | null;
  email: string | null;
  full_name: string | null;
  user_id: string;
}
