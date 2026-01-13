import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";
import {
  announcementContentSchema,
  announcementPrioritySchema,
  announcementTitleSchema,
} from "@/lib/schemas/announcement";

export const announcementFormSchema = z.object({
  content: announcementContentSchema,
  dismissible: z.boolean(),
  ends_at: z.string().optional(),
  priority: announcementPrioritySchema,
  published: z.boolean(),
  starts_at: z.string().optional(),
  title: announcementTitleSchema,
});

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export const announcementFormOpts = formOptions({
  defaultValues: {
    content: "",
    dismissible: true,
    ends_at: "",
    priority: "info" as const,
    published: false,
    starts_at: "",
    title: "",
  } as AnnouncementFormValues,
});
