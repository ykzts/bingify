import { z } from "zod";

export const usernameSchema = z.object({
  username: z.string().trim().min(1).max(50),
});

export type UsernameFormData = z.infer<typeof usernameSchema>;

export const emailChangeSchema = z.object({
  email: z.string().trim().email().max(255),
});

export type EmailChangeFormData = z.infer<typeof emailChangeSchema>;
