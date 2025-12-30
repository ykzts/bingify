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
        error: "Cannot call numbers while space is in draft status",
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

export interface Participant {
  bingo_status: "none" | "reach" | "bingo";
  id: string;
  joined_at: string;
  profiles?: {
    display_name: string | null;
  };
  user_id: string;
}

export async function getParticipants(spaceId: string): Promise<Participant[]> {
  try {
    if (!isValidUUID(spaceId)) {
      return [];
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: space } = await supabase
      .from("spaces")
      .select("owner_id")
      .eq("id", spaceId)
      .single();

    if (!space || space.owner_id !== user.id) {
      return [];
    }

    const { data, error } = await supabase
      .from("participants")
      .select(
        `
        id,
        user_id,
        joined_at,
        bingo_status,
        profiles:user_id (
          display_name
        )
      `
      )
      .eq("space_id", spaceId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching participants:", error);
      return [];
    }

    // Transform the data to match our interface
    const participants = (data || []).map((p) => ({
      bingo_status: p.bingo_status,
      id: p.id,
      joined_at: p.joined_at,
      profiles: Array.isArray(p.profiles)
        ? p.profiles[0]
        : (p.profiles as { display_name: string | null } | undefined),
      user_id: p.user_id,
    }));

    // Sort by bingo status priority (bingo > reach > none) then by joined_at
    const statusPriority: Record<"bingo" | "reach" | "none", number> = {
      bingo: 0,
      reach: 1,
      none: 2,
    };
    return participants.sort((a, b) => {
      const priorityDiff =
        statusPriority[a.bingo_status] - statusPriority[b.bingo_status];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    });
  } catch (error) {
    console.error("Error getting participants:", error);
    return [];
  }
}
