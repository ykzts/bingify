"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import {
  createSpaceAnnouncement,
  deleteSpaceAnnouncement,
  updateSpaceAnnouncement,
} from "@/lib/actions/space-announcements";
import { isValidUUID } from "@/lib/utils/uuid";
import { spaceAnnouncementFormOpts } from "../_lib/form-options";

const createSpaceAnnouncementValidate = createServerValidate({
  ...spaceAnnouncementFormOpts,
  onServerValidate: () => undefined,
});

export async function createSpaceAnnouncementAction(
  spaceId: string,
  _prevState: unknown,
  formData: FormData
) {
  if (!isValidUUID(spaceId)) {
    return {
      ...initialFormState,
      errors: ["errorInvalidSpaceId"],
      meta: { success: false },
    };
  }

  try {
    await createSpaceAnnouncementValidate(formData);

    const title = (formData.get("title") as string) || "";
    const content = (formData.get("content") as string) || "";
    const priority = (formData.get("priority") as string) || "info";
    const starts_at = (formData.get("starts_at") as string) || "";
    const ends_at = (formData.get("ends_at") as string) || "";
    const pinned = formData.has("pinned");

    const result = await createSpaceAnnouncement(spaceId, {
      content,
      ends_at: ends_at || null,
      pinned,
      priority: priority as "info" | "warning" | "error",
      starts_at: starts_at || null,
      title,
    });

    if (!result.success) {
      return {
        ...initialFormState,
        errors: [result.error || "errorCreateFailed"],
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
    console.error("Error in createSpaceAnnouncementAction:", e);
    return {
      ...initialFormState,
      errors: ["errorGeneric"],
      meta: { success: false },
    };
  }
}

const updateSpaceAnnouncementValidate = createServerValidate({
  ...spaceAnnouncementFormOpts,
  onServerValidate: () => undefined,
});

export async function updateSpaceAnnouncementAction(
  spaceId: string,
  announcementId: string,
  _prevState: unknown,
  formData: FormData
) {
  if (!isValidUUID(spaceId)) {
    return {
      ...initialFormState,
      errors: ["errorInvalidSpaceId"],
      meta: { success: false },
    };
  }

  if (!isValidUUID(announcementId)) {
    return {
      ...initialFormState,
      errors: ["errorInvalidAnnouncementId"],
      meta: { success: false },
    };
  }

  try {
    await updateSpaceAnnouncementValidate(formData);

    const title = (formData.get("title") as string) || "";
    const content = (formData.get("content") as string) || "";
    const priority = (formData.get("priority") as string) || "info";
    const starts_at = (formData.get("starts_at") as string) || "";
    const ends_at = (formData.get("ends_at") as string) || "";
    const pinned = formData.has("pinned");

    const result = await updateSpaceAnnouncement(spaceId, announcementId, {
      content,
      ends_at: ends_at || null,
      pinned,
      priority: priority as "info" | "warning" | "error",
      starts_at: starts_at || null,
      title,
    });

    if (!result.success) {
      return {
        ...initialFormState,
        errors: [result.error || "errorUpdateFailed"],
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
    console.error("Error in updateSpaceAnnouncementAction:", e);
    return {
      ...initialFormState,
      errors: ["errorGeneric"],
      meta: { success: false },
    };
  }
}

export async function deleteSpaceAnnouncementAction(
  spaceId: string,
  announcementId: string
) {
  return await deleteSpaceAnnouncement(spaceId, announcementId);
}
