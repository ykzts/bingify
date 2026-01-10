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
  description: z.string(),
  email_allowlist: z.string(),
  gatekeeper_mode: z.enum(["none", "social", "email"]),
  hide_metadata_before_join: z.boolean(),
  max_participants: z.number().int().min(1).max(1000),
  social_platform: z.enum(["youtube", "twitch"]),
  title: z.string(),
  twitch_broadcaster_id: z.string(),
  twitch_requirement: z.enum(["none", "follower", "subscriber"]),
  youtube_channel_id: z.string(),
  youtube_requirement: z.enum(["none", "subscriber", "member"]),
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
    twitch_requirement: "follower",
    youtube_channel_id: "",
    youtube_requirement: "subscriber",
  } as SpaceSettingsFormValues,
});
