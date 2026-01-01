import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

export const createSpaceFormSchema = z.object({
  share_key: z
    .string()
    .min(3, "3文字以上入力してください")
    .max(30, "30文字以内で入力してください")
    .regex(/^[a-z0-9-]+$/, "小文字の英数字とハイフンのみ使用できます"),
});

export type CreateSpaceFormValues = z.infer<typeof createSpaceFormSchema>;

export const createSpaceFormOpts = formOptions({
  defaultValues: {
    share_key: "",
  } as CreateSpaceFormValues,
});
