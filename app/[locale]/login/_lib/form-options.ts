import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

export const emailLoginFormSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
});

export type EmailLoginFormValues = z.infer<typeof emailLoginFormSchema>;

export const emailLoginFormOpts = formOptions({
  defaultValues: {
    email: "",
  },
});
