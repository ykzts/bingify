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

export const announcementFormSchema = z
  .object({
    dismissible: z.boolean(),
    // 英語版（任意）
    en: languageContentSchema.optional(),
    ends_at: z.string().optional(),
    // 日本語版（任意）
    ja: languageContentSchema.optional(),
    priority: announcementPrioritySchema,
    published: z.boolean(),
    starts_at: z.string().optional(),
  })
  .refine(
    (data) => {
      // 少なくとも1つの言語が入力されている必要がある
      const hasJa = data.ja?.title && data.ja?.content;
      const hasEn = data.en?.title && data.en?.content;
      return hasJa || hasEn;
    },
    {
      message: "At least one language (Japanese or English) must be provided",
      path: ["ja"],
    }
  );

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
