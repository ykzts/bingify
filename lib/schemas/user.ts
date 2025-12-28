import { z } from "zod";

export const usernameSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username must be 50 characters or less")
    .trim(),
});

export type UsernameFormData = z.infer<typeof usernameSchema>;
