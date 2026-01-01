import { formOptions } from "@tanstack/react-form-nextjs";
import type { UsernameFormData } from "@/lib/schemas/user";

export type UsernameFormValues = UsernameFormData;

export const usernameFormOpts = formOptions({
  defaultValues: {
    username: "",
  } as UsernameFormValues,
});
