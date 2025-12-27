"use server";

import { createClient } from "@/lib/supabase/server";

export interface UnlinkIdentityState {
  error?: string;
  success: boolean;
}

export async function unlinkIdentity(
  provider: string
): Promise<UnlinkIdentityState> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    const identities = user.identities || [];

    if (identities.length <= 1) {
      return {
        error: "最低1つのログイン手段を残す必要があります",
        success: false,
      };
    }

    const identity = identities.find((id) => id.provider === provider);

    if (!identity) {
      return {
        error: "指定されたプロバイダーは連携されていません",
        success: false,
      };
    }

    const { error } = await supabase.auth.unlinkIdentity(identity);

    if (error) {
      console.error("Unlink identity error:", error);
      return {
        error: "連携解除に失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error unlinking identity:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}
