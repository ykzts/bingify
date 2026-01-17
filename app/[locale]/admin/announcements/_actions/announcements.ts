"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
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
    const t = await getTranslations("Admin");

    if (!isValidUUID(announcementId)) {
      return {
        error: t("errorInvalidUuid"),
      };
    }

    const { isAdmin } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: t("errorNoPermission"),
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
        error: t("errorGeneric"),
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
    const t = await getTranslations("Admin");
    return {
      error: t("errorGeneric"),
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
  const t = await getTranslations("Admin");

  const { isAdmin, userId } = await verifyAdminRole();
  if (!(isAdmin && userId)) {
    return {
      ...initialFormState,
      errors: [t("errorNoPermission")],
      meta: { success: false },
    };
  }

  try {
    await createAnnouncementValidate(formData);

    // Extract common fields
    const commonData = extractCommonData(formData);

    // Extract language-specific data
    const languageData = extractLanguageData(formData);

    // At least one language must be provided
    if (Object.keys(languageData).length === 0) {
      return {
        ...initialFormState,
        errors: [t("errorAtLeastOneLanguageRequired")],
        meta: { success: false },
      };
    }

    const adminClient = createAdminClient();

    // For backward compatibility, extract ja and en specifically
    const jaData = languageData.ja || null;
    const enData = languageData.en || null;

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

async function updateOrCreateLanguageAnnouncement(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  currentAnnouncement: { id: string; locale: string; parent_id: string | null },
  parentId: string,
  commonData: CommonAnnouncementData,
  locale: string,
  languageData: AnnouncementData
): Promise<string | null> {
  const t = await getTranslations("Admin");

  if (currentAnnouncement.locale === locale && !currentAnnouncement.parent_id) {
    // Update the current announcement as it's the parent for this locale
    const { error } = await adminClient
      .from("announcements")
      .update({
        ...commonData,
        ...languageData,
        locale,
      })
      .eq("id", currentAnnouncement.id);

    if (error) {
      console.error(`Failed to update ${locale} parent:`, error);
      return t("errorUpdateFailed");
    }
    return null;
  }

  // Find or create translation for this locale
  const { data: existingTranslation } = await adminClient
    .from("announcements")
    .select("id")
    .eq("parent_id", parentId)
    .eq("locale", locale)
    .maybeSingle();

  if (existingTranslation) {
    const { error } = await adminClient
      .from("announcements")
      .update({
        ...commonData,
        ...languageData,
      })
      .eq("id", existingTranslation.id);

    if (error) {
      console.error(`Failed to update ${locale} translation:`, error);
      return t("errorUpdateFailed");
    }
    return null;
  }

  const { error } = await adminClient.from("announcements").insert({
    ...commonData,
    ...languageData,
    created_by: userId,
    locale,
    parent_id: parentId,
  });

  if (error) {
    console.error(`Failed to create ${locale} translation:`, error);
    return t("errorCreateFailed");
  }
  return null;
}

function extractCommonData(formData: FormData): CommonAnnouncementData {
  const dismissible = formData.has("dismissible");
  const ends_at = (formData.get("ends_at") as string) || null;
  const priority = ((formData.get("priority") as string) || "info") as
    | "info"
    | "warning"
    | "error";
  const published = formData.has("published");
  const starts_at = (formData.get("starts_at") as string) || null;

  // Validate using Zod
  const result = z
    .object({
      dismissible: z.boolean(),
      ends_at: z.string().nullable(),
      priority: z.enum(["info", "warning", "error"]),
      published: z.boolean(),
      starts_at: z.string().nullable(),
    })
    .safeParse({
      dismissible,
      ends_at,
      priority,
      published,
      starts_at,
    });

  if (!result.success) {
    console.error("Common data validation failed:", result.error);
    throw new Error("Invalid common data");
  }

  return result.data;
}

type LanguageData = Record<
  string,
  { title: string; content: string } | undefined
>;

function extractLanguageData(formData: FormData): LanguageData {
  const languages: LanguageData = {};

  // Extract all language data dynamically
  const locales = ["ja", "en"]; // This could be made configurable
  for (const locale of locales) {
    const title = (formData.get(`${locale}.title`) as string) || "";
    const content = (formData.get(`${locale}.content`) as string) || "";

    if (title && content) {
      // Validate using Zod
      const result = z
        .object({
          content: z.string().min(1),
          title: z.string().min(1),
        })
        .safeParse({ content, title });

      if (result.success) {
        languages[locale] = result.data;
      }
    }
  }

  return languages;
}

async function processAnnouncementUpdates(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  currentAnnouncement: { id: string; locale: string; parent_id: string | null },
  commonData: CommonAnnouncementData,
  languageData: LanguageData
): Promise<string[]> {
  const warnings: string[] = [];
  const parentId = currentAnnouncement.parent_id || currentAnnouncement.id;

  // Update all language versions
  for (const [locale, data] of Object.entries(languageData)) {
    if (data) {
      const warning = await updateOrCreateLanguageAnnouncement(
        adminClient,
        userId,
        currentAnnouncement,
        parentId,
        commonData,
        locale,
        data
      );
      if (warning) {
        console.error(warning);
        warnings.push(warning);
      }
    }
  }

  return warnings;
}

export async function updateAnnouncementAction(
  announcementId: string,
  _prevState: unknown,
  formData: FormData
) {
  const t = await getTranslations("Admin");

  if (!isValidUUID(announcementId)) {
    return {
      ...initialFormState,
      errors: [t("errorInvalidUuid")],
      meta: { success: false },
    };
  }

  const { isAdmin, userId } = await verifyAdminRole();
  if (!(isAdmin && userId)) {
    return {
      ...initialFormState,
      errors: [t("errorNoPermission")],
      meta: { success: false },
    };
  }

  try {
    await updateAnnouncementValidate(formData);

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
        errors: [t("errorUpdateFailed")],
        meta: { success: false },
      };
    }

    // Extract common fields
    const commonData = extractCommonData(formData);

    // Extract language-specific data
    const languageData = extractLanguageData(formData);

    // At least one language must be provided
    if (Object.keys(languageData).length === 0) {
      return {
        ...initialFormState,
        errors: [t("errorAtLeastOneLanguageRequired")],
        meta: { success: false },
      };
    }

    const warnings = await processAnnouncementUpdates(
      adminClient,
      userId,
      currentAnnouncement,
      commonData,
      languageData
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
