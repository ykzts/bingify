import { z } from "zod";

export const usernameSchema = z.object({
  username: z
    .string()
    .min(1, "ユーザー名を入力してください")
    .max(50, "ユーザー名は50文字以内で入力してください")
    .trim(),
});

export type UsernameFormData = z.infer<typeof usernameSchema>;
