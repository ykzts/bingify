import { z } from "zod";
import type { Tables } from "@/types/supabase";

/**
 * Zod schema for gatekeeper email rules
 */
const gatekeeperEmailSchema = z.object({
  allowed: z.array(z.string()).optional(),
  blocked: z.array(z.string()).optional(),
});

/**
 * Zod schema for gatekeeper Twitch rules
 */
const gatekeeperTwitchSchema = z.object({
  broadcasterId: z.string(),
  requirement: z.string().optional(), // "follower" or "subscriber"
});

/**
 * Zod schema for gatekeeper YouTube rules
 */
const gatekeeperYoutubeSchema = z.object({
  channelId: z.string(),
  requirement: z.string().optional(), // "subscriber" or "member"
});

/**
 * Zod schema for gatekeeper rules validation
 */
export const gatekeeperRulesSchema = z
  .object({
    email: gatekeeperEmailSchema.optional(),
    twitch: gatekeeperTwitchSchema.optional(),
    youtube: gatekeeperYoutubeSchema.optional(),
  })
  .nullable();

/**
 * Gatekeeper rules for space access control
 */
export type GatekeeperRules = z.infer<typeof gatekeeperRulesSchema>;

/**
 * Zod schema for space settings validation
 */
export const spaceSettingsSchema = z
  .object({
    hide_metadata_before_join: z.boolean().optional(),
  })
  .nullable();

/**
 * Space settings configuration
 */
export type SpaceSettings = z.infer<typeof spaceSettingsSchema>;

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
