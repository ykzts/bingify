import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

export const oauthConfigFormSchema = z.object({
  clientId: z.string().min(1, "Client IDを入力してください"),
  clientSecret: z.string(),
});

export type OAuthConfigFormValues = z.infer<typeof oauthConfigFormSchema>;

export const oauthConfigFormOpts = formOptions({
  defaultValues: {
    clientId: "",
    clientSecret: "",
  },
});
