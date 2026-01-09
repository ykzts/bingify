import { z } from "zod";

export const usernameSchema = z.object({
  username: z.string().trim().min(1).max(50),
});

export type UsernameFormData = z.infer<typeof usernameSchema>;

export const emailChangeSchema = z.object({
  email: z.string().trim().min(1).email().max(255),
});

export type EmailChangeFormData = z.infer<typeof emailChangeSchema>;

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const avatarUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "File size must be less than 2MB",
    })
    .refine((file) => ALLOWED_MIME_TYPES.includes(file.type), {
      message: "Only JPEG, PNG, and WebP images are allowed",
    }),
});

export type AvatarUploadFormData = z.infer<typeof avatarUploadSchema>;
