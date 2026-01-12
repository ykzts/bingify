"use server";

import { createClient } from "@/lib/supabase/server";
import type { BingoLine } from "@/lib/utils/bingo-checker";
import { isValidUUID } from "@/lib/utils/uuid";

export interface BingoCard {
  created_at: string;
  id: string;
  numbers: number[][];
  space_id: string;
  user_id: string;
}

export interface BingoCardResult {
  card?: BingoCard;
  error?: string;
  success: boolean;
}

export interface UpdateBingoStatusResult {
  error?: string;
  success: boolean;
}

export interface UpdateBingoStatusWithLinesInput {
  bingoLines?: BingoLine[];
  spaceId: string;
  status: "none" | "reach" | "bingo";
}

const BINGO_CARD_SIZE = 5;
const NUMBERS_PER_COLUMN = 15;
const FREE_SPACE_ROW = 2;
const FREE_SPACE_COL = 2;
const FREE_SPACE_VALUE = 0;

/**
 * Generates a bingo card following American bingo specification:
 * - B column (col 0): numbers 1-15
 * - I column (col 1): numbers 16-30
 * - N column (col 2): numbers 31-45 with FREE space at center [2][2]
 * - G column (col 3): numbers 46-60
 * - O column (col 4): numbers 61-75
 * Each column contains 5 randomly selected numbers from its range.
 */
function generateBingoCard(): number[][] {
  const card: number[][] = [];

  for (let col = 0; col < BINGO_CARD_SIZE; col++) {
    const min = col * NUMBERS_PER_COLUMN + 1;
    const max = col * NUMBERS_PER_COLUMN + NUMBERS_PER_COLUMN;

    const availableNumbers = Array.from(
      { length: max - min + 1 },
      (_, i) => min + i
    );

    for (let i = availableNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableNumbers[i], availableNumbers[j]] = [
        availableNumbers[j],
        availableNumbers[i],
      ];
    }

    const columnNumbers = availableNumbers.slice(0, BINGO_CARD_SIZE);

    for (let row = 0; row < BINGO_CARD_SIZE; row++) {
      if (!card[row]) {
        card[row] = [];
      }
      card[row][col] = columnNumbers[row];
    }
  }

  card[FREE_SPACE_ROW][FREE_SPACE_COL] = FREE_SPACE_VALUE;

  return card;
}

export async function getOrCreateBingoCard(
  spaceId: string
): Promise<BingoCardResult> {
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

    const { data: participant } = await supabase
      .from("participants")
      .select("id")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      return {
        error: "You must join the space before getting a bingo card",
        success: false,
      };
    }

    const { data: existingCard } = await supabase
      .from("bingo_cards")
      .select("id, space_id, user_id, numbers, created_at")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .single();

    if (existingCard) {
      return {
        card: existingCard as BingoCard,
        success: true,
      };
    }

    const numbers = generateBingoCard();

    const { data: newCard, error } = await supabase
      .from("bingo_cards")
      .insert({
        numbers,
        space_id: spaceId,
        user_id: user.id,
      })
      .select("id, space_id, user_id, numbers, created_at")
      .single();

    if (error) {
      console.error("Error creating bingo card:", error);
      return {
        error: "Failed to create bingo card",
        success: false,
      };
    }

    return {
      card: newCard as BingoCard,
      success: true,
    };
  } catch (error) {
    console.error("Error getting or creating bingo card:", error);
    return {
      error: "An error occurred",
      success: false,
    };
  }
}

/**
 * Update participant's bingo status (none, reach, or bingo)
 * If status is "bingo" and bingoLines are provided, also record game result
 */
export async function updateBingoStatusWithLines(
  input: UpdateBingoStatusWithLinesInput
): Promise<UpdateBingoStatusResult> {
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

    // participantsテーブルのbingo_statusを更新
    const { error: statusError } = await supabase
      .from("participants")
      .update({ bingo_status: input.status })
      .eq("space_id", input.spaceId)
      .eq("user_id", user.id);

    if (statusError) {
      console.error("Error updating bingo status:", statusError);
      return {
        error: "Failed to update bingo status",
        success: false,
      };
    }

    // ビンゴ達成時にゲーム結果を記録
    if (
      input.status === "bingo" &&
      input.bingoLines &&
      input.bingoLines.length > 0
    ) {
      // パターンタイプを判定
      const patternType =
        input.bingoLines.length > 1 ? "multiple" : input.bingoLines[0].type;

      // パターン詳細をJSON形式で保存
      const patternDetails = input.bingoLines.map((line) => ({
        index: line.index,
        type: line.type,
      }));

      const { error: resultError } = await supabase
        .from("game_results")
        .insert({
          pattern_details: patternDetails,
          pattern_type: patternType,
          space_id: input.spaceId,
          user_id: user.id,
        });

      if (resultError) {
        // ゲーム結果の記録に失敗してもステータス更新は成功として扱う
        console.error("Error recording game result:", resultError);
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in updateBingoStatusWithLines:", error);
    return {
      error: "An error occurred",
      success: false,
    };
  }
}

/**
 * Update participant's bingo status (none, reach, or bingo)
 * @deprecated Use updateBingoStatusWithLines instead to record game results
 */
export async function updateBingoStatus(
  spaceId: string,
  status: "none" | "reach" | "bingo"
): Promise<UpdateBingoStatusResult> {
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

    const { error } = await supabase
      .from("participants")
      .update({ bingo_status: status })
      .eq("space_id", spaceId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating bingo status:", error);
      return {
        error: "Failed to update bingo status",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating bingo status:", error);
    return {
      error: "An error occurred",
      success: false,
    };
  }
}
