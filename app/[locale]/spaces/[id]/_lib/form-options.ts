import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";
import {
  announcementContentSchema,
  announcementPrioritySchema,
  announcementTitleSchema,
} from "@/lib/schemas/announcement";

// datetime-local入力は "YYYY-MM-DDTHH:MM" 形式を生成するため、
// ISO 8601形式への変換を行うpreprocessを使用
const DATETIME_LOCAL_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const datetimeLocalSchema = z.preprocess(
  (val) => {
    if (typeof val !== "string" || val === "") {
      return val;
    }
    // datetime-local形式 (YYYY-MM-DDTHH:MM) の場合、秒とタイムゾーンを追加
    if (DATETIME_LOCAL_REGEX.test(val)) {
      return `${val}:00Z`;
    }
    return val;
  },
  z.string().datetime().optional().or(z.literal(""))
);

export const spaceAnnouncementFormSchema = z.object({
  content: announcementContentSchema,
  ends_at: datetimeLocalSchema,
  pinned: z.boolean(),
  priority: announcementPrioritySchema,
  starts_at: datetimeLocalSchema,
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
