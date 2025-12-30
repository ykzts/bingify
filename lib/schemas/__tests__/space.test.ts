import { describe, expect, it } from "vitest";
import {
  checkEmailAllowed,
  createSpaceFormSchema,
  emailAllowlistSchema,
  gatekeeperModeSchema,
  parseEmailAllowlist,
  socialPlatformSchema,
  updateSpaceFormSchema,
} from "../space";

describe("gatekeeperModeSchema", () => {
  it("should accept valid gatekeeper modes", () => {
    expect(gatekeeperModeSchema.parse("none")).toBe("none");
    expect(gatekeeperModeSchema.parse("social")).toBe("social");
    expect(gatekeeperModeSchema.parse("email")).toBe("email");
  });

  it("should reject invalid gatekeeper modes", () => {
    expect(() => gatekeeperModeSchema.parse("invalid")).toThrow();
  });
});

describe("socialPlatformSchema", () => {
  it("should accept valid social platforms", () => {
    expect(socialPlatformSchema.parse("youtube")).toBe("youtube");
    expect(socialPlatformSchema.parse("twitch")).toBe("twitch");
  });

  it("should reject invalid social platforms", () => {
    expect(() => socialPlatformSchema.parse("facebook")).toThrow();
  });
});

describe("updateSpaceFormSchema - exclusive gatekeeper modes", () => {
  it("should accept none mode without any rules", () => {
    const result = updateSpaceFormSchema.safeParse({
      description: "Test space",
      email_allowlist: "",
      gatekeeper_mode: "none",
      max_participants: 50,
      title: "Test",
      twitch_broadcaster_id: "",
      twitch_requirement: "none",
      youtube_channel_id: "",
      youtube_requirement: "none",
    });
    expect(result.success).toBe(true);
  });

  it("should accept social mode with YouTube platform and valid channel", () => {
    const result = updateSpaceFormSchema.safeParse({
      description: "Test space",
      email_allowlist: "",
      gatekeeper_mode: "social",
      max_participants: 50,
      social_platform: "youtube",
      title: "Test",
      twitch_broadcaster_id: "",
      twitch_requirement: "none",
      youtube_channel_id: "UCxxxxxxxxxxxxxxxxxxxxxx",
      youtube_requirement: "subscriber",
    });
    expect(result.success).toBe(true);
  });

  it("should reject social mode with YouTube when channel ID is invalid", () => {
    const result = updateSpaceFormSchema.safeParse({
      description: "Test space",
      email_allowlist: "",
      gatekeeper_mode: "social",
      max_participants: 50,
      social_platform: "youtube",
      title: "Test",
      twitch_broadcaster_id: "",
      twitch_requirement: "none",
      youtube_channel_id: "invalid",
      youtube_requirement: "subscriber",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("youtube_channel_id");
    }
  });

  it("should accept social mode with Twitch platform and valid broadcaster ID", () => {
    const result = updateSpaceFormSchema.safeParse({
      description: "Test space",
      email_allowlist: "",
      gatekeeper_mode: "social",
      max_participants: 50,
      social_platform: "twitch",
      title: "Test",
      twitch_broadcaster_id: "123456789",
      twitch_requirement: "follower",
      youtube_channel_id: "",
      youtube_requirement: "none",
    });
    expect(result.success).toBe(true);
  });

  it("should reject social mode with Twitch when broadcaster ID is invalid", () => {
    const result = updateSpaceFormSchema.safeParse({
      description: "Test space",
      email_allowlist: "",
      gatekeeper_mode: "social",
      max_participants: 50,
      social_platform: "twitch",
      title: "Test",
      twitch_broadcaster_id: "notanumber",
      twitch_requirement: "follower",
      youtube_channel_id: "",
      youtube_requirement: "none",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("twitch_broadcaster_id");
    }
  });

  it("should accept email mode with valid email patterns", () => {
    const result = updateSpaceFormSchema.safeParse({
      description: "Test space",
      email_allowlist: "@example.com, user@test.org",
      gatekeeper_mode: "email",
      max_participants: 50,
      title: "Test",
      twitch_broadcaster_id: "",
      twitch_requirement: "none",
      youtube_channel_id: "",
      youtube_requirement: "none",
    });
    expect(result.success).toBe(true);
  });

  it("should reject email mode without email patterns", () => {
    const result = updateSpaceFormSchema.safeParse({
      description: "Test space",
      email_allowlist: "",
      gatekeeper_mode: "email",
      max_participants: 50,
      title: "Test",
      twitch_broadcaster_id: "",
      twitch_requirement: "none",
      youtube_channel_id: "",
      youtube_requirement: "none",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email_allowlist");
    }
  });

  it("should reject social mode without social_platform specified", () => {
    const result = updateSpaceFormSchema.safeParse({
      description: "Test space",
      email_allowlist: "",
      gatekeeper_mode: "social",
      max_participants: 50,
      title: "Test",
      twitch_broadcaster_id: "",
      twitch_requirement: "none",
      youtube_channel_id: "",
      youtube_requirement: "none",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("social_platform");
    }
  });
});

describe("createSpaceFormSchema - exclusive gatekeeper modes", () => {
  it("should accept none mode without any rules", () => {
    const result = createSpaceFormSchema.safeParse({
      email_allowlist: "",
      gatekeeper_mode: "none",
      max_participants: 50,
      shareKey: "test-space",
      twitch_broadcaster_id: "",
      twitch_requirement: "none",
      youtube_channel_id: "",
      youtube_requirement: "none",
    });
    expect(result.success).toBe(true);
  });

  it("should reject social mode without social_platform specified", () => {
    const result = createSpaceFormSchema.safeParse({
      email_allowlist: "",
      gatekeeper_mode: "social",
      max_participants: 50,
      shareKey: "test-space",
      twitch_broadcaster_id: "",
      twitch_requirement: "none",
      youtube_channel_id: "",
      youtube_requirement: "none",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("social_platform");
    }
  });

  it("should accept social mode with YouTube platform and valid channel", () => {
    const result = createSpaceFormSchema.safeParse({
      email_allowlist: "",
      gatekeeper_mode: "social",
      max_participants: 50,
      shareKey: "test-space",
      social_platform: "youtube",
      twitch_broadcaster_id: "",
      twitch_requirement: "none",
      youtube_channel_id: "UCxxxxxxxxxxxxxxxxxxxxxx",
      youtube_requirement: "subscriber",
    });
    expect(result.success).toBe(true);
  });

  it("should accept social mode with Twitch platform and valid broadcaster ID", () => {
    const result = createSpaceFormSchema.safeParse({
      email_allowlist: "",
      gatekeeper_mode: "social",
      max_participants: 50,
      shareKey: "test-space",
      social_platform: "twitch",
      twitch_broadcaster_id: "123456789",
      twitch_requirement: "follower",
      youtube_channel_id: "",
      youtube_requirement: "none",
    });
    expect(result.success).toBe(true);
  });
});

describe("parseEmailAllowlist", () => {
  it("should parse comma-separated patterns", () => {
    const result = parseEmailAllowlist(
      "@example.com, @test.org, user@mail.com"
    );
    expect(result).toEqual(["@example.com", "@test.org", "user@mail.com"]);
  });

  it("should parse newline-separated patterns", () => {
    const result = parseEmailAllowlist(
      "@example.com\n@test.org\nuser@mail.com"
    );
    expect(result).toEqual(["@example.com", "@test.org", "user@mail.com"]);
  });

  it("should parse mixed separators", () => {
    const result = parseEmailAllowlist("@example.com,@test.org\nuser@mail.com");
    expect(result).toEqual(["@example.com", "@test.org", "user@mail.com"]);
  });

  it("should normalize domain without @ to @domain", () => {
    const result = parseEmailAllowlist("example.com, test.org");
    expect(result).toEqual(["@example.com", "@test.org"]);
  });

  it("should keep @ prefixed domains as is", () => {
    const result = parseEmailAllowlist("@example.com");
    expect(result).toEqual(["@example.com"]);
  });

  it("should keep full email addresses as is", () => {
    const result = parseEmailAllowlist("user@example.com");
    expect(result).toEqual(["user@example.com"]);
  });

  it("should return empty array for empty input", () => {
    const result = parseEmailAllowlist("");
    expect(result).toEqual([]);
  });

  it("should return empty array for whitespace only input", () => {
    const result = parseEmailAllowlist("   ");
    expect(result).toEqual([]);
  });

  it("should trim whitespace from patterns", () => {
    const result = parseEmailAllowlist("  @example.com  ,  user@test.com  ");
    expect(result).toEqual(["@example.com", "user@test.com"]);
  });

  it("should filter out empty patterns", () => {
    const result = parseEmailAllowlist("@example.com,,@test.org");
    expect(result).toEqual(["@example.com", "@test.org"]);
  });
});

describe("emailAllowlistSchema", () => {
  it("should accept valid domain patterns with @", () => {
    const result = emailAllowlistSchema.safeParse("@example.com, @test.org");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["@example.com", "@test.org"]);
    }
  });

  it("should accept valid domain patterns without @", () => {
    const result = emailAllowlistSchema.safeParse("example.com, test.org");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["@example.com", "@test.org"]);
    }
  });

  it("should accept valid full email addresses", () => {
    const result = emailAllowlistSchema.safeParse(
      "user@example.com, admin@test.org"
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["user@example.com", "admin@test.org"]);
    }
  });

  it("should accept mixed patterns", () => {
    const result = emailAllowlistSchema.safeParse(
      "@example.com, user@test.org, another.com"
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        "@example.com",
        "user@test.org",
        "@another.com",
      ]);
    }
  });

  it("should accept empty string", () => {
    const result = emailAllowlistSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("should accept undefined", () => {
    const result = emailAllowlistSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("should reject invalid patterns without dot", () => {
    const result = emailAllowlistSchema.safeParse("@example");
    expect(result.success).toBe(false);
  });

  it("should reject patterns with only @", () => {
    const result = emailAllowlistSchema.safeParse("@");
    expect(result.success).toBe(false);
  });

  it("should reject invalid email format", () => {
    const result = emailAllowlistSchema.safeParse("invalid@");
    expect(result.success).toBe(false);
  });
});

describe("checkEmailAllowed", () => {
  it("should allow any email when allowlist is empty", () => {
    expect(checkEmailAllowed("user@example.com", [])).toBe(true);
    expect(checkEmailAllowed("admin@test.org", [])).toBe(true);
  });

  it("should match domain pattern with @", () => {
    expect(checkEmailAllowed("user@example.com", ["@example.com"])).toBe(true);
    expect(checkEmailAllowed("admin@example.com", ["@example.com"])).toBe(true);
  });

  it("should not match different domain", () => {
    expect(checkEmailAllowed("user@test.org", ["@example.com"])).toBe(false);
  });

  it("should match full email address", () => {
    expect(checkEmailAllowed("user@example.com", ["user@example.com"])).toBe(
      true
    );
  });

  it("should not match different email address", () => {
    expect(checkEmailAllowed("admin@example.com", ["user@example.com"])).toBe(
      false
    );
  });

  it("should match against multiple patterns", () => {
    const patterns = ["@example.com", "admin@test.org", "@another.org"];
    expect(checkEmailAllowed("user@example.com", patterns)).toBe(true);
    expect(checkEmailAllowed("admin@test.org", patterns)).toBe(true);
    expect(checkEmailAllowed("user@another.org", patterns)).toBe(true);
  });

  it("should not match if no patterns match", () => {
    const patterns = ["@example.com", "admin@test.org"];
    expect(checkEmailAllowed("user@different.com", patterns)).toBe(false);
  });

  it("should be case insensitive for domain matching", () => {
    expect(checkEmailAllowed("User@Example.COM", ["@example.com"])).toBe(true);
    expect(checkEmailAllowed("user@example.com", ["@Example.COM"])).toBe(true);
  });

  it("should be case insensitive for email matching", () => {
    expect(checkEmailAllowed("User@Example.COM", ["user@example.com"])).toBe(
      true
    );
    expect(checkEmailAllowed("user@example.com", ["User@Example.COM"])).toBe(
      true
    );
  });

  it("should not match subdomain with parent domain pattern", () => {
    // Domain matching is exact suffix, so sub.example.com doesn't match @example.com
    expect(checkEmailAllowed("user@sub.example.com", ["@example.com"])).toBe(
      false
    );
  });

  it("should not match partial domain", () => {
    // Should not match "test@notexample.com" with "@example.com"
    expect(checkEmailAllowed("test@notexample.com", ["@example.com"])).toBe(
      false
    );
  });
});
