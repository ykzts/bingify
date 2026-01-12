import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationTypeValue } from "@/lib/types/notification";
import { createNotification } from "../create-notification";

// モックの型定義
interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
}

// createAdminClient のモック
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// モジュールのインポート
const { createAdminClient } = await import("@/lib/supabase/admin");

describe("createNotification", () => {
  let mockSupabaseClient: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Supabaseクライアントのモックを作成
    mockSupabaseClient = {
      from: vi.fn(),
    };

    vi.mocked(createAdminClient).mockReturnValue(
      mockSupabaseClient as unknown as SupabaseClient
    );
  });

  describe("正常系", () => {
    it("必須パラメータのみで通知を作成する", async () => {
      const userId = "user-123";
      const type: NotificationTypeValue = "space_invitation";
      const title = "テスト通知";
      const content = "これはテスト通知です";
      const notificationId = "notification-456";

      // モックチェーンのセットアップ
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: notificationId },
          error: null,
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createNotification(userId, type, title, content);

      // 結果を検証
      expect(result.success).toBe(true);
      expect(result.notificationId).toBe(notificationId);
      expect(result.error).toBeUndefined();

      // Supabaseクライアントの呼び出しを検証
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          content,
          metadata: {},
          title,
          type,
          user_id: userId,
        })
      );

      // expires_atが設定されていることを確認
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.expires_at).toBeDefined();
      expect(typeof insertCall.expires_at).toBe("string");
    });

    it("linkUrlを指定して通知を作成する", async () => {
      const userId = "user-123";
      const type: NotificationTypeValue = "bingo_achieved";
      const title = "ビンゴ達成";
      const content = "おめでとうございます！";
      const linkUrl = "https://example.com/bingo/result";
      const notificationId = "notification-789";

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: notificationId },
          error: null,
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createNotification(
        userId,
        type,
        title,
        content,
        linkUrl
      );

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe(notificationId);

      // metadataにaction_urlが含まれていることを確認
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata.action_url).toBe(linkUrl);
    });

    it("追加のmetadataを指定して通知を作成する", async () => {
      const userId = "user-123";
      const type: NotificationTypeValue = "space_updated";
      const title = "スペース更新";
      const content = "スペースが更新されました";
      const metadata = {
        sender_id: "sender-456",
        space_id: "space-789",
      };
      const notificationId = "notification-abc";

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: notificationId },
          error: null,
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createNotification(
        userId,
        type,
        title,
        content,
        undefined,
        metadata
      );

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe(notificationId);

      // metadataが正しく設定されていることを確認
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata).toEqual(metadata);
    });

    it("linkUrlとmetadataの両方を指定して通知を作成する", async () => {
      const userId = "user-123";
      const type: NotificationTypeValue = "announcement_published";
      const title = "新しいお知らせ";
      const content = "重要なお知らせがあります";
      const linkUrl = "https://example.com/announcements/123";
      const metadata = {
        announcement_id: "announcement-123",
        sender_id: "admin-456",
      };
      const notificationId = "notification-def";

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: notificationId },
          error: null,
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createNotification(
        userId,
        type,
        title,
        content,
        linkUrl,
        metadata
      );

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe(notificationId);

      // metadataにaction_urlと他のフィールドが含まれていることを確認
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata).toEqual({
        ...metadata,
        action_url: linkUrl,
      });
    });
  });

  describe("expires_at計算", () => {
    afterEach(() => {
      // システム時刻をリセット
      vi.useRealTimers();
    });

    it("現在時刻から30日後のexpires_atを設定する", async () => {
      const userId = "user-123";
      const type: NotificationTypeValue = "system_update";
      const title = "システム更新";
      const content = "システムが更新されました";
      const notificationId = "notification-ghi";

      // 現在時刻を固定
      const now = new Date("2026-01-12T12:00:00.000Z");
      vi.setSystemTime(now);

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: notificationId },
          error: null,
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      await createNotification(userId, type, title, content);

      // expires_atが30日後になっていることを確認
      const insertCall = mockInsert.mock.calls[0][0];
      const expiresAt = new Date(insertCall.expires_at);
      const expectedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      expect(expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe("エラーハンドリング", () => {
    it("Supabaseエラーを適切に処理する", async () => {
      const userId = "user-123";
      const type: NotificationTypeValue = "role_changed";
      const title = "権限変更";
      const content = "権限が変更されました";

      const mockError = {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createNotification(userId, type, title, content);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.notificationId).toBeUndefined();
    });

    it("予期しない例外を適切に処理する", async () => {
      const userId = "user-123";
      const type: NotificationTypeValue = "space_closed";
      const title = "スペースクローズ";
      const content = "スペースがクローズされました";

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error("Unexpected database error");
      });

      const result = await createNotification(userId, type, title, content);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected database error");
      expect(result.notificationId).toBeUndefined();
    });
  });

  describe("様々な通知タイプ", () => {
    it.each([
      ["space_invitation", "スペース招待", "招待されました"],
      ["space_updated", "スペース更新", "更新されました"],
      ["bingo_achieved", "ビンゴ達成", "達成しました"],
      ["announcement_published", "お知らせ公開", "公開されました"],
      ["system_update", "システム更新", "更新されました"],
      ["role_changed", "権限変更", "変更されました"],
      ["space_closed", "スペースクローズ", "クローズされました"],
    ] as const)("%s タイプの通知を作成する", async (type, title, content) => {
      const userId = "user-123";
      const notificationId = `notification-${type}`;

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: notificationId },
          error: null,
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createNotification(userId, type, title, content);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe(notificationId);

      // typeが正しく設定されていることを確認
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.type).toBe(type);
    });
  });
});
