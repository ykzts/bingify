import { z } from "zod";

// Regex constants
const YOUTUBE_CHANNEL_ID_REGEX = /^UC[a-zA-Z0-9_-]{22}$/;
const TWITCH_BROADCASTER_ID_REGEX = /^\d+$/;
const EMAIL_PATTERN_SPLIT_REGEX = /[\n,]+/;
const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_FORMAT_REGEX = /^@[^\s@]+\.[^\s@]+$/;

/**
 * Parse and normalize email patterns from a comma/newline separated string.
 * Supports:
 * - @example.com (domain with @)
 * - example.com (domain without @, normalized to @example.com)
 * - user@example.com (full email address)
 */
export function parseEmailAllowlist(input: string): string[] {
  if (!input.trim()) {
    return [];
  }

  const patterns = input
    .split(EMAIL_PATTERN_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return patterns.map((pattern) => {
    // If it starts with @, keep as is
    if (pattern.startsWith("@")) {
      return pattern;
    }
    // If it contains @, it's a full email
    if (pattern.includes("@")) {
      return pattern;
    }
    // Otherwise, it's a domain without @, normalize to @domain
    return `@${pattern}`;
  });
}

/**
 * Check if an email matches any pattern in the allowlist
 */
export function checkEmailAllowed(
  email: string,
  allowedPatterns: string[]
): boolean {
  if (allowedPatterns.length === 0) {
    // Empty allowlist means no restrictions
    return true;
  }

  const normalizedEmail = email.toLowerCase();

  for (const pattern of allowedPatterns) {
    const normalizedPattern = pattern.toLowerCase();

    if (normalizedPattern.startsWith("@")) {
      // Domain matching: check if email ends with the domain
      if (normalizedEmail.endsWith(normalizedPattern)) {
        return true;
      }
    } else if (normalizedEmail === normalizedPattern) {
      // Full email matching
      return true;
    }
  }

  return false;
}

export const spaceSchema = z.object({
  slug: z
    .string()
    .min(3, "3文字以上入力してください")
    .max(30, "30文字以内で入力してください")
    .regex(/^[a-z0-9-]+$/, "小文字の英数字とハイフンのみ使用できます"),
});

// Max participants validation
export const maxParticipantsSchema = z
  .number()
  .int("整数を入力してください")
  .min(1, "1人以上を指定してください")
  .max(1000, "最大1000人までです")
  .default(50);

export const youtubeChannelIdSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      value === "" ||
      YOUTUBE_CHANNEL_ID_REGEX.test(value),
    {
      message:
        "YouTubeチャンネルIDの形式が正しくありません。'UC'で始まる24文字である必要があります。",
    }
  );

// Twitch broadcaster ID validation (numeric string)
export const twitchBroadcasterIdSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      value === "" ||
      TWITCH_BROADCASTER_ID_REGEX.test(value),
    {
      message:
        "Twitch配信者IDの形式が正しくありません。数字のみで入力してください。",
    }
  );

// YouTube requirement levels
export const youtubeRequirementSchema = z.enum(["none", "subscriber"]);

// Twitch requirement levels
export const twitchRequirementSchema = z.enum([
  "none",
  "follower",
  "subscriber",
]);

export type SpaceFormData = z.infer<typeof spaceSchema>;

// Space status enum
export const spaceStatusSchema = z.enum([
  "draft",
  "active",
  "archived",
  "expired",
]);

export type SpaceStatus = z.infer<typeof spaceStatusSchema>;

// Gatekeeper mode enum
export const gatekeeperModeSchema = z.enum(["none", "social", "email"]);
export type GatekeeperMode = z.infer<typeof gatekeeperModeSchema>;

// Social platform enum
export const socialPlatformSchema = z.enum(["youtube", "twitch"]);
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;

// Schema for space update (settings page)
export const updateSpaceFormSchema = z
  .object({
    description: z
      .string()
      .trim()
      .max(500, "説明は500文字以内で入力してください")
      .optional(),
    email_allowlist: z.string().trim().optional(),
    gatekeeper_mode: gatekeeperModeSchema,
    max_participants: z
      .number()
      .int("整数を入力してください")
      .min(1, "1人以上を指定してください")
      .max(1000, "最大1000人までです"),
    social_platform: socialPlatformSchema.optional(),
    title: z
      .string()
      .trim()
      .max(100, "タイトルは100文字以内で入力してください")
      .optional(),
    twitch_broadcaster_id: z.string().trim().optional(),
    twitch_requirement: z.enum(["none", "follower", "subscriber"]),
    youtube_channel_id: z.string().trim().optional(),
    youtube_requirement: z.enum(["none", "subscriber"]),
  })
  .refine(
    (data) => {
      // If social mode, social_platform must be specified
      if (data.gatekeeper_mode === "social") {
        return data.social_platform !== undefined;
      }
      return true;
    },
    {
      message:
        "ソーシャル連携を選択する場合、プラットフォームを指定してください",
      path: ["social_platform"],
    }
  )
  .refine(
    (data) => {
      // If social mode with YouTube, channel ID must be provided
      if (
        data.gatekeeper_mode === "social" &&
        data.social_platform === "youtube" &&
        data.youtube_requirement !== "none"
      ) {
        return (
          data.youtube_channel_id &&
          data.youtube_channel_id.trim() !== "" &&
          YOUTUBE_CHANNEL_ID_REGEX.test(data.youtube_channel_id)
        );
      }
      return true;
    },
    {
      message:
        "YouTube要件を設定する場合、有効なチャンネルID（'UC'で始まる24文字）が必要です",
      path: ["youtube_channel_id"],
    }
  )
  .refine(
    (data) => {
      // If social mode with Twitch, broadcaster ID must be provided
      if (
        data.gatekeeper_mode === "social" &&
        data.social_platform === "twitch" &&
        data.twitch_requirement !== "none"
      ) {
        return (
          data.twitch_broadcaster_id &&
          data.twitch_broadcaster_id.trim() !== "" &&
          TWITCH_BROADCASTER_ID_REGEX.test(data.twitch_broadcaster_id)
        );
      }
      return true;
    },
    {
      message: "Twitch要件を設定する場合、有効な配信者ID（数字のみ）が必要です",
      path: ["twitch_broadcaster_id"],
    }
  )
  .refine(
    (data) => {
      // Validate email allowlist format if in email mode
      if (data.gatekeeper_mode === "email") {
        if (!data.email_allowlist || data.email_allowlist.trim() === "") {
          return false;
        }
        const patterns = parseEmailAllowlist(data.email_allowlist);
        if (patterns.length === 0) {
          return false;
        }
        return patterns.every((pattern) => {
          return (
            DOMAIN_FORMAT_REGEX.test(pattern) ||
            EMAIL_FORMAT_REGEX.test(pattern)
          );
        });
      }
      return true;
    },
    {
      message:
        "メールアドレス制限を設定する場合、少なくとも1つのメールアドレスまたはドメインが必要です。例: @example.com, user@example.com, example.com",
      path: ["email_allowlist"],
    }
  )
  .transform((data) => {
    // Transform email allowlist to array
    const emailAllowlist = data.email_allowlist
      ? parseEmailAllowlist(data.email_allowlist)
      : [];

    return {
      ...data,
      email_allowlist: emailAllowlist,
    };
  });

export type UpdateSpaceFormData = z.infer<typeof updateSpaceFormSchema>;

// Comprehensive schema for space creation including gatekeeper settings
export const createSpaceFormSchema = z
  .object({
    email_allowlist: z.string().trim().optional(),
    gatekeeper_mode: gatekeeperModeSchema.default("none"),
    max_participants: z
      .number()
      .int("整数を入力してください")
      .min(1, "1人以上を指定してください")
      .max(1000, "最大1000人までです")
      .default(50),
    slug: z
      .string()
      .min(3, "3文字以上入力してください")
      .max(30, "30文字以内で入力してください")
      .regex(/^[a-z0-9-]+$/, "小文字の英数字とハイフンのみ使用できます"),
    social_platform: socialPlatformSchema.optional(),
    twitch_broadcaster_id: z.string().trim().optional(),
    twitch_requirement: z
      .enum(["none", "follower", "subscriber"])
      .default("none"),
    youtube_channel_id: z.string().trim().optional(),
    youtube_requirement: z.enum(["none", "subscriber"]).default("none"),
  })
  .refine(
    (data) => {
      // If social mode, social_platform must be specified
      if (data.gatekeeper_mode === "social") {
        return data.social_platform !== undefined;
      }
      return true;
    },
    {
      message:
        "ソーシャル連携を選択する場合、プラットフォームを指定してください",
      path: ["social_platform"],
    }
  )
  .refine(
    (data) => {
      // If social mode with YouTube, channel ID must be provided
      if (
        data.gatekeeper_mode === "social" &&
        data.social_platform === "youtube" &&
        data.youtube_requirement !== "none"
      ) {
        return (
          data.youtube_channel_id &&
          data.youtube_channel_id.trim() !== "" &&
          YOUTUBE_CHANNEL_ID_REGEX.test(data.youtube_channel_id)
        );
      }
      return true;
    },
    {
      message:
        "YouTube要件を設定する場合、有効なチャンネルID（'UC'で始まる24文字）が必要です",
      path: ["youtube_channel_id"],
    }
  )
  .refine(
    (data) => {
      // If social mode with Twitch, broadcaster ID must be provided
      if (
        data.gatekeeper_mode === "social" &&
        data.social_platform === "twitch" &&
        data.twitch_requirement !== "none"
      ) {
        return (
          data.twitch_broadcaster_id &&
          data.twitch_broadcaster_id.trim() !== "" &&
          TWITCH_BROADCASTER_ID_REGEX.test(data.twitch_broadcaster_id)
        );
      }
      return true;
    },
    {
      message: "Twitch要件を設定する場合、有効な配信者ID（数字のみ）が必要です",
      path: ["twitch_broadcaster_id"],
    }
  )
  .refine(
    (data) => {
      // Validate email allowlist format if in email mode
      if (data.gatekeeper_mode === "email") {
        if (!data.email_allowlist || data.email_allowlist.trim() === "") {
          return false;
        }
        const patterns = parseEmailAllowlist(data.email_allowlist);
        if (patterns.length === 0) {
          return false;
        }
        return patterns.every((pattern) => {
          return (
            DOMAIN_FORMAT_REGEX.test(pattern) ||
            EMAIL_FORMAT_REGEX.test(pattern)
          );
        });
      }
      return true;
    },
    {
      message:
        "メールアドレス制限を設定する場合、少なくとも1つのメールアドレスまたはドメインが必要です。例: @example.com, user@example.com, example.com",
      path: ["email_allowlist"],
    }
  )
  .transform((data) => {
    // Transform email allowlist to array
    const emailAllowlist = data.email_allowlist
      ? parseEmailAllowlist(data.email_allowlist)
      : [];

    return {
      ...data,
      email_allowlist: emailAllowlist,
    };
  });

export type CreateSpaceFormData = z.infer<typeof createSpaceFormSchema>;

/**
 * Validate email patterns in the allowlist
 */
export const emailAllowlistSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return [];
    }
    return parseEmailAllowlist(value);
  })
  .refine(
    (patterns) => {
      // Basic validation: each pattern should be either @domain or email format
      return patterns.every((pattern) => {
        return (
          DOMAIN_FORMAT_REGEX.test(pattern) || EMAIL_FORMAT_REGEX.test(pattern)
        );
      });
    },
    {
      message:
        "メールアドレスまたはドメインの形式が正しくありません。例: @example.com, user@example.com, example.com",
    }
  );
