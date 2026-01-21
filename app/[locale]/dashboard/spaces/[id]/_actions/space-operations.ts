"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";

export interface ActionResult {
  error?: string;
  success: boolean;
}

export interface CallNumberResult extends ActionResult {}

export interface ResetGameState extends ActionResult {}

export async function callNumber(
  spaceId: string,
  number: number
): Promise<CallNumberResult> {
  const t = await getTranslations("SpaceOperations");

  try {
    if (!isValidUUID(spaceId)) {
      return {
        error: t("errorInvalidSpaceId"),
        success: false,
      };
    }

    if (!Number.isInteger(number) || number < 1 || number > 75) {
      return {
        error: t("errorInvalidNumber"),
        success: false,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: t("errorAuthRequired"),
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
        error: t("errorPermissionDenied"),
        success: false,
      };
    }

    // Block number calling if space is in draft status
    if (space.status === "draft") {
      return {
        error: t("errorCannotCallInDraft"),
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
          error: t("errorNumberAlreadyCalled"),
          success: false,
        };
      }
      console.error("Database error:", error);
      return {
        error: t("errorNumberCallFailed"),
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error calling number:", error);
    return {
      error: t("errorAnError"),
      success: false,
    };
  }
}

export async function resetGame(
  spaceId: string,
  _prevState: ResetGameState,
  _formData: FormData
): Promise<ResetGameState> {
  const t = await getTranslations("SpaceOperations");

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
        error: t("errorAuthRequired"),
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
        error: t("errorPermissionDenied"),
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
        error: t("errorResetFailed"),
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error resetting game:", error);
    return {
      error: t("errorAnError"),
      success: false,
    };
  }
}

export interface CloseSpaceResult {
  error?: string;
  success: boolean;
}

export async function closeSpace(spaceId: string): Promise<CloseSpaceResult> {
  const t = await getTranslations("SpaceOperations");

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
        error: t("errorAuthRequired"),
        success: false,
      };
    }

    const { error, count } = await supabase
      .from("spaces")
      .update({ status: "closed" })
      .eq("id", spaceId)
      .eq("owner_id", user.id);

    if (error) {
      console.error("Database error:", error);
      return {
        error: t("errorCloseSpaceFailed"),
        success: false,
      };
    }

    if (count === 0) {
      return {
        error: t("errorSpaceNotFoundOrPermissionDenied"),
        success: false,
      };
    }

    // TODO: 通知統合 - スペースがクローズされた際の通知作成
    // 実装時: 全参加者と管理者に通知を送信
    // 例: createNotification(userId, 'space_closed', ...)
    // 必要な情報: space情報（title, share_key）、全参加者と管理者のuser_id一覧

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error closing space:", error);
    return {
      error: t("errorAnError"),
      success: false,
    };
  }
}

export interface Participant {
  bingo_status: "none" | "reach" | "bingo";
  id: string;
  joined_at: string | null;
  profiles?: {
    avatar_url: string | null;
    full_name: string | null;
  } | null;
  user_id: string;
}

export interface GetParticipantsResult {
  data: Participant[];
  error?: string;
}

export async function getParticipants(
  spaceId: string
): Promise<GetParticipantsResult> {
  const t = await getTranslations("SpaceOperations");

  try {
    if (!isValidUUID(spaceId)) {
      console.error("[getParticipants] Invalid UUID:", spaceId);
      return { data: [], error: t("errorInvalidSpaceId") };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("[getParticipants] No authenticated user");
      return { data: [], error: t("errorNotAuthenticated") };
    }

    console.log("[getParticipants] User authenticated:", user.id);

    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("owner_id")
      .eq("id", spaceId)
      .single();

    if (spaceError) {
      console.error("[getParticipants] Error fetching space:", spaceError);
      return {
        data: [],
        error: t("errorSpaceFetchFailed"),
      };
    }

    if (!space) {
      console.error("[getParticipants] Space not found:", spaceId);
      return { data: [], error: t("errorSpaceNotFound") };
    }

    if (space.owner_id !== user.id) {
      console.error(
        "[getParticipants] User is not owner:",
        user.id,
        "vs",
        space.owner_id
      );
      return { data: [], error: t("errorPermissionDenied") };
    }

    console.log("[getParticipants] User is owner, fetching participants...");

    // Fetch participants first
    const { data: participantsData, error: participantsError } = await supabase
      .from("participants")
      .select("id, user_id, joined_at, bingo_status")
      .eq("space_id", spaceId)
      .order("joined_at", { ascending: true });

    if (participantsError) {
      console.error(
        "[getParticipants] Error fetching participants:",
        participantsError
      );
      return {
        data: [],
        error: t("errorParticipantsFetchFailed"),
      };
    }

    if (!participantsData || participantsData.length === 0) {
      console.log("[getParticipants] No participants found");
      return { data: [] };
    }

    // Fetch profiles for all participant user_ids
    const userIds = participantsData.map((p) => p.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      console.error(
        "[getParticipants] Error fetching profiles:",
        profilesError
      );
      // Continue without profiles rather than failing entirely
    }

    console.log(
      "[getParticipants] Successfully fetched participants:",
      participantsData.length
    );

    // Merge participants with profiles
    const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const data = participantsData.map((participant) => ({
      ...participant,
      profiles: profilesMap.get(participant.user_id) || null,
    }));

    // Transform the data to match our interface
    const participants: Participant[] = (data || []).map((p) => ({
      bingo_status: p.bingo_status as "none" | "reach" | "bingo",
      id: p.id,
      joined_at: p.joined_at,
      profiles: p.profiles,
      user_id: p.user_id,
    }));

    // Sort by bingo status priority (bingo > reach > none) then by joined_at
    const statusPriority: Record<"bingo" | "reach" | "none", number> = {
      bingo: 0,
      none: 2,
      reach: 1,
    };
    const sortedParticipants = participants.sort((a, b) => {
      const priorityDiff =
        statusPriority[a.bingo_status] - statusPriority[b.bingo_status];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return (
        new Date(a.joined_at || 0).getTime() -
        new Date(b.joined_at || 0).getTime()
      );
    });

    return { data: sortedParticipants };
  } catch (error) {
    console.error("Error getting participants:", error);
    return { data: [], error: t("errorGeneric") };
  }
}

export interface KickParticipantResult {
  error?: string;
  success: boolean;
}

export async function kickParticipant(
  spaceId: string,
  participantId: string
): Promise<KickParticipantResult> {
  const t = await getTranslations("SpaceOperations");

  try {
    if (!(isValidUUID(spaceId) && isValidUUID(participantId))) {
      return {
        error: t("errorInvalidId"),
        success: false,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: t("errorAuthRequired"),
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
        error: t("errorPermissionDenied"),
        success: false,
      };
    }

    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", participantId)
      .eq("space_id", spaceId);

    if (error) {
      console.error("Database error:", error);
      return {
        error: t("errorParticipantRemoveFailed"),
        success: false,
      };
    }

    // TODO: 通知統合 - 参加者がキックされた際の通知作成
    // 実装時: createNotification(participantUserId, 'participant_kicked', ...)
    // 必要な情報: participantのuser_id, space情報（title, share_key）

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error kicking participant:", error);
    return {
      error: t("errorAnError"),
      success: false,
    };
  }
}

export interface ParticipantCardData {
  card: {
    created_at: string;
    id: string;
    numbers: number[][];
    space_id: string;
    user_id: string;
  };
  participant: {
    bingo_status: "none" | "reach" | "bingo";
    full_name: string | null;
  };
}

export interface GetParticipantCardResult {
  data?: ParticipantCardData;
  error?: string;
  success: boolean;
}

export async function getParticipantCard(
  spaceId: string,
  participantId: string
): Promise<GetParticipantCardResult> {
  const t = await getTranslations("SpaceOperations");

  try {
    if (!(isValidUUID(spaceId) && isValidUUID(participantId))) {
      return {
        error: t("errorInvalidId"),
        success: false,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: t("errorAuthRequired"),
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
        error: t("errorPermissionDenied"),
        success: false,
      };
    }

    const { data: participant } = await supabase
      .from("participants")
      .select("bingo_status, user_id")
      .eq("space_id", spaceId)
      .eq("id", participantId)
      .single();

    if (!participant) {
      return {
        error: t("errorParticipantNotFound"),
        success: false,
      };
    }

    const { data: card } = await supabase
      .from("bingo_cards")
      .select("id, space_id, user_id, numbers, created_at")
      .eq("space_id", spaceId)
      .eq("user_id", participant.user_id)
      .single();

    if (!card) {
      return {
        error: t("errorGeneric"),
        success: false,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", participant.user_id)
      .single();

    return {
      data: {
        card: card as ParticipantCardData["card"],
        participant: {
          bingo_status: participant.bingo_status as "none" | "reach" | "bingo",
          full_name: profile?.full_name || null,
        },
      },
      success: true,
    };
  } catch (error) {
    console.error("Error getting participant card:", error);
    return {
      error: t("errorAnError"),
      success: false,
    };
  }
}
