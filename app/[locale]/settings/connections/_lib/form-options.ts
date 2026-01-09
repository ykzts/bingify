import { formOptions } from "@tanstack/react-form-nextjs";
import type { EmailChangeFormData, UsernameFormData } from "@/lib/schemas/user";

export type UsernameFormValues = UsernameFormData;

export const usernameFormOpts = formOptions({
  defaultValues: {
    username: "",
  } as UsernameFormValues,
});

export type EmailChangeFormValues = EmailChangeFormData;

export const emailChangeFormOpts = formOptions({
  defaultValues: {
    email: "",
  } as EmailChangeFormValues,
});
