import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkFollowStatus,
  checkSubStatus,
  getBroadcasterIdFromUsername,
  parseTwitchInput,
} from "../twitch";

// Mock the twurple modules
const mockGetChannelFollowers = vi.fn();
const mockCheckUserSubscription = vi.fn();
const mockGetUsersByNames = vi.fn();

vi.mock("@twurple/api", () => ({
  ApiClient: class {
    channels = {
      getChannelFollowers: mockGetChannelFollowers,
    };
    subscriptions = {
      checkUserSubscription: mockCheckUserSubscription,
    };
    users = {
      getUsersByNames: mockGetUsersByNames,
    };
  },
}));

vi.mock("@twurple/auth", () => ({
  StaticAuthProvider: class {},
}));

describe("checkFollowStatus", () => {
  const originalClientId = process.env.TWITCH_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWITCH_CLIENT_ID = "test_client_id";
  });

  afterEach(() => {
    process.env.TWITCH_CLIENT_ID = originalClientId;
  });

  it("should return isFollowing true when user follows broadcaster", async () => {
    mockGetChannelFollowers.mockResolvedValue({
      data: [
        {
          followDate: new Date("2024-01-01T00:00:00Z"),
          userId: "123",
          userName: "testuser",
        },
      ],
    });

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockGetChannelFollowers).toHaveBeenCalledWith("456", "123");
  });

  it("should return isFollowing false when user does not follow broadcaster", async () => {
    mockGetChannelFollowers.mockResolvedValue({
      data: [],
    });

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("should return error when access token is missing", async () => {
    const result = await checkFollowStatus("", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockGetChannelFollowers).not.toHaveBeenCalled();
  });

  it("should return error when user ID is missing", async () => {
    const result = await checkFollowStatus("test_access_token", "", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockGetChannelFollowers).not.toHaveBeenCalled();
  });

  it("should return error when broadcaster ID is missing", async () => {
    const result = await checkFollowStatus("test_access_token", "123", "");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockGetChannelFollowers).not.toHaveBeenCalled();
  });

  it("should return error when client ID is not configured", async () => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    process.env.TWITCH_CLIENT_ID = "";

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Twitch client ID not configured");
    expect(mockGetChannelFollowers).not.toHaveBeenCalled();

    // Restore
    process.env.TWITCH_CLIENT_ID = clientId;
  });

  it("should return error when API request fails", async () => {
    mockGetChannelFollowers.mockRejectedValue(
      new Error("API Error: Invalid credentials")
    );

    const result = await checkFollowStatus("invalid_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("API Error: Invalid credentials");
  });

  it("should handle network errors gracefully", async () => {
    mockGetChannelFollowers.mockRejectedValue(new Error("Network error"));

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Network error");
  });
});

describe("checkSubStatus", () => {
  const originalClientId = process.env.TWITCH_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWITCH_CLIENT_ID = "test_client_id";
  });

  afterEach(() => {
    process.env.TWITCH_CLIENT_ID = originalClientId;
  });

  it("should return isSubscribed true when user is subscribed", async () => {
    mockCheckUserSubscription.mockResolvedValue({
      broadcasterId: "456",
      broadcasterName: "testbroadcaster",
      isGift: false,
      tier: "1000",
    });

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockCheckUserSubscription).toHaveBeenCalledWith("123", "456");
  });

  it("should return isSubscribed false when checkUserSubscription returns null", async () => {
    mockCheckUserSubscription.mockResolvedValue(null);

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("should return isSubscribed false when API throws 404 error", async () => {
    mockCheckUserSubscription.mockRejectedValue(new Error("404 Not Found"));

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("should return error when access token is missing", async () => {
    const result = await checkSubStatus("", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockCheckUserSubscription).not.toHaveBeenCalled();
  });

  it("should return error when user ID is missing", async () => {
    const result = await checkSubStatus("test_access_token", "", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockCheckUserSubscription).not.toHaveBeenCalled();
  });

  it("should return error when broadcaster ID is missing", async () => {
    const result = await checkSubStatus("test_access_token", "123", "");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockCheckUserSubscription).not.toHaveBeenCalled();
  });

  it("should return error when client ID is not configured", async () => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    process.env.TWITCH_CLIENT_ID = "";

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Twitch client ID not configured");
    expect(mockCheckUserSubscription).not.toHaveBeenCalled();

    // Restore
    process.env.TWITCH_CLIENT_ID = clientId;
  });

  it("should return error when API returns non-404 error", async () => {
    mockCheckUserSubscription.mockRejectedValue(new Error("401 Unauthorized"));

    const result = await checkSubStatus("invalid_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("401 Unauthorized");
  });

  it("should handle network errors gracefully", async () => {
    mockCheckUserSubscription.mockRejectedValue(new Error("Network error"));

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Network error");
  });
});

describe("parseTwitchInput", () => {
  it("should parse numeric ID", () => {
    const result = parseTwitchInput("123456789");
    expect(result).toEqual({ type: "id", value: "123456789" });
  });

  it("should parse username", () => {
    const result = parseTwitchInput("ninja");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("should parse username with underscores", () => {
    const result = parseTwitchInput("test_user_123");
    expect(result).toEqual({ type: "username", value: "test_user_123" });
  });

  it("should parse username and convert to lowercase", () => {
    const result = parseTwitchInput("NinJa");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("should parse full Twitch URL with https", () => {
    const result = parseTwitchInput("https://www.twitch.tv/ninja");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("should parse full Twitch URL without www", () => {
    const result = parseTwitchInput("https://twitch.tv/shroud");
    expect(result).toEqual({ type: "username", value: "shroud" });
  });

  it("should parse Twitch URL without protocol", () => {
    const result = parseTwitchInput("twitch.tv/ninja");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("should handle URLs with uppercase and convert username to lowercase", () => {
    const result = parseTwitchInput("https://www.twitch.tv/NiNjA");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("should return invalid for empty input", () => {
    const result = parseTwitchInput("");
    expect(result).toEqual({ type: "invalid", value: "" });
  });

  it("should return invalid for whitespace only", () => {
    const result = parseTwitchInput("   ");
    expect(result).toEqual({ type: "invalid", value: "" });
  });

  it("should return invalid for username too short (less than 4 chars)", () => {
    const result = parseTwitchInput("abc");
    expect(result).toEqual({ type: "invalid", value: "abc" });
  });

  it("should return invalid for username too long (more than 25 chars)", () => {
    const result = parseTwitchInput("a".repeat(26));
    expect(result).toEqual({ type: "invalid", value: "a".repeat(26) });
  });

  it("should return invalid for username with special characters", () => {
    const result = parseTwitchInput("test-user");
    expect(result).toEqual({ type: "invalid", value: "test-user" });
  });

  it("should return invalid for malformed URL", () => {
    const result = parseTwitchInput("https://youtube.com/ninja");
    expect(result).toEqual({ type: "invalid", value: "https://youtube.com/ninja" });
  });

  it("should trim whitespace before parsing", () => {
    const result = parseTwitchInput("  ninja  ");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("should parse 4-character username (minimum length)", () => {
    const result = parseTwitchInput("abcd");
    expect(result).toEqual({ type: "username", value: "abcd" });
  });

  it("should parse 25-character username (maximum length)", () => {
    const username = "a".repeat(25);
    const result = parseTwitchInput(username);
    expect(result).toEqual({ type: "username", value: username });
  });
});

describe("getBroadcasterIdFromUsername", () => {
  const originalClientId = process.env.TWITCH_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWITCH_CLIENT_ID = "test_client_id";
  });

  afterEach(() => {
    process.env.TWITCH_CLIENT_ID = originalClientId;
  });

  it("should return broadcaster ID for valid username", async () => {
    mockGetUsersByNames.mockResolvedValue([
      {
        id: "19571641",
        login: "ninja",
        displayName: "Ninja",
      },
    ]);

    const result = await getBroadcasterIdFromUsername("ninja", "test_app_token");

    expect(result.broadcasterId).toBe("19571641");
    expect(result.error).toBeUndefined();
    expect(mockGetUsersByNames).toHaveBeenCalledWith(["ninja"]);
  });

  it("should return error when username is empty", async () => {
    const result = await getBroadcasterIdFromUsername("", "test_app_token");

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("Username is required");
    expect(mockGetUsersByNames).not.toHaveBeenCalled();
  });

  it("should return error when app access token is missing", async () => {
    const result = await getBroadcasterIdFromUsername("ninja", "");

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("App access token is required");
    expect(mockGetUsersByNames).not.toHaveBeenCalled();
  });

  it("should return error when client ID is not configured", async () => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    process.env.TWITCH_CLIENT_ID = "";

    const result = await getBroadcasterIdFromUsername("ninja", "test_app_token");

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("Twitch client ID not configured");
    expect(mockGetUsersByNames).not.toHaveBeenCalled();

    // Restore
    process.env.TWITCH_CLIENT_ID = clientId;
  });

  it("should return error when user is not found", async () => {
    mockGetUsersByNames.mockResolvedValue([]);

    const result = await getBroadcasterIdFromUsername(
      "nonexistentuser",
      "test_app_token"
    );

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("User not found");
  });

  it("should return error when API request fails", async () => {
    mockGetUsersByNames.mockRejectedValue(new Error("API Error: Rate limit exceeded"));

    const result = await getBroadcasterIdFromUsername("ninja", "invalid_token");

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("API Error: Rate limit exceeded");
  });

  it("should handle network errors gracefully", async () => {
    mockGetUsersByNames.mockRejectedValue(new Error("Network error"));

    const result = await getBroadcasterIdFromUsername("ninja", "test_app_token");

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("Network error");
  });
});
