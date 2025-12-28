import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkFollowStatus, checkSubStatus } from "../twitch";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("checkFollowStatus", () => {
  const originalClientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = "test_client_id";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = originalClientId;
  });

  it("should return isFollowing true when user follows broadcaster", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            followed_at: "2024-01-01T00:00:00Z",
            user_id: "123",
            user_name: "testuser",
          },
        ],
      }),
    });

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://api.twitch.tv/helix/channels/followers?user_id=123&broadcaster_id=456"
      ),
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test_access_token",
          "Client-Id": "test_client_id",
        },
      })
    );
  });

  it("should return isFollowing false when user does not follow broadcaster", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
      }),
    });

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("should return error when access token is missing", async () => {
    const result = await checkFollowStatus("", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return error when user ID is missing", async () => {
    const result = await checkFollowStatus("test_access_token", "", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return error when broadcaster ID is missing", async () => {
    const result = await checkFollowStatus("test_access_token", "123", "");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return error when client ID is not configured", async () => {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = "";

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Twitch client ID not configured");
    expect(mockFetch).not.toHaveBeenCalled();

    // Restore
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = clientId;
  });

  it("should return error when API request fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    const result = await checkFollowStatus("invalid_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Twitch API error: 401 Unauthorized");
  });

  it("should handle network errors gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Network error");
  });
});

describe("checkSubStatus", () => {
  const originalClientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = "test_client_id";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = originalClientId;
  });

  it("should return isSubscribed true when user is subscribed", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            broadcaster_id: "456",
            broadcaster_name: "testbroadcaster",
            is_gift: false,
            tier: "1000",
          },
        ],
      }),
    });

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://api.twitch.tv/helix/subscriptions/user?user_id=123&broadcaster_id=456"
      ),
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test_access_token",
          "Client-Id": "test_client_id",
        },
      })
    );
  });

  it("should return isSubscribed false when API returns 404", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("should return isSubscribed false when data is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
      }),
    });

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("should return error when access token is missing", async () => {
    const result = await checkSubStatus("", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return error when user ID is missing", async () => {
    const result = await checkSubStatus("test_access_token", "", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return error when broadcaster ID is missing", async () => {
    const result = await checkSubStatus("test_access_token", "123", "");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return error when client ID is not configured", async () => {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = "";

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Twitch client ID not configured");
    expect(mockFetch).not.toHaveBeenCalled();

    // Restore
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = clientId;
  });

  it("should return error when API returns non-404 error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    const result = await checkSubStatus("invalid_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Twitch API error: 401 Unauthorized");
  });

  it("should handle network errors gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Network error");
  });
});
