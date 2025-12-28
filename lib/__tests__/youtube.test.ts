import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSubscriptionStatus } from "../youtube";

global.fetch = vi.fn();

describe("checkSubscriptionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return isSubscribed true when subscription exists", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({
        items: [
          {
            snippet: {
              channelId: "UC_test_channel",
              title: "Test Channel",
            },
          },
        ],
      }),
      ok: true,
    });

    const result = await checkSubscriptionStatus(
      "test_access_token",
      "UC_test_channel"
    );

    expect(result.isSubscribed).toBe(true);
    expect(result.error).toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://www.googleapis.com/youtube/v3/subscriptions"
      ),
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test_access_token",
        },
      })
    );
  });

  it("should return isSubscribed false when subscription does not exist", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({
        items: [],
      }),
      ok: true,
    });

    const result = await checkSubscriptionStatus(
      "test_access_token",
      "UC_test_channel"
    );

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("should return error when access token is missing", async () => {
    const result = await checkSubscriptionStatus("", "UC_test_channel");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should return error when channel ID is missing", async () => {
    const result = await checkSubscriptionStatus("test_access_token", "");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should return error when API request fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({
        error: {
          code: 401,
          message: "Invalid credentials",
        },
      }),
      ok: false,
      status: 401,
    });

    const result = await checkSubscriptionStatus(
      "invalid_token",
      "UC_test_channel"
    );

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("YouTube API error: 401");
  });

  it("should handle network errors gracefully", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    const result = await checkSubscriptionStatus(
      "test_access_token",
      "UC_test_channel"
    );

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Network error");
  });

  it("should include correct query parameters in API request", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ items: [] }),
      ok: true,
    });

    await checkSubscriptionStatus("test_access_token", "UC_test_channel");

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs).toContain("part=snippet");
    expect(callArgs).toContain("mine=true");
    expect(callArgs).toContain("forChannelId=UC_test_channel");
  });
});
