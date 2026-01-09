import { z } from "zod";
import {
  AVATAR_MAX_FILE_SIZE,
  isValidAvatarMimeType,
} from "@/lib/constants/avatar";

export const usernameSchema = z.object({
  username: z.string().trim().min(1).max(50),
});

export type UsernameFormData = z.infer<typeof usernameSchema>;

export const emailChangeSchema = z.object({
  email: z.string().trim().min(1).email().max(255),
});

export type EmailChangeFormData = z.infer<typeof emailChangeSchema>;

export const avatarUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= AVATAR_MAX_FILE_SIZE, {
      message: "File size must be less than 2MB",
    })
    .refine((file) => isValidAvatarMimeType(file.type), {
      message: "Only JPEG, PNG, and WebP images are allowed",
    }),
});

export type AvatarUploadFormData = z.infer<typeof avatarUploadSchema>;
