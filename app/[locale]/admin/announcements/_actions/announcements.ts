"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
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

const createAnnouncementValidate = createServerValidate({
  ...announcementFormOpts,
  onServerValidate: () => undefined,
});

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

    const title = (formData.get("title") as string) || "";
    const content = (formData.get("content") as string) || "";
    const priority = (formData.get("priority") as string) || "info";
    const starts_at = (formData.get("starts_at") as string) || "";
    const ends_at = (formData.get("ends_at") as string) || "";
    const dismissible = formData.has("dismissible");
    const published = formData.has("published");

    const adminClient = createAdminClient();

    const { error } = await adminClient.from("announcements").insert({
      content,
      created_by: userId,
      dismissible,
      ends_at: ends_at || null,
      priority: priority as "info" | "warning" | "error",
      published,
      starts_at: starts_at || null,
      title,
    });

    if (error) {
      console.error("Failed to create announcement:", error);
      return {
        ...initialFormState,
        errors: ["errorCreateFailed"],
        meta: { success: false },
      };
    }

    return {
      ...initialFormState,
      meta: { success: true },
    };
  } catch (e) {
    // Check if it's a ServerValidateError from TanStack Form
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }

    // Some other error occurred
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

  const { isAdmin } = await verifyAdminRole();
  if (!isAdmin) {
    return {
      ...initialFormState,
      errors: ["errorNoPermission"],
      meta: { success: false },
    };
  }

  try {
    await updateAnnouncementValidate(formData);

    const title = (formData.get("title") as string) || "";
    const content = (formData.get("content") as string) || "";
    const priority = (formData.get("priority") as string) || "info";
    const starts_at = (formData.get("starts_at") as string) || "";
    const ends_at = (formData.get("ends_at") as string) || "";
    const dismissible = formData.has("dismissible");
    const published = formData.has("published");

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("announcements")
      .update({
        content,
        dismissible,
        ends_at: ends_at || null,
        priority: priority as "info" | "warning" | "error",
        published,
        starts_at: starts_at || null,
        title,
      })
      .eq("id", announcementId);

    if (error) {
      console.error("Failed to update announcement:", error);
      return {
        ...initialFormState,
        errors: ["errorUpdateFailed"],
        meta: { success: false },
      };
    }

    return {
      ...initialFormState,
      meta: { success: true },
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
