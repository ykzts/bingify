import { describe, expect, it } from "vitest";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import {
  buildOAuthCallbackUrl,
  GOOGLE_OAUTH_SCOPES,
  getGoogleOAuthScopes,
  getTwitchOAuthScopes,
  TWITCH_OAUTH_SCOPES,
} from "../oauth-utils";

describe("buildOAuthCallbackUrl", () => {
  it("リダイレクトパスなしでコールバックURLを生成できる", () => {
    const url = buildOAuthCallbackUrl();
    expect(url).toContain("/auth/callback");
  });

  it("リダイレクトパスありでコールバックURLを生成できる", () => {
    const url = buildOAuthCallbackUrl("/spaces/123");
    expect(url).toContain("/auth/callback");
    expect(url).toContain("redirect=%2Fspaces%2F123");
  });
});

describe("getGoogleOAuthScopes", () => {
  it("YouTubeゲートキーパーが有効な場合、YouTubeスコープを返す", () => {
    const settings: SystemSettings = {
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
    };

    const scopes = getGoogleOAuthScopes(settings);
    expect(scopes).toBe(GOOGLE_OAUTH_SCOPES);
  });

  it("YouTubeゲートキーパーが無効な場合、undefinedを返す", () => {
    const settings: SystemSettings = {
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
            enabled: false,
            member: { enabled: false },
            subscriber: { enabled: false },
          },
        },
      },
      max_participants_per_space: 50,
      max_spaces_per_user: 5,
      max_total_spaces: 1000,
      space_expiration_hours: 48,
    };

    const scopes = getGoogleOAuthScopes(settings);
    expect(scopes).toBeUndefined();
  });
});

describe("getTwitchOAuthScopes", () => {
  it("Twitchゲートキーパーが有効な場合、Twitchスコープを返す", () => {
    const settings: SystemSettings = {
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
    };

    const scopes = getTwitchOAuthScopes(settings);
    expect(scopes).toBe(TWITCH_OAUTH_SCOPES);
  });

  it("Twitchゲートキーパーが無効な場合、undefinedを返す", () => {
    const settings: SystemSettings = {
      default_user_role: "organizer",
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
      max_participants_per_space: 50,
      max_spaces_per_user: 5,
      max_total_spaces: 1000,
      space_expiration_hours: 48,
    };

    const scopes = getTwitchOAuthScopes(settings);
    expect(scopes).toBeUndefined();
  });
});
