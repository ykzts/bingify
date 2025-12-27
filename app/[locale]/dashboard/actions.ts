"use server";

import { randomUUID } from "node:crypto";
import { format } from "date-fns";
import { spaceSchema } from "@/lib/schemas/space";
import { createClient } from "@/lib/supabase/server";
import { generateSecureToken } from "@/lib/utils/crypto";

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
        error: "認証が必要です",
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
        error: "スペースの作成に失敗しました",
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
      error: "予期しないエラーが発生しました",
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
        error: "認証が必要です",
        success: false,
      };
    }

    // Check if user is the owner
    const { data: space } = await supabase
      .from("spaces")
      .select("owner_id")
      .eq("id", spaceId)
      .single();

    if (!space) {
      return {
        error: "スペースが見つかりません",
        success: false,
      };
    }

    if (space.owner_id !== user.id) {
      return {
        error: "このスペースの編集権限がありません",
        success: false,
      };
    }

    // Generate new token
    const newToken = generateSecureToken();

    // Update the space with new token
    const { error } = await supabase
      .from("spaces")
      .update({ view_token: newToken })
      .eq("id", spaceId);

    if (error) {
      console.error("Database error:", error);
      return {
        error: "トークンの再生成に失敗しました",
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
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}
