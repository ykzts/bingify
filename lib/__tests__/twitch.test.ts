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
  const originalClientId = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "test_client_id";
  });

  afterEach(() => {
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = originalClientId;
  });

  it("ユーザーが配信者をフォローしている場合にisFollowing trueを返す", async () => {
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

  it("ユーザーが配信者をフォローしていない場合にisFollowing falseを返す", async () => {
    mockGetChannelFollowers.mockResolvedValue({
      data: [],
    });

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("アクセストークンが欠落している場合にエラーを返す", async () => {
    const result = await checkFollowStatus("", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockGetChannelFollowers).not.toHaveBeenCalled();
  });

  it("ユーザーIDが欠落している場合にエラーを返す", async () => {
    const result = await checkFollowStatus("test_access_token", "", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockGetChannelFollowers).not.toHaveBeenCalled();
  });

  it("配信者IDが欠落している場合にエラーを返す", async () => {
    const result = await checkFollowStatus("test_access_token", "123", "");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockGetChannelFollowers).not.toHaveBeenCalled();
  });

  it("クライアントIDが設定されていない場合にエラーを返す", async () => {
    const clientId = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID;
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "";

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Twitch client ID not configured");
    expect(mockGetChannelFollowers).not.toHaveBeenCalled();

    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = clientId;
  });

  it("APIリクエストが失敗した場合にエラーを返す", async () => {
    mockGetChannelFollowers.mockRejectedValue(
      new Error("API Error: Invalid credentials")
    );

    const result = await checkFollowStatus("invalid_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("API Error: Invalid credentials");
  });

  it("ネットワークエラーを適切に処理する", async () => {
    mockGetChannelFollowers.mockRejectedValue(new Error("Network error"));

    const result = await checkFollowStatus("test_access_token", "123", "456");

    expect(result.isFollowing).toBe(false);
    expect(result.error).toBe("Network error");
  });
});

describe("checkSubStatus", () => {
  const originalClientId = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "test_client_id";
  });

  afterEach(() => {
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = originalClientId;
  });

  it("ユーザーがサブスクライブしている場合にisSubscribed trueを返す", async () => {
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

  it("checkUserSubscriptionがnullを返す場合にisSubscribed falseを返す", async () => {
    mockCheckUserSubscription.mockResolvedValue(null);

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("APIが404エラーをスローする場合にisSubscribed falseを返す", async () => {
    mockCheckUserSubscription.mockRejectedValue(new Error("404 Not Found"));

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("アクセストークンが欠落している場合にエラーを返す", async () => {
    const result = await checkSubStatus("", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockCheckUserSubscription).not.toHaveBeenCalled();
  });

  it("ユーザーIDが欠落している場合にエラーを返す", async () => {
    const result = await checkSubStatus("test_access_token", "", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockCheckUserSubscription).not.toHaveBeenCalled();
  });

  it("配信者IDが欠落している場合にエラーを返す", async () => {
    const result = await checkSubStatus("test_access_token", "123", "");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Missing required parameters");
    expect(mockCheckUserSubscription).not.toHaveBeenCalled();
  });

  it("クライアントIDが設定されていない場合にエラーを返す", async () => {
    const clientId = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID;
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "";

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Twitch client ID not configured");
    expect(mockCheckUserSubscription).not.toHaveBeenCalled();

    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = clientId;
  });

  it("APIが404以外のエラーを返す場合にエラーを返す", async () => {
    mockCheckUserSubscription.mockRejectedValue(new Error("401 Unauthorized"));

    const result = await checkSubStatus("invalid_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("401 Unauthorized");
  });

  it("ネットワークエラーを適切に処理する", async () => {
    mockCheckUserSubscription.mockRejectedValue(new Error("Network error"));

    const result = await checkSubStatus("test_access_token", "123", "456");

    expect(result.isSubscribed).toBe(false);
    expect(result.error).toBe("Network error");
  });
});

describe("parseTwitchInput", () => {
  it("数値IDをパースする", () => {
    const result = parseTwitchInput("123456789");
    expect(result).toEqual({ type: "id", value: "123456789" });
  });

  it("ユーザー名をパースする", () => {
    const result = parseTwitchInput("ninja");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("アンダースコア付きのユーザー名をパースする", () => {
    const result = parseTwitchInput("test_user_123");
    expect(result).toEqual({ type: "username", value: "test_user_123" });
  });

  it("ユーザー名をパースして小文字に変換する", () => {
    const result = parseTwitchInput("NinJa");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("httpsを含む完全なTwitch URLをパースする", () => {
    const result = parseTwitchInput("https://www.twitch.tv/ninja");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("wwwなしの完全なTwitch URLをパースする", () => {
    const result = parseTwitchInput("https://twitch.tv/shroud");
    expect(result).toEqual({ type: "username", value: "shroud" });
  });

  it("プロトコルなしのTwitch URLをパースする", () => {
    const result = parseTwitchInput("twitch.tv/ninja");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("大文字を含むURLを処理しユーザー名を小文字に変換する", () => {
    const result = parseTwitchInput("https://www.twitch.tv/NiNjA");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("空の入力に対してinvalidを返す", () => {
    const result = parseTwitchInput("");
    expect(result).toEqual({ type: "invalid", value: "" });
  });

  it("空白のみに対してinvalidを返す", () => {
    const result = parseTwitchInput("   ");
    expect(result).toEqual({ type: "invalid", value: "" });
  });

  it("短すぎるユーザー名（4文字未満）に対してinvalidを返す", () => {
    const result = parseTwitchInput("abc");
    expect(result).toEqual({ type: "invalid", value: "abc" });
  });

  it("長すぎるユーザー名（25文字超）に対してinvalidを返す", () => {
    const result = parseTwitchInput("a".repeat(26));
    expect(result).toEqual({ type: "invalid", value: "a".repeat(26) });
  });

  it("特殊文字を含むユーザー名に対してinvalidを返す", () => {
    const result = parseTwitchInput("test-user");
    expect(result).toEqual({ type: "invalid", value: "test-user" });
  });

  it("不正なURLに対してinvalidを返す", () => {
    const result = parseTwitchInput("https://youtube.com/ninja");
    expect(result).toEqual({
      type: "invalid",
      value: "https://youtube.com/ninja",
    });
  });

  it("パース前に空白をトリムする", () => {
    const result = parseTwitchInput("  ninja  ");
    expect(result).toEqual({ type: "username", value: "ninja" });
  });

  it("4文字のユーザー名（最小長）をパースする", () => {
    const result = parseTwitchInput("abcd");
    expect(result).toEqual({ type: "username", value: "abcd" });
  });

  it("25文字のユーザー名（最大長）をパースする", () => {
    const username = "a".repeat(25);
    const result = parseTwitchInput(username);
    expect(result).toEqual({ type: "username", value: username });
  });
});

describe("getBroadcasterIdFromUsername", () => {
  const originalClientId = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "test_client_id";
  });

  afterEach(() => {
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = originalClientId;
  });

  it("有効なユーザー名に対して配信者IDを返す", async () => {
    mockGetUsersByNames.mockResolvedValue([
      {
        displayName: "Ninja",
        id: "19571641",
        login: "ninja",
      },
    ]);

    const result = await getBroadcasterIdFromUsername(
      "ninja",
      "test_app_token"
    );

    expect(result.broadcasterId).toBe("19571641");
    expect(result.error).toBeUndefined();
    expect(mockGetUsersByNames).toHaveBeenCalledWith(["ninja"]);
  });

  it("ユーザー名が空の場合にエラーを返す", async () => {
    const result = await getBroadcasterIdFromUsername("", "test_app_token");

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("Username is required");
    expect(mockGetUsersByNames).not.toHaveBeenCalled();
  });

  it("アプリアクセストークンが欠落している場合にエラーを返す", async () => {
    const result = await getBroadcasterIdFromUsername("ninja", "");

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("App access token is required");
    expect(mockGetUsersByNames).not.toHaveBeenCalled();
  });

  it("クライアントIDが設定されていない場合にエラーを返す", async () => {
    const clientId = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID;
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "";

    const result = await getBroadcasterIdFromUsername(
      "ninja",
      "test_app_token"
    );

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("Twitch client ID not configured");
    expect(mockGetUsersByNames).not.toHaveBeenCalled();

    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = clientId;
  });

  it("ユーザーが見つからない場合にエラーを返す", async () => {
    mockGetUsersByNames.mockResolvedValue([]);

    const result = await getBroadcasterIdFromUsername(
      "nonexistentuser",
      "test_app_token"
    );

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("User not found");
  });

  it("APIリクエストが失敗した場合にエラーを返す", async () => {
    mockGetUsersByNames.mockRejectedValue(
      new Error("API Error: Rate limit exceeded")
    );

    const result = await getBroadcasterIdFromUsername("ninja", "invalid_token");

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("API Error: Rate limit exceeded");
  });

  it("ネットワークエラーを適切に処理する", async () => {
    mockGetUsersByNames.mockRejectedValue(new Error("Network error"));

    const result = await getBroadcasterIdFromUsername(
      "ninja",
      "test_app_token"
    );

    expect(result.broadcasterId).toBeUndefined();
    expect(result.error).toBe("Network error");
  });
});
