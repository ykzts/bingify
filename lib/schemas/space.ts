import { z } from "zod";

export const spaceSchema = z.object({
  slug: z
    .string()
    .min(3, "3文字以上入力してください")
    .max(30, "30文字以内で入力してください")
    .regex(/^[a-z0-9-]+$/, "小文字の英数字とハイフンのみ使用できます"),
});

export const youtubeChannelIdSchema = z
  .string()
  .trim()
  .regex(
    /^UC[a-zA-Z0-9_-]{22}$/,
    "Invalid YouTube Channel ID format. Channel IDs start with 'UC' followed by 22 characters."
  )
  .optional()
  .or(z.literal(""));

export type SpaceFormData = z.infer<typeof spaceSchema>;
