import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

export const contactFormSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  message: z.string().min(10, "本文は10文字以上入力してください"),
  name: z.string().min(1, "名前を入力してください"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const contactFormOpts = formOptions({
  defaultValues: {
    email: "",
    message: "",
    name: "",
  },
});
