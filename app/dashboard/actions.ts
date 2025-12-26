"use server";

import { randomUUID } from "node:crypto";
import { format } from "date-fns";
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

    const { error } = await supabase
      .from("spaces")
      .insert({
        id: uuid,
        settings: {},
        share_key: fullSlug,
        status: "active",
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
