import { z } from "zod";

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

const YOUTUBE_CHANNEL_ID_REGEX = /^UC[a-zA-Z0-9_-]{22}$/;

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
      value === undefined || value === "" || /^\d+$/.test(value),
    {
      message:
        "Twitch配信者IDの形式が正しくありません。数字のみで入力してください。",
    }
  );

// YouTube requirement levels
export const youtubeRequirementSchema = z.enum(
  ["none", "subscriber", "member"],
  {
    errorMap: () => ({ message: "有効な要件レベルを選択してください" }),
  }
);

// Twitch requirement levels
export const twitchRequirementSchema = z.enum(
  ["none", "follower", "subscriber"],
  {
    errorMap: () => ({ message: "有効な要件レベルを選択してください" }),
  }
);

export type SpaceFormData = z.infer<typeof spaceSchema>;

// Regex constants for email validation
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
