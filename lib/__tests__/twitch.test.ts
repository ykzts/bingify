import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkFollowStatus, checkSubStatus } from "../twitch";

// Mock the twurple modules
const mockGetChannelFollowers = vi.fn();
const mockCheckUserSubscription = vi.fn();

vi.mock("@twurple/api", () => ({
  ApiClient: class {
    channels = {
      getChannelFollowers: mockGetChannelFollowers,
    };
    subscriptions = {
      checkUserSubscription: mockCheckUserSubscription,
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
