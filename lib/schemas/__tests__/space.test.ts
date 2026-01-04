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
  it("有効なゲートキーパーモードを受け入れる", () => {
    expect(gatekeeperModeSchema.parse("none")).toBe("none");
    expect(gatekeeperModeSchema.parse("social")).toBe("social");
    expect(gatekeeperModeSchema.parse("email")).toBe("email");
  });

  it("無効なゲートキーパーモードを拒否する", () => {
    expect(() => gatekeeperModeSchema.parse("invalid")).toThrow();
  });
});

describe("socialPlatformSchema", () => {
  it("有効なソーシャルプラットフォームを受け入れる", () => {
    expect(socialPlatformSchema.parse("youtube")).toBe("youtube");
    expect(socialPlatformSchema.parse("twitch")).toBe("twitch");
  });

  it("無効なソーシャルプラットフォームを拒否する", () => {
    expect(() => socialPlatformSchema.parse("facebook")).toThrow();
  });
});

describe("updateSpaceFormSchema - exclusive gatekeeper modes", () => {
  it("ルールなしでnoneモードを受け入れる", () => {
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

  it("YouTubeプラットフォームと有効なチャンネルでsocialモードを受け入れる", () => {
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

  it("チャンネルIDが無効な場合YouTubeでsocialモードを拒否する", () => {
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

  it("Twitchプラットフォームと有効なブロードキャスターIDでsocialモードを受け入れる", () => {
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

  it("ブロードキャスターIDが無効な場合Twitchでsocialモードを拒否する", () => {
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

  it("有効なメールパターンでemailモードを受け入れる", () => {
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

  it("メールパターンなしでemailモードを拒否する", () => {
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

  it("social_platformが指定されていない場合socialモードを拒否する", () => {
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
  it("ルールなしでnoneモードを受け入れる", () => {
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

  it("social_platformが指定されていない場合socialモードを拒否する", () => {
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

  it("YouTubeプラットフォームと有効なチャンネルでsocialモードを受け入れる", () => {
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

  it("Twitchプラットフォームと有効なブロードキャスターIDでsocialモードを受け入れる", () => {
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
  it("カンマ区切りのパターンをパースする", () => {
    const result = parseEmailAllowlist(
      "@example.com, @test.org, user@mail.com"
    );
    expect(result).toEqual(["@example.com", "@test.org", "user@mail.com"]);
  });

  it("改行区切りのパターンをパースする", () => {
    const result = parseEmailAllowlist(
      "@example.com\n@test.org\nuser@mail.com"
    );
    expect(result).toEqual(["@example.com", "@test.org", "user@mail.com"]);
  });

  it("混在した区切り文字をパースする", () => {
    const result = parseEmailAllowlist("@example.com,@test.org\nuser@mail.com");
    expect(result).toEqual(["@example.com", "@test.org", "user@mail.com"]);
  });

  it("@なしのドメインを@domainに正規化する", () => {
    const result = parseEmailAllowlist("example.com, test.org");
    expect(result).toEqual(["@example.com", "@test.org"]);
  });

  it("@接頭辞付きドメインをそのまま保持する", () => {
    const result = parseEmailAllowlist("@example.com");
    expect(result).toEqual(["@example.com"]);
  });

  it("完全なメールアドレスをそのまま保持する", () => {
    const result = parseEmailAllowlist("user@example.com");
    expect(result).toEqual(["user@example.com"]);
  });

  it("空の入力に対して空の配列を返す", () => {
    const result = parseEmailAllowlist("");
    expect(result).toEqual([]);
  });

  it("空白のみの入力に対して空の配列を返す", () => {
    const result = parseEmailAllowlist("   ");
    expect(result).toEqual([]);
  });

  it("パターンから空白をトリムする", () => {
    const result = parseEmailAllowlist("  @example.com  ,  user@test.com  ");
    expect(result).toEqual(["@example.com", "user@test.com"]);
  });

  it("空のパターンをフィルタする", () => {
    const result = parseEmailAllowlist("@example.com,,@test.org");
    expect(result).toEqual(["@example.com", "@test.org"]);
  });
});

describe("emailAllowlistSchema", () => {
  it("@付きの有効なドメインパターンを受け入れる", () => {
    const result = emailAllowlistSchema.safeParse("@example.com, @test.org");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["@example.com", "@test.org"]);
    }
  });

  it("@なしの有効なドメインパターンを受け入れる", () => {
    const result = emailAllowlistSchema.safeParse("example.com, test.org");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["@example.com", "@test.org"]);
    }
  });

  it("有効な完全なメールアドレスを受け入れる", () => {
    const result = emailAllowlistSchema.safeParse(
      "user@example.com, admin@test.org"
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["user@example.com", "admin@test.org"]);
    }
  });

  it("混在したパターンを受け入れる", () => {
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

  it("空文字列を受け入れる", () => {
    const result = emailAllowlistSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("undefinedを受け入れる", () => {
    const result = emailAllowlistSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("ドットなしの無効なパターンを拒否する", () => {
    const result = emailAllowlistSchema.safeParse("@example");
    expect(result.success).toBe(false);
  });

  it("@のみのパターンを拒否する", () => {
    const result = emailAllowlistSchema.safeParse("@");
    expect(result.success).toBe(false);
  });

  it("無効なメールフォーマットを拒否する", () => {
    const result = emailAllowlistSchema.safeParse("invalid@");
    expect(result.success).toBe(false);
  });
});

describe("checkEmailAllowed", () => {
  it("許可リストが空の場合すべてのメールを許可する", () => {
    expect(checkEmailAllowed("user@example.com", [])).toBe(true);
    expect(checkEmailAllowed("admin@test.org", [])).toBe(true);
  });

  it("@付きドメインパターンにマッチする", () => {
    expect(checkEmailAllowed("user@example.com", ["@example.com"])).toBe(true);
    expect(checkEmailAllowed("admin@example.com", ["@example.com"])).toBe(true);
  });

  it("異なるドメインにはマッチしない", () => {
    expect(checkEmailAllowed("user@test.org", ["@example.com"])).toBe(false);
  });

  it("完全なメールアドレスにマッチする", () => {
    expect(checkEmailAllowed("user@example.com", ["user@example.com"])).toBe(
      true
    );
  });

  it("異なるメールアドレスにはマッチしない", () => {
    expect(checkEmailAllowed("admin@example.com", ["user@example.com"])).toBe(
      false
    );
  });

  it("複数のパターンに対してマッチする", () => {
    const patterns = ["@example.com", "admin@test.org", "@another.org"];
    expect(checkEmailAllowed("user@example.com", patterns)).toBe(true);
    expect(checkEmailAllowed("admin@test.org", patterns)).toBe(true);
    expect(checkEmailAllowed("user@another.org", patterns)).toBe(true);
  });

  it("パターンがマッチしない場合はマッチしない", () => {
    const patterns = ["@example.com", "admin@test.org"];
    expect(checkEmailAllowed("user@different.com", patterns)).toBe(false);
  });

  it("ドメインマッチングは大文字小文字を区別しない", () => {
    expect(checkEmailAllowed("User@Example.COM", ["@example.com"])).toBe(true);
    expect(checkEmailAllowed("user@example.com", ["@Example.COM"])).toBe(true);
  });

  it("メールマッチングは大文字小文字を区別しない", () => {
    expect(checkEmailAllowed("User@Example.COM", ["user@example.com"])).toBe(
      true
    );
    expect(checkEmailAllowed("user@example.com", ["User@Example.COM"])).toBe(
      true
    );
  });

  it("親ドメインパターンとサブドメインはマッチしない", () => {
    expect(checkEmailAllowed("user@sub.example.com", ["@example.com"])).toBe(
      false
    );
  });

  it("部分的なドメインマッチを行わない", () => {
    expect(checkEmailAllowed("test@notexample.com", ["@example.com"])).toBe(
      false
    );
  });
});
