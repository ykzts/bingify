import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkMembershipStatus,
  checkSubscriptionStatus,
  resolveYouTubeChannelId,
} from "../youtube";

// Create shared mock functions
const mockList = vi.fn();
const mockMembersList = vi.fn();
const mockChannelsList = vi.fn();

// Mock the YouTube API module
vi.mock("@googleapis/youtube", () => ({
  youtube_v3: {
    Youtube: class {
      channels = {
        list: mockChannelsList,
      };
      members = {
        list: mockMembersList,
      };
      subscriptions = {
        list: mockList,
      };
    },
  },
}));

describe("checkSubscriptionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("サブスクリプションが存在する場合にisSubscribed trueを返す", async () => {
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

  it("サブスクリプションが存在しない場合にisSubscribed falseを返す", async () => {
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

  it("アクセストークンが欠落している場合にエラーを返す", async () => {
    const result = await checkSubscriptionStatus("", "UC_test_channel");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
  });

  it("チャンネルIDが欠落している場合にエラーを返す", async () => {
    const result = await checkSubscriptionStatus("test_access_token", "");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
  });

  it("APIリクエストが失敗した場合にエラーを返す", async () => {
    mockList.mockRejectedValue(new Error("API Error: Invalid credentials"));

    const result = await checkSubscriptionStatus(
      "invalid_token",
      "UC_test_channel"
    );

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("ERROR_YOUTUBE_TOKEN_EXPIRED");
  });

  it("ネットワークエラーを適切に処理する", async () => {
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

  it("機能がサポートされていないことを示すエラーを返す", async () => {
    const result = await checkMembershipStatus(
      "test_access_token",
      "UC_test_channel"
    );

    expect(result.isMember).toBe(false);
    expect(result.error).toBe(
      "YouTube membership verification is not supported. The API requires channel owner credentials."
    );
    expect(mockMembersList).not.toHaveBeenCalled();
  });

  it("アクセストークンが欠落している場合にエラーを返す", async () => {
    const result = await checkMembershipStatus("", "UC_test_channel");

    expect(result.isMember).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockMembersList).not.toHaveBeenCalled();
  });

  it("チャンネルIDが欠落している場合にエラーを返す", async () => {
    const result = await checkMembershipStatus("test_access_token", "");

    expect(result.isMember).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockMembersList).not.toHaveBeenCalled();
  });
});

describe("resolveYouTubeChannelId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("チャンネルIDの直接入力", () => {
    it("有効なチャンネルIDをそのまま返す", async () => {
      const channelId = "UC1234567890123456789012";
      const result = await resolveYouTubeChannelId(channelId, "test_api_key");

      expect(result.channelId).toBe(channelId);
      expect(result.error).toBeUndefined();
      expect(mockChannelsList).not.toHaveBeenCalled();
    });

    it("UCで始まる24文字のチャンネルIDを受け入れる", async () => {
      const channelId = "UCabcdefghijklmnopqrstuv";
      const result = await resolveYouTubeChannelId(channelId, "test_api_key");

      expect(result.channelId).toBe(channelId);
      expect(result.error).toBeUndefined();
    });
  });

  describe("ハンドル形式の解決", () => {
    it("@から始まるハンドルからチャンネルIDを解決する", async () => {
      mockChannelsList.mockResolvedValue({
        data: {
          items: [{ id: "UC1234567890123456789012" }],
        },
      });

      const result = await resolveYouTubeChannelId(
        "@GoogleDevelopers",
        "test_api_key"
      );

      expect(result.channelId).toBe("UC1234567890123456789012");
      expect(result.error).toBeUndefined();
      expect(mockChannelsList).toHaveBeenCalledWith({
        forHandle: "@GoogleDevelopers",
        part: ["id"],
      });
    });

    it("ハンドルが見つからない場合にエラーを返す", async () => {
      mockChannelsList.mockResolvedValue({
        data: {
          items: [],
        },
      });

      const result = await resolveYouTubeChannelId(
        "@NonExistentUser",
        "test_api_key"
      );

      expect(result.channelId).toBeUndefined();
      expect(result.error).toContain("@NonExistentUser");
    });
  });

  describe("URL形式の解決", () => {
    it("ハンドルURL形式からチャンネルIDを解決する", async () => {
      mockChannelsList.mockResolvedValue({
        data: {
          items: [{ id: "UC1234567890123456789012" }],
        },
      });

      const result = await resolveYouTubeChannelId(
        "https://www.youtube.com/@GoogleDevelopers",
        "test_api_key"
      );

      expect(result.channelId).toBe("UC1234567890123456789012");
      expect(mockChannelsList).toHaveBeenCalledWith({
        forHandle: "@GoogleDevelopers",
        part: ["id"],
      });
    });

    it("チャンネルID形式のURLからチャンネルIDを抽出する", async () => {
      const result = await resolveYouTubeChannelId(
        "https://www.youtube.com/channel/UC1234567890123456789012",
        "test_api_key"
      );

      expect(result.channelId).toBe("UC1234567890123456789012");
      expect(result.error).toBeUndefined();
      expect(mockChannelsList).not.toHaveBeenCalled();
    });

    it("カスタムURL形式からチャンネルIDを解決する", async () => {
      mockChannelsList.mockResolvedValue({
        data: {
          items: [{ id: "UC1234567890123456789012" }],
        },
      });

      const result = await resolveYouTubeChannelId(
        "https://www.youtube.com/c/GoogleDevelopers",
        "test_api_key"
      );

      expect(result.channelId).toBe("UC1234567890123456789012");
      expect(mockChannelsList).toHaveBeenCalledWith({
        forHandle: "@GoogleDevelopers",
        part: ["id"],
      });
    });

    it("レガシーユーザー形式のURLからチャンネルIDを解決する", async () => {
      mockChannelsList.mockResolvedValue({
        data: {
          items: [{ id: "UC1234567890123456789012" }],
        },
      });

      const result = await resolveYouTubeChannelId(
        "https://www.youtube.com/user/GoogleDevelopers",
        "test_api_key"
      );

      expect(result.channelId).toBe("UC1234567890123456789012");
      expect(mockChannelsList).toHaveBeenCalledWith({
        forUsername: "GoogleDevelopers",
        part: ["id"],
      });
    });

    it("youtube.comドメインも受け入れる", async () => {
      mockChannelsList.mockResolvedValue({
        data: {
          items: [{ id: "UC1234567890123456789012" }],
        },
      });

      const result = await resolveYouTubeChannelId(
        "https://youtube.com/@TestChannel",
        "test_api_key"
      );

      expect(result.channelId).toBe("UC1234567890123456789012");
      expect(mockChannelsList).toHaveBeenCalledWith({
        forHandle: "@TestChannel",
        part: ["id"],
      });
    });
  });

  describe("エラーハンドリング", () => {
    it("空の入力値に対してエラーを返す", async () => {
      const result = await resolveYouTubeChannelId("", "test_api_key");

      expect(result.channelId).toBeUndefined();
      expect(result.error).toBe("Input is required");
      expect(mockChannelsList).not.toHaveBeenCalled();
    });

    it("空白のみの入力値に対してエラーを返す", async () => {
      const result = await resolveYouTubeChannelId("   ", "test_api_key");

      expect(result.channelId).toBeUndefined();
      expect(result.error).toBe("Input is required");
    });

    it("APIキーが空の場合にエラーを返す", async () => {
      const result = await resolveYouTubeChannelId("@TestChannel", "");

      expect(result.channelId).toBeUndefined();
      expect(result.error).toBe(
        "YouTube API key or OAuth token is not provided"
      );
      expect(mockChannelsList).not.toHaveBeenCalled();
    });

    it("無効な入力形式に対してエラーを返す", async () => {
      const result = await resolveYouTubeChannelId(
        "invalid_input",
        "test_api_key"
      );

      expect(result.channelId).toBeUndefined();
      expect(result.error).toContain("Invalid input format");
    });

    it("APIエラーを適切に処理する", async () => {
      mockChannelsList.mockRejectedValue(new Error("API quota exceeded"));

      const result = await resolveYouTubeChannelId(
        "@TestChannel",
        "test_api_key"
      );

      expect(result.channelId).toBeUndefined();
      expect(result.error).toContain("YouTube API error");
      expect(result.error).toContain("API quota exceeded");
    });

    it("不明なエラーを適切に処理する", async () => {
      mockChannelsList.mockRejectedValue("Unknown error");

      const result = await resolveYouTubeChannelId(
        "@TestChannel",
        "test_api_key"
      );

      expect(result.channelId).toBeUndefined();
      expect(result.error).toContain("unknown error");
    });
  });

  describe("入力値のトリミング", () => {
    it("前後の空白をトリミングする", async () => {
      const channelId = "UC1234567890123456789012";
      const result = await resolveYouTubeChannelId(
        `  ${channelId}  `,
        "test_api_key"
      );

      expect(result.channelId).toBe(channelId);
      expect(result.error).toBeUndefined();
    });
  });
});
