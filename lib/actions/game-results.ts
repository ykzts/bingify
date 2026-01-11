"use server";

import type { BingoLine } from "@/lib/utils/bingo-checker";
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

export interface RecordGameResultInput {
  bingoLines: BingoLine[];
  spaceId: string;
}

export interface RecordGameResultResult {
  error?: string;
  resultId?: string;
  success: boolean;
}

/**
 * ビンゴ達成時にゲーム結果を記録する
 * この関数はサーバーサイドから呼び出される（service_role権限）
 */
export async function recordGameResult(
  input: RecordGameResultInput
): Promise<RecordGameResultResult> {
  try {
    if (!isValidUUID(input.spaceId)) {
      return {
        error: "Invalid space ID",
        success: false,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "Authentication required",
        success: false,
      };
    }

    // パターンタイプを判定
    const patternType = determinePatternType(input.bingoLines);

    // パターン詳細をJSON形式で保存
    const patternDetails = input.bingoLines.map((line) => ({
      index: line.index,
      type: line.type,
    }));

    const { data: result, error } = await supabase
      .from("game_results")
      .insert({
        pattern_details: patternDetails,
        pattern_type: patternType,
        space_id: input.spaceId,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error recording game result:", error);
      return {
        error: "Failed to record game result",
        success: false,
      };
    }

    return {
      resultId: result.id,
      success: true,
    };
  } catch (error) {
    console.error("Error in recordGameResult:", error);
    return {
      error: "An error occurred",
      success: false,
    };
  }
}

/**
 * スペースのゲーム結果一覧を取得する
 * スペースオーナーまたは管理者のみがアクセス可能
 */
export async function getGameResults(
  spaceId: string
): Promise<GetGameResultsResult> {
  try {
    if (!isValidUUID(spaceId)) {
      return {
        error: "Invalid space ID",
        success: false,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "Authentication required",
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
        error: "Space not found",
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
      .single();

    const isAdmin = !!adminRole;

    if (!isOwner && !isAdmin) {
      return {
        error: "Permission denied",
        success: false,
      };
    }

    // ゲーム結果を取得（プロフィール情報含む）
    const { data: results, error } = await supabase
      .from("game_results")
      .select(
        `
        *,
        profiles:user_id (
          email,
          full_name
        )
      `
      )
      .eq("space_id", spaceId)
      .order("achieved_at", { ascending: false });

    if (error) {
      console.error("Error fetching game results:", error);
      return {
        error: "Failed to fetch game results",
        success: false,
      };
    }

    return {
      results: results as GameResultWithProfile[],
      success: true,
    };
  } catch (error) {
    console.error("Error in getGameResults:", error);
    return {
      error: "An error occurred",
      success: false,
    };
  }
}

/**
 * ビンゴラインからパターンタイプを判定する
 */
function determinePatternType(bingoLines: BingoLine[]): string {
  if (bingoLines.length === 0) {
    return "none";
  }

  if (bingoLines.length > 1) {
    return "multiple";
  }

  const line = bingoLines[0];
  return line.type;
}
