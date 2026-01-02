import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

export const inviteAdminFormSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください")
    .transform((val) => val.trim().toLowerCase()),
});

export type InviteAdminFormValues = z.infer<typeof inviteAdminFormSchema>;

export const inviteAdminFormOpts = formOptions({
  defaultValues: {
    email: "",
  } as InviteAdminFormValues,
});

// Space settings form schema
export const spaceSettingsFormSchema = z.object({
  description: z.string().default(""),
  email_allowlist: z.string().default(""),
  gatekeeper_mode: z.enum(["none", "social", "email"]).default("none"),
  hide_metadata_before_join: z.boolean().default(false),
  max_participants: z.number().int().min(1).max(1_000).default(50),
  social_platform: z.enum(["youtube", "twitch"]).default("youtube"),
  title: z.string().default(""),
  twitch_broadcaster_id: z.string().default(""),
  twitch_requirement: z
    .enum(["none", "follower", "subscriber"])
    .default("none"),
  youtube_channel_id: z.string().default(""),
  youtube_requirement: z.enum(["none", "subscriber"]).default("none"),
});

export type SpaceSettingsFormValues = z.infer<typeof spaceSettingsFormSchema>;

export const spaceSettingsFormOpts = formOptions({
  defaultValues: {
    description: "",
    email_allowlist: "",
    gatekeeper_mode: "none",
    hide_metadata_before_join: false,
    max_participants: 50,
    social_platform: "youtube",
    title: "",
    twitch_broadcaster_id: "",
    twitch_requirement: "none",
    youtube_channel_id: "",
    youtube_requirement: "none",
  } as SpaceSettingsFormValues,
});
