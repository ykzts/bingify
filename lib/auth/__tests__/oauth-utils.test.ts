import { describe, expect, it } from "vitest";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import {
  buildOAuthCallbackUrl,
  getGoogleOAuthScopes,
  getScopesForProvider,
  getTwitchOAuthScopes,
  TWITCH_FOLLOWER_SCOPE,
  TWITCH_SUBSCRIPTION_SCOPE,
  YOUTUBE_MEMBERSHIP_SCOPE,
  YOUTUBE_SUBSCRIPTION_SCOPE,
} from "../oauth-utils";

// テスト用のシステム設定を生成するヘルパー関数
function createTestSystemSettings(
  overrides?: Partial<SystemSettings>
): SystemSettings {
  return {
    default_user_role: "organizer",
    features: {
      gatekeeper: {
        email: { enabled: true },
        twitch: {
          enabled: true,
          follower: { enabled: true },
          subscriber: { enabled: true },
        },
        youtube: {
          enabled: true,
          member: { enabled: true },
          subscriber: { enabled: true },
        },
      },
    },
    max_participants_per_space: 50,
    max_spaces_per_user: 5,
    max_total_spaces: 1000,
    space_expiration_hours: 48,
    ...overrides,
  };
}

describe("buildOAuthCallbackUrl", () => {
  it("リダイレクトパスなしでコールバックURLを生成できる", () => {
    const url = buildOAuthCallbackUrl("google");
    expect(url).toContain("/auth/google/callback");
  });

  it("リダイレクトパスありでコールバックURLを生成できる", () => {
    const url = buildOAuthCallbackUrl("twitch", "/spaces/123");
    expect(url).toContain("/auth/twitch/callback");
    expect(url).toContain("redirect=%2Fspaces%2F123");
  });

  it("異なるプロバイダーで正しいURLを生成できる", () => {
    const googleUrl = buildOAuthCallbackUrl("google");
    const twitchUrl = buildOAuthCallbackUrl("twitch");
    expect(googleUrl).toContain("/auth/google/callback");
    expect(twitchUrl).toContain("/auth/twitch/callback");
  });
});

describe("getGoogleOAuthScopes", () => {
  it("YouTubeゲートキーパーが完全に有効な場合、全てのYouTubeスコープを返す", () => {
    const settings = createTestSystemSettings();
    const scopes = getGoogleOAuthScopes(settings);
    expect(scopes).toContain(YOUTUBE_SUBSCRIPTION_SCOPE);
    expect(scopes).toContain(YOUTUBE_MEMBERSHIP_SCOPE);
  });

  it("YouTubeゲートキーパーが無効な場合、undefinedを返す", () => {
    const settings = createTestSystemSettings({
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: true },
            subscriber: { enabled: true },
          },
          youtube: {
            enabled: false,
            member: { enabled: false },
            subscriber: { enabled: false },
          },
        },
      },
    });
    const scopes = getGoogleOAuthScopes(settings);
    expect(scopes).toBeUndefined();
  });

  it("YouTubeサブスクライバーのみ有効な場合、サブスクリプションスコープのみ返す", () => {
    const settings = createTestSystemSettings({
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: true },
            subscriber: { enabled: true },
          },
          youtube: {
            enabled: true,
            member: { enabled: false },
            subscriber: { enabled: true },
          },
        },
      },
    });
    const scopes = getGoogleOAuthScopes(settings);
    expect(scopes).toBe(YOUTUBE_SUBSCRIPTION_SCOPE);
    expect(scopes).not.toContain(YOUTUBE_MEMBERSHIP_SCOPE);
  });

  it("YouTubeメンバーのみ有効な場合、メンバーシップスコープのみ返す", () => {
    const settings = createTestSystemSettings({
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: true },
            subscriber: { enabled: true },
          },
          youtube: {
            enabled: true,
            member: { enabled: true },
            subscriber: { enabled: false },
          },
        },
      },
    });
    const scopes = getGoogleOAuthScopes(settings);
    expect(scopes).toBe(YOUTUBE_MEMBERSHIP_SCOPE);
    expect(scopes).not.toContain(YOUTUBE_SUBSCRIPTION_SCOPE);
  });

  it("YouTube有効だが全ての子機能が無効な場合、undefinedを返す", () => {
    const settings = createTestSystemSettings({
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: true },
            subscriber: { enabled: true },
          },
          youtube: {
            enabled: true,
            member: { enabled: false },
            subscriber: { enabled: false },
          },
        },
      },
    });
    const scopes = getGoogleOAuthScopes(settings);
    expect(scopes).toBeUndefined();
  });
});

describe("getTwitchOAuthScopes", () => {
  it("Twitchゲートキーパーが完全に有効な場合、全てのTwitchスコープを返す", () => {
    const settings = createTestSystemSettings();
    const scopes = getTwitchOAuthScopes(settings);
    expect(scopes).toContain(TWITCH_FOLLOWER_SCOPE);
    expect(scopes).toContain(TWITCH_SUBSCRIPTION_SCOPE);
  });

  it("Twitchゲートキーパーが無効な場合、undefinedを返す", () => {
    const settings = createTestSystemSettings({
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: false,
            follower: { enabled: false },
            subscriber: { enabled: false },
          },
          youtube: {
            enabled: true,
            member: { enabled: true },
            subscriber: { enabled: true },
          },
        },
      },
    });
    const scopes = getTwitchOAuthScopes(settings);
    expect(scopes).toBeUndefined();
  });

  it("Twitchフォロワーのみ有効な場合、フォロワースコープのみ返す", () => {
    const settings = createTestSystemSettings({
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: true },
            subscriber: { enabled: false },
          },
          youtube: {
            enabled: true,
            member: { enabled: true },
            subscriber: { enabled: true },
          },
        },
      },
    });
    const scopes = getTwitchOAuthScopes(settings);
    expect(scopes).toBe(TWITCH_FOLLOWER_SCOPE);
    expect(scopes).not.toContain(TWITCH_SUBSCRIPTION_SCOPE);
  });

  it("Twitchサブスクライバーのみ有効な場合、サブスクリプションスコープのみ返す", () => {
    const settings = createTestSystemSettings({
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: false },
            subscriber: { enabled: true },
          },
          youtube: {
            enabled: true,
            member: { enabled: true },
            subscriber: { enabled: true },
          },
        },
      },
    });
    const scopes = getTwitchOAuthScopes(settings);
    expect(scopes).toBe(TWITCH_SUBSCRIPTION_SCOPE);
    expect(scopes).not.toContain(TWITCH_FOLLOWER_SCOPE);
  });

  it("Twitch有効だが全ての子機能が無効な場合、undefinedを返す", () => {
    const settings = createTestSystemSettings({
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: false },
            subscriber: { enabled: false },
          },
          youtube: {
            enabled: true,
            member: { enabled: true },
            subscriber: { enabled: true },
          },
        },
      },
    });
    const scopes = getTwitchOAuthScopes(settings);
    expect(scopes).toBeUndefined();
  });
});

describe("getScopesForProvider", () => {
  it("googleプロバイダーの場合、YouTube設定に基づいてスコープを返す", () => {
    const settings = createTestSystemSettings();
    const scopes = getScopesForProvider("google", settings);
    expect(scopes).toContain(YOUTUBE_SUBSCRIPTION_SCOPE);
    expect(scopes).toContain(YOUTUBE_MEMBERSHIP_SCOPE);
  });

  it("twitchプロバイダーの場合、Twitch設定に基づいてスコープを返す", () => {
    const settings = createTestSystemSettings();
    const scopes = getScopesForProvider("twitch", settings);
    expect(scopes).toContain(TWITCH_FOLLOWER_SCOPE);
    expect(scopes).toContain(TWITCH_SUBSCRIPTION_SCOPE);
  });

  it("未対応のプロバイダーの場合、undefinedを返す", () => {
    const settings = createTestSystemSettings();
    const scopes = getScopesForProvider("unknown", settings);
    expect(scopes).toBeUndefined();
  });
});
