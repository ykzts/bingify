"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";
import type { Tables } from "@/types/supabase";
import { announcementFormOpts } from "../_lib/form-options";

interface ActionResult {
  error?: string;
  success: boolean;
}

async function verifyAdminRole(): Promise<{
  isAdmin: boolean;
  userId?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    isAdmin: profile?.role === "admin",
    userId: user.id,
  };
}

export async function getAllAnnouncements(
  page = 1,
  perPage = 50
): Promise<{
  announcements?: Tables<"announcements">[];
  error?: string;
  hasMore?: boolean;
}> {
  try {
    const { isAdmin } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "errorNoPermission",
      };
    }

    const adminClient = createAdminClient();
    const from = (page - 1) * perPage;
    const to = from + perPage;

    const { data, error } = await adminClient
      .from("announcements")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to - 1);

    if (error) {
      console.error("Failed to fetch announcements:", error);
      return {
        error: "errorGeneric",
      };
    }

    return {
      announcements: data || [],
      hasMore: (data?.length || 0) === perPage,
    };
  } catch (error) {
    console.error("Error in getAllAnnouncements:", error);
    return {
      error: "errorGeneric",
    };
  }
}

export async function getAnnouncementWithTranslations(
  announcementId: string
): Promise<{
  announcement?: Tables<"announcements">;
  error?: string;
  translation?: Tables<"announcements">;
}> {
  try {
    if (!isValidUUID(announcementId)) {
      return {
        error: "errorInvalidUuid",
      };
    }

    const { isAdmin } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "errorNoPermission",
      };
    }

    const adminClient = createAdminClient();

    // Get the main announcement
    const { data: announcement, error: announcementError } = await adminClient
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .single();

    if (announcementError || !announcement) {
      console.error("Failed to fetch announcement:", announcementError);
      return {
        error: "errorGeneric",
      };
    }

    // Determine the parent ID and get translations
    const parentId = announcement.parent_id || announcement.id;
    const currentLocale = announcement.locale;
    const otherLocale = currentLocale === "ja" ? "en" : "ja";

    // Get the translation
    const { data: translation } = await adminClient
      .from("announcements")
      .select("*")
      .eq("parent_id", parentId)
      .eq("locale", otherLocale)
      .maybeSingle();

    return {
      announcement,
      translation: translation || undefined,
    };
  } catch (error) {
    console.error("Error in getAnnouncementWithTranslations:", error);
    return {
      error: "errorGeneric",
    };
  }
}

const createAnnouncementValidate = createServerValidate({
  ...announcementFormOpts,
  onServerValidate: () => undefined,
});

async function createParentAnnouncement(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  formData: {
    content: string;
    dismissible: boolean;
    ends_at: string | null;
    priority: "info" | "warning" | "error";
    published: boolean;
    starts_at: string | null;
    title: string;
  }
) {
  return await adminClient
    .from("announcements")
    .insert({
      content: formData.content,
      created_by: userId,
      dismissible: formData.dismissible,
      ends_at: formData.ends_at,
      locale: "ja",
      parent_id: null,
      priority: formData.priority,
      published: formData.published,
      starts_at: formData.starts_at,
      title: formData.title,
    })
    .select()
    .single();
}

async function createTranslationAnnouncement(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  parentId: string,
  formData: {
    content: string;
    dismissible: boolean;
    ends_at: string | null;
    priority: "info" | "warning" | "error";
    published: boolean;
    starts_at: string | null;
    title: string;
  }
) {
  return await adminClient.from("announcements").insert({
    content: formData.content,
    created_by: userId,
    dismissible: formData.dismissible,
    ends_at: formData.ends_at,
    locale: "en",
    parent_id: parentId,
    priority: formData.priority,
    published: formData.published,
    starts_at: formData.starts_at,
    title: formData.title,
  });
}

async function createEnglishParentAnnouncement(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  formData: {
    content: string;
    dismissible: boolean;
    ends_at: string | null;
    priority: "info" | "warning" | "error";
    published: boolean;
    starts_at: string | null;
    title: string;
  }
) {
  return await adminClient
    .from("announcements")
    .insert({
      content: formData.content,
      created_by: userId,
      dismissible: formData.dismissible,
      ends_at: formData.ends_at,
      locale: "en",
      parent_id: null,
      priority: formData.priority,
      published: formData.published,
      starts_at: formData.starts_at,
      title: formData.title,
    })
    .select()
    .single();
}

async function createAnnouncementsWithTranslations(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  commonData: {
    dismissible: boolean;
    ends_at: string | null;
    priority: "info" | "warning" | "error";
    published: boolean;
    starts_at: string | null;
  },
  jaData: { title: string; content: string } | null,
  enData: { title: string; content: string } | null
): Promise<{ success: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  // 日本語版がある場合、親として作成
  if (jaData) {
    const { data: parent, error: jaError } = await createParentAnnouncement(
      adminClient,
      userId,
      { ...commonData, ...jaData }
    );

    if (jaError || !parent) {
      console.error("Failed to create Japanese announcement:", jaError);
      return { success: false, warnings };
    }

    // 英語版が入力されている場合は翻訳版として作成
    if (enData) {
      const { error: enError } = await createTranslationAnnouncement(
        adminClient,
        userId,
        parent.id,
        { ...commonData, ...enData }
      );

      if (enError) {
        console.error("Failed to create English announcement:", enError);
        warnings.push("English announcement failed to create");
      }
    }

    return { success: true, warnings };
  }

  // 英語のみの場合、英語を親として作成
  if (enData) {
    const { data, error: enError } = await createEnglishParentAnnouncement(
      adminClient,
      userId,
      { ...commonData, ...enData }
    );

    if (enError || !data) {
      console.error("Failed to create English announcement:", enError);
      return { success: false, warnings };
    }

    return { success: true, warnings };
  }

  return { success: false, warnings };
}

export async function createAnnouncementAction(
  _prevState: unknown,
  formData: FormData
) {
  const { isAdmin, userId } = await verifyAdminRole();
  if (!(isAdmin && userId)) {
    return {
      ...initialFormState,
      errors: ["errorNoPermission"],
      meta: { success: false },
    };
  }

  try {
    await createAnnouncementValidate(formData);

    // 共通フィールド
    const commonData = {
      dismissible: formData.has("dismissible"),
      ends_at: (formData.get("ends_at") as string) || null,
      priority: ((formData.get("priority") as string) || "info") as
        | "info"
        | "warning"
        | "error",
      published: formData.has("published"),
      starts_at: (formData.get("starts_at") as string) || null,
    };

    // 日本語版
    const jaTitle = (formData.get("ja.title") as string) || "";
    const jaContent = (formData.get("ja.content") as string) || "";
    const jaData =
      jaTitle && jaContent ? { content: jaContent, title: jaTitle } : null;

    // 英語版
    const enTitle = (formData.get("en.title") as string) || "";
    const enContent = (formData.get("en.content") as string) || "";
    const enData =
      enTitle && enContent ? { content: enContent, title: enTitle } : null;

    // 少なくとも1つの言語が必要
    if (!(jaData || enData)) {
      return {
        ...initialFormState,
        errors: ["errorAtLeastOneLanguageRequired"],
        meta: { success: false },
      };
    }

    const adminClient = createAdminClient();
    const result = await createAnnouncementsWithTranslations(
      adminClient,
      userId,
      commonData,
      jaData,
      enData
    );

    if (!result.success) {
      return {
        ...initialFormState,
        errors: ["errorCreateFailed"],
        meta: { success: false },
      };
    }

    return {
      ...initialFormState,
      meta: { success: true, warnings: result.warnings },
    };
  } catch (e) {
    // Check if it's a ServerValidateError from TanStack Form
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }

    console.error("Error in createAnnouncementAction:", e);
    return {
      ...initialFormState,
      errors: ["errorGeneric"],
      meta: { success: false },
    };
  }
}

const updateAnnouncementValidate = createServerValidate({
  ...announcementFormOpts,
  onServerValidate: () => undefined,
});

interface AnnouncementData {
  content: string;
  title: string;
}

interface CommonAnnouncementData {
  dismissible: boolean;
  ends_at: string | null;
  priority: "info" | "warning" | "error";
  published: boolean;
  starts_at: string | null;
}

async function updateOrCreateJapaneseAnnouncement(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  currentAnnouncement: { id: string; locale: string; parent_id: string | null },
  parentId: string,
  commonData: CommonAnnouncementData,
  jaData: AnnouncementData,
  t: Awaited<ReturnType<typeof getTranslations>>
): Promise<string | null> {
  if (currentAnnouncement.locale === "ja" && !currentAnnouncement.parent_id) {
    // Update the current announcement as it's the Japanese parent
    const { error } = await adminClient
      .from("announcements")
      .update({
        ...commonData,
        ...jaData,
        locale: "ja",
      })
      .eq("id", currentAnnouncement.id);

    return error ? t("errorUpdateJapaneseFailed") : null;
  }

  // Find or create Japanese translation
  const { data: existingJa } = await adminClient
    .from("announcements")
    .select("id")
    .eq("parent_id", parentId)
    .eq("locale", "ja")
    .maybeSingle();

  if (existingJa) {
    const { error } = await adminClient
      .from("announcements")
      .update({
        ...commonData,
        ...jaData,
      })
      .eq("id", existingJa.id);

    return error ? t("errorUpdateJapaneseTranslationFailed") : null;
  }

  const { error } = await adminClient.from("announcements").insert({
    ...commonData,
    ...jaData,
    created_by: userId,
    locale: "ja",
    parent_id: parentId,
  });

  return error ? t("errorCreateJapaneseTranslationFailed") : null;
}

async function updateOrCreateEnglishAnnouncement(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  currentAnnouncement: { id: string; locale: string; parent_id: string | null },
  parentId: string,
  commonData: CommonAnnouncementData,
  enData: AnnouncementData,
  t: Awaited<ReturnType<typeof getTranslations>>
): Promise<string | null> {
  if (currentAnnouncement.locale === "en" && !currentAnnouncement.parent_id) {
    // Update the current announcement as it's the English parent
    const { error } = await adminClient
      .from("announcements")
      .update({
        ...commonData,
        ...enData,
        locale: "en",
      })
      .eq("id", currentAnnouncement.id);

    return error ? t("errorUpdateEnglishFailed") : null;
  }

  // Find or create English translation
  const { data: existingEn } = await adminClient
    .from("announcements")
    .select("id")
    .eq("parent_id", parentId)
    .eq("locale", "en")
    .maybeSingle();

  if (existingEn) {
    const { error } = await adminClient
      .from("announcements")
      .update({
        ...commonData,
        ...enData,
      })
      .eq("id", existingEn.id);

    return error ? t("errorUpdateEnglishTranslationFailed") : null;
  }

  const { error } = await adminClient.from("announcements").insert({
    ...commonData,
    ...enData,
    created_by: userId,
    locale: "en",
    parent_id: parentId,
  });

  return error ? t("errorCreateEnglishTranslationFailed") : null;
}

function extractCommonData(formData: FormData): CommonAnnouncementData {
  return {
    dismissible: formData.has("dismissible"),
    ends_at: (formData.get("ends_at") as string) || null,
    priority: ((formData.get("priority") as string) || "info") as
      | "info"
      | "warning"
      | "error",
    published: formData.has("published"),
    starts_at: (formData.get("starts_at") as string) || null,
  };
}

function extractLanguageData(formData: FormData): {
  jaData: AnnouncementData | null;
  enData: AnnouncementData | null;
} {
  const jaTitle = (formData.get("ja.title") as string) || "";
  const jaContent = (formData.get("ja.content") as string) || "";
  const jaData =
    jaTitle && jaContent ? { content: jaContent, title: jaTitle } : null;

  const enTitle = (formData.get("en.title") as string) || "";
  const enContent = (formData.get("en.content") as string) || "";
  const enData =
    enTitle && enContent ? { content: enContent, title: enTitle } : null;

  return { enData, jaData };
}

async function processAnnouncementUpdates(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  currentAnnouncement: { id: string; locale: string; parent_id: string | null },
  commonData: CommonAnnouncementData,
  jaData: AnnouncementData | null,
  enData: AnnouncementData | null,
  t: Awaited<ReturnType<typeof getTranslations>>
): Promise<string[]> {
  const warnings: string[] = [];
  const parentId = currentAnnouncement.parent_id || currentAnnouncement.id;

  // Update Japanese announcement
  if (jaData) {
    const warning = await updateOrCreateJapaneseAnnouncement(
      adminClient,
      userId,
      currentAnnouncement,
      parentId,
      commonData,
      jaData,
      t
    );
    if (warning) {
      console.error(warning);
      warnings.push(warning);
    }
  }

  // Update English announcement
  if (enData) {
    const warning = await updateOrCreateEnglishAnnouncement(
      adminClient,
      userId,
      currentAnnouncement,
      parentId,
      commonData,
      enData,
      t
    );
    if (warning) {
      console.error(warning);
      warnings.push(warning);
    }
  }

  return warnings;
}

export async function updateAnnouncementAction(
  announcementId: string,
  _prevState: unknown,
  formData: FormData
) {
  if (!isValidUUID(announcementId)) {
    return {
      ...initialFormState,
      errors: ["errorInvalidUuid"],
      meta: { success: false },
    };
  }

  const { isAdmin, userId } = await verifyAdminRole();
  if (!(isAdmin && userId)) {
    return {
      ...initialFormState,
      errors: ["errorNoPermission"],
      meta: { success: false },
    };
  }

  try {
    await updateAnnouncementValidate(formData);

    const t = await getTranslations("Admin");
    const adminClient = createAdminClient();

    // Get the current announcement to check if it's a parent or translation
    const { data: currentAnnouncement, error: fetchError } = await adminClient
      .from("announcements")
      .select("id, parent_id, locale")
      .eq("id", announcementId)
      .single();

    if (fetchError || !currentAnnouncement) {
      console.error("Failed to fetch announcement:", fetchError);
      return {
        ...initialFormState,
        errors: ["errorUpdateFailed"],
        meta: { success: false },
      };
    }

    // Extract common fields
    const commonData = extractCommonData(formData);

    // Extract language-specific data
    const { jaData, enData } = extractLanguageData(formData);

    // At least one language must be provided
    if (!(jaData || enData)) {
      return {
        ...initialFormState,
        errors: ["errorAtLeastOneLanguageRequired"],
        meta: { success: false },
      };
    }

    const warnings = await processAnnouncementUpdates(
      adminClient,
      userId,
      currentAnnouncement,
      commonData,
      jaData,
      enData,
      t
    );

    return {
      ...initialFormState,
      meta: { success: true, warnings },
    };
  } catch (e) {
    // Check if it's a ServerValidateError from TanStack Form
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }

    // Some other error occurred
    console.error("Error in updateAnnouncementAction:", e);
    return {
      ...initialFormState,
      errors: ["errorGeneric"],
      meta: { success: false },
    };
  }
}

export async function deleteAnnouncementAction(
  announcementId: string
): Promise<ActionResult> {
  try {
    if (!isValidUUID(announcementId)) {
      return {
        error: "errorInvalidUuid",
        success: false,
      };
    }

    const { isAdmin } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "errorNoPermission",
        success: false,
      };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (error) {
      console.error("Failed to delete announcement:", error);
      return {
        error: "errorDeleteFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteAnnouncementAction:", error);
    return {
      error: "errorGeneric",
      success: false,
    };
  }
}
