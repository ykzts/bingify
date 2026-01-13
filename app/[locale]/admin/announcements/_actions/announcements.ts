"use server";

import { createServerValidate } from "@tanstack/react-form-nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";
import type { Tables } from "@/types/supabase";
import {
  type AnnouncementFormValues,
  announcementFormOpts,
} from "../_lib/form-options";

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
});

export async function createAnnouncementAction(
  _prevState: unknown,
  formData: FormData
) {
  const { isAdmin, userId } = await verifyAdminRole();
  if (!isAdmin || !userId) {
    return {
      error: "errorNoPermission",
      meta: { success: false },
    };
  }

  try {
    const validatedData = (await createAnnouncementValidate(
      formData
    )) as AnnouncementFormValues;

    const adminClient = createAdminClient();

    const { error } = await adminClient.from("announcements").insert({
      content: validatedData.content,
      created_by: userId,
      dismissible: validatedData.dismissible,
      ends_at: validatedData.ends_at || null,
      priority: validatedData.priority,
      published: validatedData.published,
      starts_at: validatedData.starts_at || null,
      title: validatedData.title,
    });

    if (error) {
      console.error("Failed to create announcement:", error);
      return {
        error: "errorCreateFailed",
        meta: { success: false },
      };
    }

    return {
      meta: { success: true },
    };
  } catch (error) {
    console.error("Error in createAnnouncementAction:", error);
    return {
      error: "errorGeneric",
      meta: { success: false },
    };
  }
}

const updateAnnouncementValidate = createServerValidate({
  ...announcementFormOpts,
});

export async function updateAnnouncementAction(
  announcementId: string,
  _prevState: unknown,
  formData: FormData
) {
  if (!isValidUUID(announcementId)) {
    return {
      error: "errorInvalidUuid",
      meta: { success: false },
    };
  }

  const { isAdmin } = await verifyAdminRole();
  if (!isAdmin) {
    return {
      error: "errorNoPermission",
      meta: { success: false },
    };
  }

  try {
    const validatedData = (await updateAnnouncementValidate(
      formData
    )) as AnnouncementFormValues;

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("announcements")
      .update({
        content: validatedData.content,
        dismissible: validatedData.dismissible,
        ends_at: validatedData.ends_at || null,
        priority: validatedData.priority,
        published: validatedData.published,
        starts_at: validatedData.starts_at || null,
        title: validatedData.title,
      })
      .eq("id", announcementId);

    if (error) {
      console.error("Failed to update announcement:", error);
      return {
        error: "errorUpdateFailed",
        meta: { success: false },
      };
    }

    return {
      meta: { success: true },
    };
  } catch (error) {
    console.error("Error in updateAnnouncementAction:", error);
    return {
      error: "errorGeneric",
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
