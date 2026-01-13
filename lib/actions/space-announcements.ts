"use server";

import { revalidatePath } from "next/cache";
import {
  type UpdateSpaceAnnouncementInput,
  updateSpaceAnnouncementSchema,
} from "@/lib/schemas/announcement";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";
import type { Tables } from "@/types/supabase";

/**
 * スペースお知らせの型（お知らせ情報を含む）
 */
export interface SpaceAnnouncementWithDetails
  extends Tables<"space_announcements"> {
  announcements: Tables<"announcements">;
}

/**
 * スペースお知らせ取得結果の型
 */
export interface GetSpaceAnnouncementsResult {
  data?: SpaceAnnouncementWithDetails[];
  error?: string;
  success: boolean;
}

/**
 * スペースお知らせ操作結果の型
 */
export interface SpaceAnnouncementActionResult {
  error?: string;
  success: boolean;
}

/**
 * スペースへのowner/admin権限をチェックする
 * @param supabase - Supabaseクライアント
 * @param spaceId - スペースID
 * @param userId - ユーザーID
 * @returns 権限があればtrue、なければfalse
 */
async function checkSpacePermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string
): Promise<boolean> {
  // スペースが存在し、オーナーかどうかをチェック
  const { data: space } = await supabase
    .from("spaces")
    .select("owner_id")
    .eq("id", spaceId)
    .single();

  if (!space) {
    return false;
  }

  const isOwner = space.owner_id === userId;

  // 管理者ロールをチェック
  const { data: adminRole } = await supabase
    .from("space_roles")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  const isAdmin = !!adminRole;

  return isOwner || isAdmin;
}

/**
 * スペースのお知らせ一覧を取得する
 * pinned DESC → created_at DESC の順でソートし、日付範囲でフィルタする
 *
 * @param spaceId - スペースID
 * @returns スペースお知らせ一覧
 */
export async function getSpaceAnnouncements(
  spaceId: string
): Promise<GetSpaceAnnouncementsResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // UUID検証
    if (!isValidUUID(spaceId)) {
      return {
        error: "無効なスペースIDです",
        success: false,
      };
    }

    // スペースが存在するかチェック
    const { data: space } = await supabase
      .from("spaces")
      .select("id")
      .eq("id", spaceId)
      .single();

    if (!space) {
      return {
        error: "スペースが見つかりません",
        success: false,
      };
    }

    // スペースお知らせを取得（お知らせ詳細を含む）
    const { data: spaceAnnouncements, error } = await supabase
      .from("space_announcements")
      .select("*, announcements(*)")
      .eq("space_id", spaceId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching space announcements:", error);
      return {
        error: "スペースお知らせの取得に失敗しました",
        success: false,
      };
    }

    // 日付範囲でフィルタ（published=trueかつ日付範囲内のもののみ）
    const now = new Date();
    const filteredAnnouncements = (spaceAnnouncements || []).filter((sa) => {
      const announcement = sa.announcements;
      if (!announcement?.published) {
        return false;
      }

      // starts_at チェック（nullまたは過去）
      if (announcement.starts_at) {
        const startsAt = new Date(announcement.starts_at);
        if (startsAt > now) {
          return false;
        }
      }

      // ends_at チェック（nullまたは未来）
      if (announcement.ends_at) {
        const endsAt = new Date(announcement.ends_at);
        if (endsAt <= now) {
          return false;
        }
      }

      return true;
    });

    return {
      data: filteredAnnouncements as SpaceAnnouncementWithDetails[],
      success: true,
    };
  } catch (error) {
    console.error("Error in getSpaceAnnouncements:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * スペースお知らせを作成する（owner/admin専用）
 *
 * @param spaceId - スペースID
 * @param data - お知らせデータ
 * @returns 操作結果
 */
export async function createSpaceAnnouncement(
  spaceId: string,
  data: {
    content: string;
    ends_at?: string | null;
    pinned?: boolean;
    priority: "info" | "warning" | "error";
    starts_at?: string | null;
    title: string;
  }
): Promise<SpaceAnnouncementActionResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // UUID検証
    if (!isValidUUID(spaceId)) {
      return {
        error: "無効なスペースIDです",
        success: false,
      };
    }

    // owner/admin権限チェック
    const hasPermission = await checkSpacePermission(
      supabase,
      spaceId,
      user.id
    );
    if (!hasPermission) {
      return {
        error: "スペースが見つからないか、権限がありません",
        success: false,
      };
    }

    // お知らせを作成
    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .insert({
        content: data.content,
        created_by: user.id,
        dismissible: true,
        ends_at: data.ends_at || null,
        priority: data.priority,
        published: true,
        starts_at: data.starts_at || null,
        title: data.title,
      })
      .select()
      .single();

    if (announcementError || !announcement) {
      console.error("Error creating announcement:", announcementError);
      return {
        error: "お知らせの作成に失敗しました",
        success: false,
      };
    }

    // スペースお知らせを作成
    const { error: spaceAnnouncementError } = await supabase
      .from("space_announcements")
      .insert({
        announcement_id: announcement.id,
        pinned: data.pinned,
        space_id: spaceId,
      });

    if (spaceAnnouncementError) {
      console.error(
        "Error creating space announcement:",
        spaceAnnouncementError
      );
      // お知らせも削除する（ロールバック）
      await supabase.from("announcements").delete().eq("id", announcement.id);
      return {
        error: "スペースお知らせの作成に失敗しました",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath("/[locale]/dashboard/spaces/[id]", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in createSpaceAnnouncement:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * お知らせ本体の更新データを構築する
 */
function buildAnnouncementUpdateData(data: UpdateSpaceAnnouncementInput): {
  content?: string;
  ends_at?: string | null;
  priority?: "info" | "warning" | "error";
  starts_at?: string | null;
  title?: string;
} {
  const updateData: {
    content?: string;
    ends_at?: string | null;
    priority?: "info" | "warning" | "error";
    starts_at?: string | null;
    title?: string;
  } = {};

  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.content !== undefined) {
    updateData.content = data.content;
  }
  if (data.priority !== undefined) {
    updateData.priority = data.priority;
  }
  if (data.starts_at !== undefined) {
    updateData.starts_at = data.starts_at;
  }
  if (data.ends_at !== undefined) {
    updateData.ends_at = data.ends_at;
  }

  return updateData;
}

/**
 * スペースお知らせを更新する（owner/admin専用）
 *
 * @param spaceId - スペースID
 * @param announcementId - お知らせID
 * @param data - 更新データ
 * @returns 操作結果
 */
export async function updateSpaceAnnouncement(
  spaceId: string,
  announcementId: string,
  data: UpdateSpaceAnnouncementInput
): Promise<SpaceAnnouncementActionResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // UUID検証
    if (!isValidUUID(spaceId)) {
      return {
        error: "無効なスペースIDです",
        success: false,
      };
    }

    if (!isValidUUID(announcementId)) {
      return {
        error: "無効なお知らせIDです",
        success: false,
      };
    }

    // owner/admin権限チェック
    const hasPermission = await checkSpacePermission(
      supabase,
      spaceId,
      user.id
    );
    if (!hasPermission) {
      return {
        error: "スペースが見つからないか、権限がありません",
        success: false,
      };
    }

    // Zod検証
    const validationResult = updateSpaceAnnouncementSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        error: firstError?.message || "入力値が不正です",
        success: false,
      };
    }

    // スペースお知らせが存在するかチェック
    const { data: spaceAnnouncement } = await supabase
      .from("space_announcements")
      .select("announcement_id")
      .eq("space_id", spaceId)
      .eq("announcement_id", announcementId)
      .single();

    if (!spaceAnnouncement) {
      return {
        error: "スペースお知らせが見つかりません",
        success: false,
      };
    }

    // pinned の更新がある場合は space_announcements を更新
    if (validationResult.data.pinned !== undefined) {
      const { error: updateSpaceAnnouncementError } = await supabase
        .from("space_announcements")
        .update({ pinned: validationResult.data.pinned })
        .eq("space_id", spaceId)
        .eq("announcement_id", announcementId);

      if (updateSpaceAnnouncementError) {
        console.error(
          "Error updating space announcement:",
          updateSpaceAnnouncementError
        );
        return {
          error: "スペースお知らせの更新に失敗しました",
          success: false,
        };
      }
    }

    // お知らせ本体の更新データを構築
    const announcementUpdateData = buildAnnouncementUpdateData(
      validationResult.data
    );

    // お知らせ本体に更新があれば更新
    if (Object.keys(announcementUpdateData).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from("announcements")
        .update(announcementUpdateData)
        .eq("id", announcementId)
        .select();

      if (updateError) {
        console.error("Error updating announcement:", updateError);
        return {
          error: "お知らせの更新に失敗しました",
          success: false,
        };
      }

      if (!updated || updated.length === 0) {
        return {
          error: "お知らせが見つかりません",
          success: false,
        };
      }
    }

    // キャッシュ再検証
    revalidatePath("/[locale]/dashboard/spaces/[id]", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in updateSpaceAnnouncement:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * スペースお知らせを削除する（owner/admin専用）
 *
 * @param spaceId - スペースID
 * @param announcementId - お知らせID
 * @returns 操作結果
 */
export async function deleteSpaceAnnouncement(
  spaceId: string,
  announcementId: string
): Promise<SpaceAnnouncementActionResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // UUID検証
    if (!isValidUUID(spaceId)) {
      return {
        error: "無効なスペースIDです",
        success: false,
      };
    }

    if (!isValidUUID(announcementId)) {
      return {
        error: "無効なお知らせIDです",
        success: false,
      };
    }

    // owner/admin権限チェック
    const hasPermission = await checkSpacePermission(
      supabase,
      spaceId,
      user.id
    );
    if (!hasPermission) {
      return {
        error: "スペースが見つからないか、権限がありません",
        success: false,
      };
    }

    // お知らせを削除（CASCADE により space_announcements も削除される）
    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (deleteError) {
      console.error("Error deleting announcement:", deleteError);
      return {
        error: "スペースお知らせの削除に失敗しました",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath("/[locale]/dashboard/spaces/[id]", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteSpaceAnnouncement:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * スペースお知らせのピン状態を切り替える（owner/admin専用）
 *
 * @param spaceId - スペースID
 * @param announcementId - お知らせID
 * @returns 操作結果
 */
export async function togglePinSpaceAnnouncement(
  spaceId: string,
  announcementId: string
): Promise<SpaceAnnouncementActionResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // UUID検証
    if (!isValidUUID(spaceId)) {
      return {
        error: "無効なスペースIDです",
        success: false,
      };
    }

    if (!isValidUUID(announcementId)) {
      return {
        error: "無効なお知らせIDです",
        success: false,
      };
    }

    // owner/admin権限チェック
    const hasPermission = await checkSpacePermission(
      supabase,
      spaceId,
      user.id
    );
    if (!hasPermission) {
      return {
        error: "スペースが見つからないか、権限がありません",
        success: false,
      };
    }

    // 現在のピン状態を取得
    const { data: spaceAnnouncement } = await supabase
      .from("space_announcements")
      .select("pinned")
      .eq("space_id", spaceId)
      .eq("announcement_id", announcementId)
      .single();

    if (!spaceAnnouncement) {
      return {
        error: "スペースお知らせが見つかりません",
        success: false,
      };
    }

    // ピン状態を反転
    const { error: updateError } = await supabase
      .from("space_announcements")
      .update({ pinned: !spaceAnnouncement.pinned })
      .eq("space_id", spaceId)
      .eq("announcement_id", announcementId);

    if (updateError) {
      console.error("Error toggling pin:", updateError);
      return {
        error: "ピン状態の切り替えに失敗しました",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath("/[locale]/dashboard/spaces/[id]", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in togglePinSpaceAnnouncement:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}
