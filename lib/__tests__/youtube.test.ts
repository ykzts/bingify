import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkMembershipStatus, checkSubscriptionStatus } from "../youtube";

// Create shared mock functions
const mockList = vi.fn();
const mockMembersList = vi.fn();

// Mock the YouTube API module
vi.mock("@googleapis/youtube", () => ({
  youtube_v3: {
    Youtube: class {
      subscriptions = {
        list: mockList,
      };
      members = {
        list: mockMembersList,
      };
    },
  },
}));

describe("checkSubscriptionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return isSubscribed true when subscription exists", async () => {
    mockList.mockResolvedValue({
      data: {
        items: [
          {
            snippet: {
              channelId: "UC_test_channel",
              title: "Test Channel",
            },
          },
        ],
      },
    });

    const result = await checkSubscriptionStatus(
      "test_access_token",
      "UC_test_channel"
    );

    expect(result.isSubscribed).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockList).toHaveBeenCalledWith({
      forChannelId: "UC_test_channel",
      mine: true,
      part: ["snippet"],
    });
  });

  it("should return isSubscribed false when subscription does not exist", async () => {
    mockList.mockResolvedValue({
      data: {
        items: [],
      },
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
  });

  it("should return error when channel ID is missing", async () => {
    const result = await checkSubscriptionStatus("test_access_token", "");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
  });

  it("should return error when API request fails", async () => {
    mockList.mockRejectedValue(new Error("API Error: Invalid credentials"));

    const result = await checkSubscriptionStatus(
      "invalid_token",
      "UC_test_channel"
    );

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("API Error: Invalid credentials");
  });

  it("should handle network errors gracefully", async () => {
    mockList.mockRejectedValue(new Error("Network error"));

    const result = await checkSubscriptionStatus(
      "test_access_token",
      "UC_test_channel"
    );

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Network error");
  });
});

describe("checkMembershipStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error indicating feature is not supported", async () => {
    const result = await checkMembershipStatus(
      "test_access_token",
      "UC_test_channel"
    );

    expect(result.isMember).toBe(false);
    expect(result.error).toBe(
      "YouTube membership verification is not supported. The API requires channel owner credentials."
    );
    // Verify that the API was not called
    expect(mockMembersList).not.toHaveBeenCalled();
  });

  it("should return error when access token is missing", async () => {
    const result = await checkMembershipStatus("", "UC_test_channel");

    expect(result.isMember).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockMembersList).not.toHaveBeenCalled();
  });

  it("should return error when channel ID is missing", async () => {
    const result = await checkMembershipStatus("test_access_token", "");

    expect(result.isMember).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockMembersList).not.toHaveBeenCalled();
  });
});
