"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";
import type { Tables } from "@/types/supabase";

export type GameResult = Tables<"game_results">;

export interface GameResultWithProfile extends GameResult {
  profiles: {
    email: string | null;
    full_name: string | null;
  } | null;
}

export interface GetGameResultsResult {
  error?: string;
  results?: GameResultWithProfile[];
  success: boolean;
}

/**
 * スペースのゲーム結果一覧を取得する
 * スペースオーナーまたは管理者のみがアクセス可能
 */
export async function getGameResults(
  spaceId: string
): Promise<GetGameResultsResult> {
  const t = await getTranslations("GameResultActions");
  
  try {
    if (!isValidUUID(spaceId)) {
      return {
        error: t("errorInvalidSpaceId"),
        success: false,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: t("errorUnauthorized"),
        success: false,
      };
    }

    // 権限チェック: オーナーまたは管理者ロール
    const { data: space } = await supabase
      .from("spaces")
      .select("owner_id")
      .eq("id", spaceId)
      .single();

    if (!space) {
      return {
        error: t("errorSpaceNotFound"),
        success: false,
      };
    }

    const isOwner = space.owner_id === user.id;

    // 管理者ロールをチェック
    const { data: adminRole } = await supabase
      .from("space_roles")
      .select("id")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminRole;

    if (!(isOwner || isAdmin)) {
      return {
        error: t("errorPermissionDenied"),
        success: false,
      };
    }

    // ゲーム結果を取得
    const { data: results, error } = await supabase
      .from("game_results")
      .select("*")
      .eq("space_id", spaceId)
      .order("achieved_at", { ascending: false });

    if (error) {
      console.error("Error fetching game results:", error);
      return {
        error: t("errorFetchResults"),
        success: false,
      };
    }

    if (!results || results.length === 0) {
      return {
        results: [],
        success: true,
      };
    }

    // ユーザーIDのリストを取得
    const userIds = [...new Set(results.map((r) => r.user_id))];

    // プロフィール情報を取得
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.warn("Failed to fetch profiles for game results:", profilesError);
      // プロフィール情報がなくても結果は返す
    }

    // プロフィール情報をマージ
    const profilesMap = new Map(
      profiles?.map((p) => [p.id, { email: p.email, full_name: p.full_name }])
    );

    const resultsWithProfiles: GameResultWithProfile[] = results.map(
      (result) => ({
        ...result,
        profiles: profilesMap.get(result.user_id) || null,
      })
    );

    return {
      results: resultsWithProfiles,
      success: true,
    };
  } catch (error) {
    console.error("Error in getGameResults:", error);
    return {
      error: t("errorGeneric"),
      success: false,
    };
  }
}
