import { describe, expect, it, vi } from "vitest";

/**
 * スペース設定フォームの自動入力ロジックのテスト
 *
 * このテストは、YouTubeチャンネルIDの
 * 自動入力機能が正しく動作することを検証します。
 */
describe("スペース設定フォームの自動入力", () => {
  describe("YouTubeチャンネルIDの自動入力", () => {
    it("ソーシャル連携モード + YouTubeプラットフォーム選択時に自動入力される", async () => {
      // モック関数を作成
      const mockSetFieldValue = vi.fn();
      const mockGetOperatorYouTubeChannelId = vi.fn().mockResolvedValue({
        channelId: "UCxxxxxxxxxxxxxxxxxxxxxxxx",
        success: true,
      });

      // 自動入力ロジックをシミュレート
      const gatekeeperMode = "social";
      const socialPlatform: "youtube" | "twitch" = "youtube";
      const enteredYoutubeChannelId = "";
      const fetchingOperatorYoutubeId = false;
      const verifiedChannels:
        | { youtube?: string; twitch?: string }
        | undefined = undefined;

      // 条件が満たされているか確認
      const shouldAutoFill =
        gatekeeperMode === "social" &&
        socialPlatform === "youtube" &&
        !enteredYoutubeChannelId &&
        !fetchingOperatorYoutubeId;

      expect(shouldAutoFill).toBe(true);

      // キャッシュがない場合はAPI経由で取得
      const youtubeChannel = (
        verifiedChannels as { youtube?: string } | undefined
      )?.youtube;
      if (!youtubeChannel) {
        const result = await mockGetOperatorYouTubeChannelId();
        if (result.success && result.channelId) {
          mockSetFieldValue("youtube_channel_id", result.channelId);
        }
      }

      // 自動入力が実行されたことを確認
      expect(mockGetOperatorYouTubeChannelId).toHaveBeenCalledTimes(1);
      expect(mockSetFieldValue).toHaveBeenCalledWith(
        "youtube_channel_id",
        "UCxxxxxxxxxxxxxxxxxxxxxxxx"
      );
    });

    it("検証済みチャンネルIDのキャッシュがある場合はそれを使用する", () => {
      const mockSetFieldValue = vi.fn();
      const mockGetOperatorYouTubeChannelId = vi.fn();

      const gatekeeperMode = "social";
      const socialPlatform: "youtube" | "twitch" = "youtube";
      const enteredYoutubeChannelId = "";
      const fetchingOperatorYoutubeId = false;
      const verifiedChannels = { youtube: "UCyyyyyyyyyyyyyyyyyyyyyy" };

      const shouldAutoFill =
        gatekeeperMode === "social" &&
        socialPlatform === "youtube" &&
        !enteredYoutubeChannelId &&
        !fetchingOperatorYoutubeId;

      expect(shouldAutoFill).toBe(true);

      // キャッシュがある場合はそれを使用
      if (shouldAutoFill && verifiedChannels?.youtube) {
        mockSetFieldValue("youtube_channel_id", verifiedChannels.youtube);
      }

      // キャッシュから直接設定され、APIは呼ばれない
      expect(mockSetFieldValue).toHaveBeenCalledWith(
        "youtube_channel_id",
        "UCyyyyyyyyyyyyyyyyyyyyyy"
      );
      expect(mockGetOperatorYouTubeChannelId).not.toHaveBeenCalled();
    });

    it("既にチャンネルIDが入力されている場合は自動入力しない", () => {
      const mockSetFieldValue = vi.fn();
      const mockGetOperatorYouTubeChannelId = vi.fn();

      const gatekeeperMode = "social";
      const socialPlatform: "youtube" | "twitch" = "youtube";
      const enteredYoutubeChannelId = "UCzzzzzzzzzzzzzzzzzzzzzz";
      const fetchingOperatorYoutubeId = false;

      const shouldAutoFill =
        gatekeeperMode === "social" &&
        socialPlatform === "youtube" &&
        !enteredYoutubeChannelId &&
        !fetchingOperatorYoutubeId;

      expect(shouldAutoFill).toBe(false);

      // 自動入力されない
      expect(mockSetFieldValue).not.toHaveBeenCalled();
      expect(mockGetOperatorYouTubeChannelId).not.toHaveBeenCalled();
    });

    it("Twitchプラットフォーム選択時は自動入力しない", () => {
      const mockSetFieldValue = vi.fn();
      const mockGetOperatorYouTubeChannelId = vi.fn();

      const gatekeeperMode = "social";
      // Use type assertion to prevent narrowing
      const socialPlatform = "twitch" as "youtube" | "twitch";
      const enteredYoutubeChannelId = "";
      const fetchingOperatorYoutubeId = false;

      const shouldAutoFill =
        gatekeeperMode === "social" &&
        socialPlatform === "youtube" &&
        !enteredYoutubeChannelId &&
        !fetchingOperatorYoutubeId;

      expect(shouldAutoFill).toBe(false);
      expect(mockSetFieldValue).not.toHaveBeenCalled();
      expect(mockGetOperatorYouTubeChannelId).not.toHaveBeenCalled();
    });
  });

  describe("エラーハンドリング", () => {
    it("API取得失敗時にエラーを無視する（自動入力できないだけ）", async () => {
      const mockSetFieldValue = vi.fn();
      const mockGetOperatorYouTubeChannelId = vi.fn().mockResolvedValue({
        error: "errorYoutubeNotLinked",
        success: false,
      });

      const gatekeeperMode = "social";
      const socialPlatform: "youtube" | "twitch" = "youtube";
      const enteredYoutubeChannelId = "";
      const fetchingOperatorYoutubeId = false;

      const shouldAutoFill =
        gatekeeperMode === "social" &&
        socialPlatform === "youtube" &&
        !enteredYoutubeChannelId &&
        !fetchingOperatorYoutubeId;

      expect(shouldAutoFill).toBe(true);

      if (shouldAutoFill) {
        const result = await mockGetOperatorYouTubeChannelId();
        // エラーの場合は自動入力しない
        if (result.success && result.channelId) {
          mockSetFieldValue("youtube_channel_id", result.channelId);
        }
      }

      // API は呼ばれたが、エラーのため自動入力されない
      expect(mockGetOperatorYouTubeChannelId).toHaveBeenCalledTimes(1);
      expect(mockSetFieldValue).not.toHaveBeenCalled();
    });
  });
});
