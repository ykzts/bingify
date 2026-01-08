"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserProfile {
  email: string | null;
  full_name: string | null;
}

export interface GetUserProfileResult {
  data?: UserProfile;
  error?: string;
}

/**
 * ログイン済みユーザーのプロファイル情報を取得する
 */
export async function getUserProfile(): Promise<GetUserProfileResult> {
  try {
    const supabase = await createClient();

    // 認証状態を確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "unauthorized",
      };
    }

    // プロファイル情報を取得
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch user profile:", profileError);
      return {
        error: "profile_fetch_failed",
      };
    }

    return {
      data: {
        email: profile.email,
        full_name: profile.full_name,
      },
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return {
      error: "unknown_error",
    };
  }
}
