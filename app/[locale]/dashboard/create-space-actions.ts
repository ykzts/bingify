"use server";

import { randomUUID } from "node:crypto";
import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { format } from "date-fns";
import { generateSecureToken } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import {
  type CreateSpaceFormValues,
  createSpaceFormOpts,
} from "./form-options";

const MAX_SLUG_SUGGESTIONS = 10;

async function findAvailableShareKey(
  baseShareKey: string,
  dateSuffix: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  // Try suggestions with incrementing numbers
  for (let i = 2; i <= MAX_SLUG_SUGGESTIONS; i++) {
    const suggestion = `${baseShareKey}-${i}-${dateSuffix}`;
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

// Create the server validation function
const serverValidate = createServerValidate({
  ...createSpaceFormOpts,
  onServerValidate: async ({ value }: { value: CreateSpaceFormValues }) => {
    const supabase = await createClient();
    const dateSuffix = format(new Date(), "yyyyMMdd");
    const fullShareKey = `${value.share_key}-${dateSuffix}`;

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        form: "認証が必要です。ログインしてください。",
      };
    }

    // Check user role for space creation permission
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch user profile:", profileError);
      return {
        form: "プロフィール情報の取得に失敗しました。",
      };
    }

    // Only admin and organizer can create spaces
    if (profile.role === "user") {
      return {
        form: "スペースを作成する権限がありません。",
      };
    }

    // Check system settings for max spaces per user and global limit
    const { data: systemSettings, error: settingsError } = await supabase
      .from("system_settings")
      .select("max_spaces_per_user, max_total_spaces")
      .eq("id", 1)
      .single();

    if (settingsError) {
      console.error("Failed to fetch system settings:", settingsError);
    } else if (systemSettings) {
      // Check global space limit first (if not 0/unlimited)
      if (systemSettings.max_total_spaces > 0) {
        const { count: totalSpaceCount, error: totalCountError } =
          await supabase
            .from("spaces")
            .select("id", { count: "exact", head: true })
            .neq("status", "closed");

        if (totalCountError) {
          console.error("Failed to count total spaces:", totalCountError);
          return {
            form: "スペースの総数確認に失敗しました。",
          };
        }

        if (
          totalSpaceCount !== null &&
          totalSpaceCount >= systemSettings.max_total_spaces
        ) {
          return {
            form: "システム全体のスペース作成上限に達しています。",
          };
        }
      }

      // Count user's existing active spaces (excluding closed)
      const { count: userSpaceCount, error: countError } = await supabase
        .from("spaces")
        .select("id", { count: "exact" })
        .eq("owner_id", user.id)
        .neq("status", "closed");

      if (countError) {
        console.error("Failed to count user spaces:", countError);
        return {
          form: "ユーザーのスペース数確認に失敗しました。",
        };
      }

      if (
        userSpaceCount !== null &&
        userSpaceCount >= systemSettings.max_spaces_per_user
      ) {
        return {
          form: `作成できるスペースの上限（${systemSettings.max_spaces_per_user}個）に達しています。`,
        };
      }
    }

    // Check if share key is already taken
    const { data: existing } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", fullShareKey)
      .single();

    if (existing) {
      return {
        fields: {
          share_key: "この共有キーは既に使用されています",
        },
      };
    }

    // If all validations pass, return undefined
    return undefined;
  },
});

export interface CreateSpaceActionState {
  error?: string;
  shareKey?: string;
  spaceId?: string;
  success?: boolean;
  suggestion?: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Function handles form validation, space creation, and error handling with database operations
export async function createSpaceAction(
  _prevState: unknown,
  formData: FormData
) {
  try {
    // Validate the form data
    const validatedData = await serverValidate(formData);

    // If validation passes, create the space
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ...initialFormState,
        errors: ["認証が必要です。ログインしてください。"],
      };
    }

    const dateSuffix = format(new Date(), "yyyyMMdd");
    const fullShareKey = `${validatedData.share_key}-${dateSuffix}`;

    // Double check if the share key is still available (race condition)
    const { data: existing } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", fullShareKey)
      .single();

    if (existing) {
      // Find an available suggestion
      const suggestion = await findAvailableShareKey(
        validatedData.share_key,
        dateSuffix,
        supabase
      );

      return {
        ...initialFormState,
        errors: ["この共有キーは既に使用されています"],
        values: { share_key: validatedData.share_key },
        errorMap: {
          onChange: suggestion
            ? `この共有キーは既に使用されています。提案: ${suggestion}`
            : "この共有キーは既に使用されています",
        },
      };
    }

    // Create space in database with status: 'draft'
    const uuid = randomUUID();
    const viewToken = generateSecureToken();

    const { error } = await supabase
      .from("spaces")
      .insert({
        gatekeeper_rules: null,
        id: uuid,
        owner_id: user.id,
        settings: {},
        share_key: fullShareKey,
        status: "draft",
        view_token: viewToken,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return {
        ...initialFormState,
        errors: ["スペースの作成に失敗しました"],
      };
    }

    // Return success state with space ID for redirect
    return {
      ...initialFormState,
      values: { share_key: validatedData.share_key },
      meta: {
        success: true,
        spaceId: uuid,
        shareKey: fullShareKey,
      },
    };
  } catch (e) {
    // Check if it's a ServerValidateError from TanStack Form
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }

    // Some other error occurred
    console.error("Error creating space:", e);
    return {
      ...initialFormState,
      errors: ["予期しないエラーが発生しました"],
    };
  }
}

// Keep the existing checkShareKeyAvailability function
export async function checkShareKeyAvailability(shareKey: string) {
  try {
    const dateSuffix = format(new Date(), "yyyyMMdd");
    const fullShareKey = `${shareKey}-${dateSuffix}`;

    const supabase = await createClient();
    const { data } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", fullShareKey)
      .single();

    return { available: !data };
  } catch (error) {
    console.error("Share key check error:", error);
    return { available: false };
  }
}
