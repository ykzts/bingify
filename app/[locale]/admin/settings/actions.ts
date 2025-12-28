"use server";

import {
  type SystemSettings,
  systemSettingsSchema,
} from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";

export interface GetSystemSettingsResult {
  error?: string;
  settings?: SystemSettings;
}

export async function getSystemSettings(): Promise<GetSystemSettingsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("system_settings")
      .select(
        "max_participants_per_space, max_spaces_per_user, space_expiration_hours"
      )
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error fetching system settings:", error);
      return {
        error: "システム設定の取得に失敗しました",
      };
    }

    return {
      settings: data,
    };
  } catch (error) {
    console.error("Error in getSystemSettings:", error);
    return {
      error: "予期しないエラーが発生しました",
    };
  }
}

export interface UpdateSystemSettingsState {
  error?: string;
  success: boolean;
}

export async function updateSystemSettings(
  _prevState: UpdateSystemSettingsState,
  formData: FormData
): Promise<UpdateSystemSettingsState> {
  try {
    const supabase = await createClient();

    // Check admin permission
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return {
        error: "管理者権限が必要です",
        success: false,
      };
    }

    // Parse and validate form data
    const maxParticipantsRaw = formData.get(
      "max_participants_per_space"
    ) as string;
    const maxSpacesRaw = formData.get("max_spaces_per_user") as string;
    const expirationHoursRaw = formData.get("space_expiration_hours") as string;

    const validation = systemSettingsSchema.safeParse({
      max_participants_per_space: Number.parseInt(maxParticipantsRaw, 10),
      max_spaces_per_user: Number.parseInt(maxSpacesRaw, 10),
      space_expiration_hours: Number.parseInt(expirationHoursRaw, 10),
    });

    if (!validation.success) {
      return {
        error: validation.error.issues[0].message,
        success: false,
      };
    }

    const { error } = await supabase
      .from("system_settings")
      .update(validation.data)
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      console.error("Error updating system settings:", error);
      return {
        error: "設定の更新に失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in updateSystemSettings:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}
