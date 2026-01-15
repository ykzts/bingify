"use server";

import { revalidatePath } from "next/cache";
import {
  type CreateAnnouncementInput,
  createAnnouncementSchema,
  type UpdateAnnouncementInput,
  updateAnnouncementSchema,
} from "@/lib/schemas/announcement";
import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/lib/types/announcement";

/**
 * お知らせ関連のキャッシュ再検証パス
 */
const ANNOUNCEMENT_REVALIDATE_PATH = "/[locale]/dashboard";

/**
 * お知らせ取得結果の型
 */
export interface GetAnnouncementsResult {
  data?: Announcement[];
  error?: string;
  success: boolean;
}

/**
 * 単一お知らせ取得結果の型
 */
export interface GetAnnouncementResult {
  data?: Announcement;
  error?: string;
  success: boolean;
}

/**
 * お知らせ操作結果の型
 */
export interface AnnouncementActionResult {
  error?: string;
  success: boolean;
}

/**
 * 非表示お知らせID取得結果の型
 */
export interface GetDismissedAnnouncementsResult {
  data?: string[];
  error?: string;
  success: boolean;
}

/**
 * Admin権限をチェックする
 * @returns Admin権限があればtrue、なければfalse
 */
async function checkAdminPermission(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return false;
  }

  return profile.role === "admin";
}

/**
 * IDでお知らせを取得する
 * 公開中で日付範囲内のお知らせのみ返す
 *
 * @param id - お知らせID
 * @returns お知らせ
 */
export async function getAnnouncementById(
  id: string
): Promise<GetAnnouncementResult> {
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

    // お知らせを取得（published=true AND 日付範囲内）
    const now = new Date().toISOString();
    const { data: announcement, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", id)
      .eq("published", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .single();

    if (error) {
      console.error("Error fetching announcement by ID:", error);
      return {
        error: "お知らせが見つかりません",
        success: false,
      };
    }

    return {
      data: announcement as Announcement,
      success: true,
    };
  } catch (error) {
    console.error("Error in getAnnouncementById:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * 公開中で日付範囲内のお知らせを取得する
 * 優先度順（error > warning > info）、作成日時降順でソート
 *
 * @returns 有効なお知らせ一覧
 */
export async function getActiveAnnouncements(): Promise<GetAnnouncementsResult> {
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

    // published=true AND 日付範囲内のお知らせを取得
    const now = new Date().toISOString();
    const { data: announcements, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("published", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`);

    if (error) {
      console.error("Error fetching active announcements:", error);
      return {
        error: "お知らせの取得に失敗しました",
        success: false,
      };
    }

    // 優先度順（error > warning > info）、作成日時降順でソート
    const sortedAnnouncements = (announcements || []).sort((a, b) => {
      // 優先度のスコア: error=3, warning=2, info=1
      const priorityScore = (priority: string) => {
        if (priority === "error") {
          return 3;
        }
        if (priority === "warning") {
          return 2;
        }
        return 1;
      };

      const priorityDiff =
        priorityScore(b.priority) - priorityScore(a.priority);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // 優先度が同じ場合は作成日時降順
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return {
      data: sortedAnnouncements as Announcement[],
      success: true,
    };
  } catch (error) {
    console.error("Error in getActiveAnnouncements:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * すべてのお知らせを取得する（Admin専用）
 * 作成日時降順でソート
 *
 * @returns すべてのお知らせ一覧
 */
export async function getAllAnnouncements(): Promise<GetAnnouncementsResult> {
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

    // Admin権限チェック
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) {
      return {
        error: "Admin権限が必要です",
        success: false,
      };
    }

    // すべてのお知らせを作成日時降順で取得
    const { data: announcements, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all announcements:", error);
      return {
        error: "お知らせの取得に失敗しました",
        success: false,
      };
    }

    return {
      data: announcements as Announcement[],
      success: true,
    };
  } catch (error) {
    console.error("Error in getAllAnnouncements:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * お知らせを作成する（Admin専用）
 *
 * @param data - お知らせ作成データ
 * @returns 操作結果
 */
export async function createAnnouncement(
  data: CreateAnnouncementInput
): Promise<AnnouncementActionResult> {
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

    // Admin権限チェック
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) {
      return {
        error: "Admin権限が必要です",
        success: false,
      };
    }

    // Zod検証
    const validationResult = createAnnouncementSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        error: firstError?.message || "入力値が不正です",
        success: false,
      };
    }

    // お知らせを作成
    const { error: insertError } = await supabase.from("announcements").insert({
      content: validationResult.data.content,
      created_by: user.id,
      dismissible: validationResult.data.dismissible,
      ends_at: validationResult.data.ends_at,
      priority: validationResult.data.priority,
      published: validationResult.data.published,
      starts_at: validationResult.data.starts_at,
      title: validationResult.data.title,
    });

    if (insertError) {
      console.error("Error creating announcement:", insertError);
      return {
        error: "お知らせの作成に失敗しました",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath(ANNOUNCEMENT_REVALIDATE_PATH, "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in createAnnouncement:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * お知らせを更新する（Admin専用）
 *
 * @param id - お知らせID
 * @param data - お知らせ更新データ
 * @returns 操作結果
 */
export async function updateAnnouncement(
  id: string,
  data: UpdateAnnouncementInput
): Promise<AnnouncementActionResult> {
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

    // Admin権限チェック
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) {
      return {
        error: "Admin権限が必要です",
        success: false,
      };
    }

    // Zod検証
    const validationResult = updateAnnouncementSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        error: firstError?.message || "入力値が不正です",
        success: false,
      };
    }

    // お知らせを更新
    const { data: updated, error: updateError } = await supabase
      .from("announcements")
      .update(validationResult.data)
      .eq("id", id)
      .select();

    if (updateError) {
      console.error("Error updating announcement:", updateError);
      return {
        error: "お知らせの更新に失敗しました",
        success: false,
      };
    }

    // 更新された行が存在しない場合はエラー
    if (!updated || updated.length === 0) {
      return {
        error: "お知らせが見つかりません",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath(ANNOUNCEMENT_REVALIDATE_PATH, "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in updateAnnouncement:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * お知らせを削除する（Admin専用）
 *
 * @param id - お知らせID
 * @returns 操作結果
 */
export async function deleteAnnouncement(
  id: string
): Promise<AnnouncementActionResult> {
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

    // Admin権限チェック
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) {
      return {
        error: "Admin権限が必要です",
        success: false,
      };
    }

    // お知らせを削除
    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting announcement:", deleteError);
      return {
        error: "お知らせの削除に失敗しました",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath(ANNOUNCEMENT_REVALIDATE_PATH, "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteAnnouncement:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * お知らせを非表示にする
 *
 * @param announcementId - お知らせID
 * @returns 操作結果
 */
export async function dismissAnnouncement(
  announcementId: string
): Promise<AnnouncementActionResult> {
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

    // announcement_dismissals へ UPSERT
    const { error: upsertError } = await supabase
      .from("announcement_dismissals")
      .upsert(
        {
          announcement_id: announcementId,
          user_id: user.id,
        },
        {
          onConflict: "announcement_id,user_id",
        }
      );

    if (upsertError) {
      console.error("Error dismissing announcement:", upsertError);
      return {
        error: "お知らせの非表示に失敗しました",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath(ANNOUNCEMENT_REVALIDATE_PATH, "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in dismissAnnouncement:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * 現在ユーザーの非表示お知らせID配列を取得する
 *
 * @returns 非表示お知らせID配列
 */
export async function getDismissedAnnouncements(): Promise<GetDismissedAnnouncementsResult> {
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

    // 非表示記録を取得
    const { data: dismissals, error } = await supabase
      .from("announcement_dismissals")
      .select("announcement_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching dismissed announcements:", error);
      return {
        error: "非表示お知らせの取得に失敗しました",
        success: false,
      };
    }

    const announcementIds = (dismissals || []).map((d) => d.announcement_id);

    return {
      data: announcementIds,
      success: true,
    };
  } catch (error) {
    console.error("Error in getDismissedAnnouncements:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}
