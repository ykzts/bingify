"use server";

import { randomUUID } from "node:crypto";
import { format } from "date-fns";
import { generateSecureToken } from "@/lib/crypto";
import { spaceSchema } from "@/lib/schemas/space";
import { createClient } from "@/lib/supabase/server";

const MAX_SLUG_SUGGESTIONS = 10;

export interface CreateSpaceState {
  success: boolean;
  error?: string;
  spaceId?: string;
  shareKey?: string;
  suggestion?: string;
}

export async function checkSlugAvailability(slug: string) {
  try {
    const dateSuffix = format(new Date(), "yyyyMMdd");
    const fullSlug = `${slug}-${dateSuffix}`;

    const supabase = await createClient();
    const { data } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", fullSlug)
      .single();

    return { available: !data };
  } catch (error) {
    console.error("Slug check error:", error);
    return { available: false };
  }
}

async function findAvailableSlug(
  baseSlug: string,
  dateSuffix: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  // Try suggestions with incrementing numbers
  for (let i = 2; i <= MAX_SLUG_SUGGESTIONS; i++) {
    const suggestion = `${baseSlug}-${i}-${dateSuffix}`;
    const { data } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", suggestion)
      .single();

    if (!data) {
      return suggestion;
    }
  }

  // If no suggestion found within max attempts, return null
  return null;
}

export async function createSpace(
  _prevState: CreateSpaceState,
  formData: FormData
): Promise<CreateSpaceState> {
  try {
    const slug = formData.get("slug") as string;

    // Validate input with Zod
    const validation = spaceSchema.safeParse({ slug });
    if (!validation.success) {
      return {
        error: validation.error.issues[0].message,
        success: false,
      };
    }

    // Generate full slug with date suffix
    const dateSuffix = format(new Date(), "yyyyMMdd");
    const fullSlug = `${slug}-${dateSuffix}`;

    // Check availability
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", fullSlug)
      .single();

    if (existing) {
      // Find an available suggestion
      const suggestion = await findAvailableSlug(slug, dateSuffix, supabase);

      if (!suggestion) {
        return {
          error:
            "利用可能なスラグが見つかりませんでした。別の名前をお試しください。",
          success: false,
        };
      }

      return {
        error: "このスラグは既に使用されています",
        success: false,
        suggestion,
      };
    }

    // Create space in database
    const uuid = randomUUID();
    const viewToken = generateSecureToken();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "Authentication required",
        success: false,
      };
    }

    const { error } = await supabase
      .from("spaces")
      .insert({
        id: uuid,
        owner_id: user.id,
        settings: {},
        share_key: fullSlug,
        status: "active",
        view_token: viewToken,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return {
        error: "Failed to create space",
        success: false,
      };
    }

    return {
      shareKey: fullSlug,
      spaceId: uuid,
      success: true,
    };
  } catch (error) {
    console.error("Error creating space:", error);
    return {
      error: "An unexpected error occurred",
      success: false,
    };
  }
}

export interface RegenerateViewTokenState {
  error?: string;
  success: boolean;
  viewToken?: string;
}

export async function regenerateViewToken(
  spaceId: string
): Promise<RegenerateViewTokenState> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "Authentication required",
        success: false,
      };
    }

    // Generate new token
    const newToken = generateSecureToken();

    // Update the space with new token
    // RLS policy ensures only the owner can update
    const { error, count } = await supabase
      .from("spaces")
      .update({ view_token: newToken })
      .eq("id", spaceId)
      .eq("owner_id", user.id);

    if (error) {
      console.error("Database error:", error);
      return {
        error: "Failed to regenerate token",
        success: false,
      };
    }

    // Check if any row was updated (user must be owner)
    if (count === 0) {
      return {
        error: "Space not found or access denied",
        success: false,
      };
    }

    return {
      success: true,
      viewToken: newToken,
    };
  } catch (error) {
    console.error("Error regenerating token:", error);
    return {
      error: "An unexpected error occurred",
      success: false,
    };
  }
}
