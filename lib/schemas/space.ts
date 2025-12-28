import { z } from "zod";

export const spaceSchema = z.object({
  slug: z
    .string()
    .min(3, "3文字以上入力してください")
    .max(30, "30文字以内で入力してください")
    .regex(/^[a-z0-9-]+$/, "小文字の英数字とハイフンのみ使用できます"),
});

const YOUTUBE_CHANNEL_ID_REGEX = /^UC[a-zA-Z0-9_-]{22}$/;

export const youtubeChannelIdSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      value === "" ||
      YOUTUBE_CHANNEL_ID_REGEX.test(value),
    {
      message:
        "Invalid YouTube Channel ID format. Channel IDs start with 'UC' followed by 22 characters.",
    }
  );

export type SpaceFormData = z.infer<typeof spaceSchema>;
