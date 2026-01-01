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
 * Validate and extract JSONB fields from space data
 * @param data - Raw space data from Supabase
 * @returns Validated gatekeeper_rules and settings, or null if invalid
 */
function validateSpaceJsonFields(data: Tables<"spaces">): {
  gatekeeper_rules: GatekeeperRules | null;
  settings: SpaceSettings | null;
} {
  const gatekeeperValidation = gatekeeperRulesSchema.safeParse(
    data.gatekeeper_rules
  );
  const settingsValidation = spaceSettingsSchema.safeParse(data.settings);

  return {
    gatekeeper_rules: gatekeeperValidation.success
      ? gatekeeperValidation.data
      : null,
    settings: settingsValidation.success ? settingsValidation.data : null,
  };
}

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

  const validated = validateSpaceJsonFields(data);

  return {
    ...data,
    ...validated,
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

  const validated = validateSpaceJsonFields(data);

  return {
    ...data,
    ...validated,
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

  return data.map((space) => {
    const validated = validateSpaceJsonFields(space);
    return {
      ...space,
      ...validated,
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
  return validateSpaceJsonFields(data);
}
