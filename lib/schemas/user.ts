import { z } from "zod";

export const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(50, "Username must be 50 characters or less"),
});

export type UsernameFormData = z.infer<typeof usernameSchema>;
