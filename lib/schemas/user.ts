import { z } from "zod";

export const usernameSchema = z.object({
  username: z.string().trim().min(1).max(50),
});

export type UsernameFormData = z.infer<typeof usernameSchema>;
