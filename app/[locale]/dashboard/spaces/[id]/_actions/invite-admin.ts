"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/utils/create-notification";
import { isValidUUID } from "@/lib/utils/uuid";
import {
  type InviteAdminFormValues,
  inviteAdminFormOpts,
} from "../_lib/form-options";

async function checkUserAuthentication(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です。ログインしてください。", user: null };
  }

  return { error: null, user };
}

async function checkSpaceOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string
) {
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("owner_id, title, share_key")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space) {
    return { error: "スペースが見つかりませんでした", space: null };
  }

  if (space.owner_id !== userId) {
    return { error: "オーナーのみが管理者を招待できます", space: null };
  }

  return { error: null, space };
}

async function findUserByEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string
) {
  const { data: targetUser, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !targetUser) {
    return {
      error: "このメールアドレスのユーザーが見つかりませんでした",
      targetUser: null,
    };
  }

  return { error: null, targetUser };
}

async function checkExistingAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string,
  ownerId: string
) {
  // Check if user is already the owner
  if (userId === ownerId) {
    return { error: "オーナーは管理者として追加できません" };
  }

  // Check if user is already an admin
  const { data: existingRole } = await supabase
    .from("space_roles")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .single();

  if (existingRole) {
    return { error: "このユーザーは既に管理者です" };
  }

  return { error: null };
}

export async function inviteAdminAction(
  spaceId: string,
  _prevState: unknown,
  formData: FormData
) {
  try {
    // Create the server validation function
    const serverValidate = createServerValidate({
      ...inviteAdminFormOpts,
      onServerValidate: async ({ value }: { value: InviteAdminFormValues }) => {
        if (!isValidUUID(spaceId)) {
          return { form: "無効なスペースIDです" };
        }

        const supabase = await createClient();

        // Check authentication
        const { error: authError, user } =
          await checkUserAuthentication(supabase);
        if (authError || !user) {
          return { form: authError || "認証が必要です。" };
        }

        // Check space ownership
        const { error: ownerError, space } = await checkSpaceOwnership(
          supabase,
          spaceId,
          user.id
        );
        if (ownerError) {
          return { form: ownerError };
        }
        if (!space) {
          return { form: "権限がありません。" };
        }

        // Find user by email
        const { error: userError, targetUser } = await findUserByEmail(
          supabase,
          value.email
        );
        if (userError) {
          return {
            fields: {
              email: userError,
            },
          };
        }
        if (!targetUser) {
          return {
            fields: {
              email: "ユーザーが見つかりませんでした",
            },
          };
        }

        // Check if already an admin
        // Note: space.owner_id is guaranteed to exist because checkSpaceOwnership validates it
        const { error: adminError } = await checkExistingAdmin(
          supabase,
          spaceId,
          targetUser.id,
          // biome-ignore lint/style/noNonNullAssertion: owner_id is guaranteed by checkSpaceOwnership validation
          space.owner_id!
        );
        if (adminError) {
          return {
            fields: {
              email: adminError,
            },
          };
        }

        return undefined;
      },
    });

    // Validate the form data
    const validatedData = await serverValidate(formData);

    // If validation passes, insert the admin role
    const supabase = await createClient();

    // Find user by email (validation already confirmed this exists)
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", validatedData.email)
      .single();

    if (!targetUser) {
      // This should not happen after validation, but handle gracefully
      return {
        ...initialFormState,
        errors: ["ユーザー情報の取得に失敗しました"],
      };
    }

    // Add user as admin
    const { error: insertError } = await supabase.from("space_roles").insert({
      role: "admin",
      space_id: spaceId,
      user_id: targetUser.id,
    });

    if (insertError) {
      console.error("Database error:", insertError);
      return {
        ...initialFormState,
        errors: ["管理者の追加に失敗しました"],
      };
    }

    // Get space information for notification
    const { data: spaceData } = await supabase
      .from("spaces")
      .select("title, share_key")
      .eq("id", spaceId)
      .single();

    // Create notification for the invited user
    if (spaceData) {
      const spaceTitle = spaceData.title || spaceData.share_key;
      const linkUrl = `/dashboard/spaces/${spaceId}`;

      await createNotification(
        targetUser.id,
        "space_invitation",
        `スペース「${spaceTitle}」への招待`,
        "あなたはスペースの管理者として招待されました",
        linkUrl,
        {
          space_id: spaceId,
        }
      );
    }

    // Return success state
    return {
      ...initialFormState,
      meta: {
        success: true,
      },
      values: { email: "" }, // Reset form
    };
  } catch (e) {
    // Check if it's a ServerValidateError from TanStack Form
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }

    // Some other error occurred
    console.error("Error inviting admin:", e);
    return {
      ...initialFormState,
      errors: ["予期しないエラーが発生しました"],
    };
  }
}
