import { createClient } from "@/lib/supabase/server";
import {
  type GatekeeperRules,
  gatekeeperRulesSchema,
  type Space,
  type SpaceSettings,
  spaceSettingsSchema,
} from "@/lib/types/space";
import type { Tables } from "@/types/supabase";

/**
 * Get a space by ID with validated JSONB columns
 * @param id - The space ID
 * @returns Space with validated settings and gatekeeper_rules, or null if not found
 */
export async function getSpace(id: string): Promise<Space | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  // Validate and parse JSONB columns
  const gatekeeperValidation = gatekeeperRulesSchema.safeParse(
    data.gatekeeper_rules
  );
  const settingsValidation = spaceSettingsSchema.safeParse(data.settings);

  // Use default values if validation fails
  const gatekeeper_rules: GatekeeperRules | null = gatekeeperValidation.success
    ? gatekeeperValidation.data
    : null;

  const settings: SpaceSettings | null = settingsValidation.success
    ? settingsValidation.data
    : null;

  // Return space with validated JSONB fields
  return {
    ...data,
    gatekeeper_rules,
    settings,
  };
}

/**
 * Get a space by share key with validated JSONB columns
 * @param shareKey - The space share key
 * @returns Space with validated settings and gatekeeper_rules, or null if not found
 */
export async function getSpaceByShareKey(
  shareKey: string
): Promise<Space | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .eq("share_key", shareKey)
    .single();

  if (error || !data) {
    return null;
  }

  // Validate and parse JSONB columns
  const gatekeeperValidation = gatekeeperRulesSchema.safeParse(
    data.gatekeeper_rules
  );
  const settingsValidation = spaceSettingsSchema.safeParse(data.settings);

  // Use default values if validation fails
  const gatekeeper_rules: GatekeeperRules | null = gatekeeperValidation.success
    ? gatekeeperValidation.data
    : null;

  const settings: SpaceSettings | null = settingsValidation.success
    ? settingsValidation.data
    : null;

  // Return space with validated JSONB fields
  return {
    ...data,
    gatekeeper_rules,
    settings,
  };
}

/**
 * Get multiple spaces with validated JSONB columns
 * @param ids - Array of space IDs
 * @returns Array of spaces with validated settings and gatekeeper_rules
 */
export async function getSpaces(ids: string[]): Promise<Space[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .in("id", ids);

  if (error || !data) {
    return [];
  }

  // Validate and parse JSONB columns for each space
  return data.map((space) => {
    const gatekeeperValidation = gatekeeperRulesSchema.safeParse(
      space.gatekeeper_rules
    );
    const settingsValidation = spaceSettingsSchema.safeParse(space.settings);

    const gatekeeper_rules: GatekeeperRules | null =
      gatekeeperValidation.success ? gatekeeperValidation.data : null;

    const settings: SpaceSettings | null = settingsValidation.success
      ? settingsValidation.data
      : null;

    return {
      ...space,
      gatekeeper_rules,
      settings,
    };
  });
}

/**
 * Helper to validate raw space data from Supabase
 * This can be used when you've already fetched data and need to validate it
 */
export function validateSpaceData(
  data: Tables<"spaces">
): Omit<Space, keyof Tables<"spaces">> {
  const gatekeeperValidation = gatekeeperRulesSchema.safeParse(
    data.gatekeeper_rules
  );
  const settingsValidation = spaceSettingsSchema.safeParse(data.settings);

  const gatekeeper_rules: GatekeeperRules | null = gatekeeperValidation.success
    ? gatekeeperValidation.data
    : null;

  const settings: SpaceSettings | null = settingsValidation.success
    ? settingsValidation.data
    : null;

  return {
    gatekeeper_rules,
    settings,
  };
}
