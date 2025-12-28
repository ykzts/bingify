import { z } from "zod";

export const systemSettingsSchema = z.object({
  max_participants_per_space: z
    .number()
    .int("整数を入力してください")
    .min(1, "1人以上を指定してください")
    .max(10000, "最大10000人までです"),
  max_spaces_per_user: z
    .number()
    .int("整数を入力してください")
    .min(1, "1スペース以上を指定してください")
    .max(100, "最大100スペースまでです"),
  space_expiration_hours: z
    .number()
    .int("整数を入力してください")
    .min(0, "0時間以上を指定してください（0は無期限）")
    .max(8760, "最大8760時間（365日）までです"),
});

export type SystemSettings = z.infer<typeof systemSettingsSchema>;
