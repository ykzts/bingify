import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

export const inviteAdminFormSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください")
    .transform((val) => val.trim().toLowerCase()),
});

export type InviteAdminFormValues = z.infer<typeof inviteAdminFormSchema>;

export const inviteAdminFormOpts = formOptions({
  defaultValues: {
    email: "",
  } as InviteAdminFormValues,
});
