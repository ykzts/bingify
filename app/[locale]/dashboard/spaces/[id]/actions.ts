"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";

export interface CallNumberResult {
  error?: string;
  success: boolean;
}

export interface CalledNumber {
  called_at: string;
  id: string;
  space_id: string;
  value: number;
}

export async function callNumber(
  spaceId: string,
  number: number
): Promise<CallNumberResult> {
  try {
    if (!isValidUUID(spaceId)) {
      return {
        error: "Invalid space ID",
        success: false,
      };
    }

    if (!Number.isInteger(number) || number < 1 || number > 75) {
      return {
        error: "Number must be an integer between 1 and 75",
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

    const { data: space } = await supabase
      .from("spaces")
      .select("owner_id, status")
      .eq("id", spaceId)
      .single();

    if (!space || space.owner_id !== user.id) {
      return {
        error: "Permission denied",
        success: false,
      };
    }

    // Block number calling if space is in draft status
    if (space.status === "draft") {
      return {
        error: "スペースが準備中のため、番号を呼び出せません。設定画面で公開してください。",
        success: false,
      };
    }

    const { error } = await supabase.from("called_numbers").insert({
      space_id: spaceId,
      value: number,
    });

    if (error) {
      if (error.code === "23505") {
        return {
          error: "Number already called",
          success: false,
        };
      }
      console.error("Database error:", error);
      return {
        error: "Failed to call number",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error calling number:", error);
    return {
      error: "An error occurred",
      success: false,
    };
  }
}

export async function getCalledNumbers(
  spaceId: string
): Promise<CalledNumber[]> {
  try {
    if (!isValidUUID(spaceId)) {
      return [];
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("called_numbers")
      .select("id, space_id, value, called_at")
      .eq("space_id", spaceId)
      .order("called_at", { ascending: true });

    if (error) {
      console.error("Error fetching called numbers:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error getting called numbers:", error);
    return [];
  }
}

export async function resetGame(spaceId: string): Promise<CallNumberResult> {
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

    const { data: space } = await supabase
      .from("spaces")
      .select("owner_id")
      .eq("id", spaceId)
      .single();

    if (!space || space.owner_id !== user.id) {
      return {
        error: "Permission denied",
        success: false,
      };
    }

    const { error } = await supabase
      .from("called_numbers")
      .delete()
      .eq("space_id", spaceId);

    if (error) {
      console.error("Database error:", error);
      return {
        error: "Failed to reset game",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error resetting game:", error);
    return {
      error: "An error occurred",
      success: false,
    };
  }
}

export interface CloseSpaceResult {
  error?: string;
  success: boolean;
}

export async function closeSpace(spaceId: string): Promise<CloseSpaceResult> {
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

    const { error, count } = await supabase
      .from("spaces")
      .update({ status: "archived" })
      .eq("id", spaceId)
      .eq("owner_id", user.id);

    if (error) {
      console.error("Database error:", error);
      return {
        error: "Failed to close space",
        success: false,
      };
    }

    if (count === 0) {
      return {
        error: "Space not found or permission denied",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error closing space:", error);
    return {
      error: "An error occurred",
      success: false,
    };
  }
}
