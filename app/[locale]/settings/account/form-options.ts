import { formOptions } from "@tanstack/react-form-nextjs";
import type { usernameSchema } from "@/lib/schemas/user";
import type { z } from "zod";

export type UsernameFormValues = z.infer<typeof usernameSchema>;

export const usernameFormOpts = formOptions({
  defaultValues: {
    username: "",
  } as UsernameFormValues,
});
