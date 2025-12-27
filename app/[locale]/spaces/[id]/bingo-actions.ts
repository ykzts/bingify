"use server";

import { createClient } from "@/lib/supabase/server";
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

const BINGO_CARD_SIZE = 5;
const NUMBERS_PER_COLUMN = 15;
const FREE_SPACE_ROW = 2;
const FREE_SPACE_COL = 2;
const FREE_SPACE_VALUE = 0;

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
