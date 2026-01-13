import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";
import {
  announcementContentSchema,
  announcementPrioritySchema,
  announcementTitleSchema,
} from "@/lib/schemas/announcement";

export const spaceAnnouncementFormSchema = z.object({
  content: announcementContentSchema,
  ends_at: z.string().datetime().optional().or(z.literal("")),
  pinned: z.boolean(),
  priority: announcementPrioritySchema,
  starts_at: z.string().datetime().optional().or(z.literal("")),
  title: announcementTitleSchema,
});

export type SpaceAnnouncementFormValues = z.infer<
  typeof spaceAnnouncementFormSchema
>;

export const spaceAnnouncementFormOpts = formOptions({
  defaultValues: {
    content: "",
    ends_at: "",
    pinned: false,
    priority: "info" as const,
    starts_at: "",
    title: "",
  } as SpaceAnnouncementFormValues,
});
