import { createClient } from "@/lib/supabase/server";

/**
 * 参加者情報（プロフィール情報含む）
 */
export interface ParticipantWithProfile {
  avatar_url: string | null;
  bingo_status: string | null;
  full_name: string | null;
  id: string;
  joined_at: string | null;
  user_id: string;
}

/**
 * ビンゴカード情報（参加者情報含む）
 */
export interface BingoCardWithParticipant {
  avatar_url: string | null;
  bingo_status: string | null;
  created_at: string | null;
  full_name: string | null;
  id: string;
  numbers: number[][];
  space_id: string | null;
  user_id: string;
}

/**
 * ユーザーがスペースのオーナーまたは管理者かチェック
 */
async function isUserOwnerOrAdmin(
  spaceId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();

  // オーナーかチェック
  const { data: space } = await supabase
    .from("spaces")
    .select("owner_id")
    .eq("id", spaceId)
    .single();

  if (space?.owner_id === userId) {
    return true;
  }

  // 管理者かチェック
  const { data: adminRole } = await supabase
    .from("space_roles")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .eq("role", "admin")
    .single();

  return !!adminRole;
}

/**
 * ユーザーがスペースの参加者かチェック
 */
async function isUserParticipant(
  spaceId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("participants")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .single();

  return !!data;
}

/**
 * スペースの参加者一覧を取得
 * オーナー、管理者、または参加者のみがアクセス可能
 *
 * @param spaceId - スペースID
 * @returns 参加者一覧（プロフィール情報含む）、またはnull（権限なし）
 */
export async function getSpaceParticipants(
  spaceId: string
): Promise<ParticipantWithProfile[] | null> {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 権限チェック: オーナー、管理者、または参加者であること
  const isOwnerOrAdmin = await isUserOwnerOrAdmin(spaceId, user.id);
  const isParticipant = isOwnerOrAdmin
    ? true
    : await isUserParticipant(spaceId, user.id);

  if (!isParticipant) {
    return null;
  }

  // 参加者データを取得
  const { data: participantsData, error: participantsError } = await supabase
    .from("participants")
    .select("id, user_id, joined_at, bingo_status")
    .eq("space_id", spaceId)
    .order("bingo_status", { ascending: false }) // bingo > reach > none の順（文字列の降順）
    .order("joined_at", { ascending: true });

  if (participantsError || !participantsData) {
    console.error("Error fetching participants:", participantsError);
    return null;
  }

  // プロフィール情報を取得
  const userIds = participantsData.map((p) => p.user_id);
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return null;
  }

  // プロフィールをマップ化
  const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

  // データを整形
  return participantsData.map((participant) => {
    const profile = profilesMap.get(participant.user_id);
    return {
      avatar_url: profile?.avatar_url || null,
      bingo_status: participant.bingo_status,
      full_name: profile?.full_name || null,
      id: participant.id,
      joined_at: participant.joined_at,
      user_id: participant.user_id,
    };
  });
}

/**
 * スペースの全ビンゴカードを取得
 * オーナー、管理者、または参加者のみがアクセス可能
 *
 * @param spaceId - スペースID
 * @returns ビンゴカード一覧（参加者情報含む）、またはnull（権限なし）
 */
export async function getSpaceBingoCards(
  spaceId: string
): Promise<BingoCardWithParticipant[] | null> {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 権限チェック: オーナー、管理者、または参加者であること
  const isOwnerOrAdmin = await isUserOwnerOrAdmin(spaceId, user.id);
  const isParticipant = isOwnerOrAdmin
    ? true
    : await isUserParticipant(spaceId, user.id);

  if (!isParticipant) {
    return null;
  }

  // ビンゴカードデータを取得
  const { data: cardsData, error: cardsError } = await supabase
    .from("bingo_cards")
    .select("id, space_id, user_id, numbers, created_at")
    .eq("space_id", spaceId);

  if (cardsError || !cardsData) {
    console.error("Error fetching bingo cards:", cardsError);
    return null;
  }

  // 参加者情報を取得
  const userIds = cardsData.map((c) => c.user_id);
  const { data: participantsData, error: participantsError } = await supabase
    .from("participants")
    .select("user_id, bingo_status")
    .eq("space_id", spaceId)
    .in("user_id", userIds);

  if (participantsError) {
    console.error("Error fetching participants:", participantsError);
    return null;
  }

  // プロフィール情報を取得
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return null;
  }

  // 参加者をマップ化
  const participantsMap = new Map(
    participantsData?.map((p) => [p.user_id, p]) || []
  );

  // プロフィールをマップ化
  const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

  // データを整形
  return cardsData.map((card) => {
    const participant = participantsMap.get(card.user_id);
    const profile = profilesMap.get(card.user_id);

    return {
      avatar_url: profile?.avatar_url || null,
      bingo_status: participant?.bingo_status || null,
      created_at: card.created_at,
      full_name: profile?.full_name || null,
      id: card.id,
      numbers: card.numbers as number[][],
      space_id: card.space_id,
      user_id: card.user_id,
    };
  });
}
