import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";
import {
  announcementContentSchema,
  announcementPrioritySchema,
  announcementTitleSchema,
} from "@/lib/schemas/announcement";

// スキーマ: 各言語のコンテンツ
const languageContentSchema = z.object({
  content: announcementContentSchema,
  title: announcementTitleSchema,
});

export const announcementFormSchema = z.object({
  dismissible: z.boolean(),
  // 日本語版（必須）
  en: languageContentSchema.optional(),
  ends_at: z.string().optional(),
  // 英語版（任意）
  ja: languageContentSchema,
  priority: announcementPrioritySchema,
  published: z.boolean(),
  starts_at: z.string().optional(),
});

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export const announcementFormOpts = formOptions({
  defaultValues: {
    dismissible: true,
    en: {
      content: "",
      title: "",
    },
    ends_at: "",
    ja: {
      content: "",
      title: "",
    },
    priority: "info" as const,
    published: false,
    starts_at: "",
  } as AnnouncementFormValues,
});
