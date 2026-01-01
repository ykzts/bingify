import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

export const usernameFormSchema = z.object({
  username: z.string().trim().min(1).max(50),
});

export type UsernameFormValues = z.infer<typeof usernameFormSchema>;

export const usernameFormOpts = formOptions({
  defaultValues: {
    username: "",
  } as UsernameFormValues,
});
