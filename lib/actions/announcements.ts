"use server";

import { getTranslations } from "next-intl/server";
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
 * 公開中で日付範囲内のお知らせを取得する
 * 優先度順（error > warning > info）、作成日時降順でソート
 *
 * @returns 有効なお知らせ一覧
 */
export async function getActiveAnnouncements(): Promise<GetAnnouncementsResult> {
  const t = await getTranslations("AnnouncementActions");
  
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: t("errorUnauthorized"),
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
        error: t("errorFetchAnnouncementsFailed"),
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
      error: t("errorGeneric"),
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
  const t = await getTranslations("AnnouncementActions");
  
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
        error: t("errorFetchAnnouncementsFailed"),
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
      error: t("errorGeneric"),
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
  const t = await getTranslations("AnnouncementActions");
  
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: t("errorUnauthorized"),
        success: false,
      };
    }

    // Admin権限チェック
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) {
      return {
        error: t("errorAdminRequired"),
        success: false,
      };
    }

    // Zod検証
    const validationResult = createAnnouncementSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        error: firstError?.message || t("errorInvalidInput"),
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
        error: t("errorCreateFailed"),
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
      error: t("errorGeneric"),
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
  const t = await getTranslations("AnnouncementActions");
  
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: t("errorUnauthorized"),
        success: false,
      };
    }

    // Admin権限チェック
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) {
      return {
        error: t("errorAdminRequired"),
        success: false,
      };
    }

    // Zod検証
    const validationResult = updateAnnouncementSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        error: firstError?.message || t("errorInvalidInput"),
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
        error: t("errorUpdateFailed"),
        success: false,
      };
    }

    // 更新された行が存在しない場合はエラー
    if (!updated || updated.length === 0) {
      return {
        error: t("errorNotFound"),
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
      error: t("errorGeneric"),
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
  const t = await getTranslations("AnnouncementActions");
  
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: t("errorUnauthorized"),
        success: false,
      };
    }

    // Admin権限チェック
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) {
      return {
        error: t("errorAdminRequired"),
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
        error: t("errorDeleteFailed"),
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
      error: t("errorGeneric"),
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
  const t = await getTranslations("AnnouncementActions");
  
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
        error: t("errorDismissFailed"),
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
      error: t("errorGeneric"),
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
  const t = await getTranslations("AnnouncementActions");
  
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
        error: t("errorFetchAnnouncementsFailed"),
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
      error: t("errorGeneric"),
      success: false,
    };
  }
}
