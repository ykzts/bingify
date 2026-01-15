import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../notifications";

// Supabaseクライアントのモック
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

// next/cacheのモック
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// next-intl/serverのモック
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => {
    const translations: Record<string, string> = {
      errorCountUnread: "未読通知数の取得に失敗しました",
      errorDeleteNotificationFailed: "通知の削除に失敗しました",
      errorFetchNotifications: "通知の取得に失敗しました",
      errorGeneric: "エラーが発生しました",
      errorMarkAllReadFailed: "すべての通知の既読化に失敗しました",
      errorMarkReadFailed: "通知の既読化に失敗しました",
      errorNoAccessPermission: "この通知にアクセスする権限がありません",
      errorNoDeletePermission: "この通知を削除する権限がありません",
      errorNotificationNotFound: "通知が見つかりません",
      errorUnauthorized: "認証が必要です",
    };
    return (key: string) => translations[key] || key;
  }),
}));

// Supabaseクライアントのモック
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

/**
 * 複数のfrom呼び出しを順番に返すヘルパー関数
 */
function createSequentialFromMock(...mocks: unknown[]) {
  let callCount = 0;
  return () => {
    const result = mocks[callCount];
    callCount++;
    return result;
  };
}

describe("getNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await getNotifications();

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("通知一覧を正常に取得できる", async () => {
    const mockUser = { id: "user-123" };
    const mockNotifications = [
      {
        content: "テスト通知1",
        created_at: "2024-01-01T00:00:00Z",
        id: "notif-1",
        read: false,
        title: "通知1",
        type: "space_invitation",
        user_id: "user-123",
      },
      {
        content: "テスト通知2",
        created_at: "2024-01-02T00:00:00Z",
        id: "notif-2",
        read: true,
        title: "通知2",
        type: "bingo_achieved",
        user_id: "user-123",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        count: 2,
        data: mockNotifications,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getNotifications(1, 20, false);

    expect(result.success).toBe(true);
    expect(result.data?.notifications).toEqual(mockNotifications);
    expect(result.data?.hasMore).toBe(false);
    expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
  });

  it("未読のみフィルターが正常に動作する", async () => {
    const mockUser = { id: "user-123" };
    const mockUnreadNotifications = [
      {
        content: "未読通知",
        created_at: "2024-01-01T00:00:00Z",
        id: "notif-1",
        read: false,
        title: "未読",
        type: "space_invitation",
        user_id: "user-123",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // rangeの戻り値にもeqメソッドを持たせる
    const queryAfterRange = {
      eq: vi.fn().mockResolvedValue({
        count: 1,
        data: mockUnreadNotifications,
        error: null,
      }),
    };

    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnValue(queryAfterRange),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getNotifications(1, 20, true);

    expect(result.success).toBe(true);
    expect(queryAfterRange.eq).toHaveBeenCalledWith("read", false);
  });

  it("ページネーションが正常に動作する", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        count: 50,
        data: [],
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getNotifications(2, 20, false);

    expect(result.success).toBe(true);
    expect(result.data?.hasMore).toBe(true);
    expect(mockQuery.range).toHaveBeenCalledWith(20, 39);
  });
});

describe("getUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await getUnreadCount();

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("未読通知数を正常に取得できる", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockEqFinal = vi.fn().mockResolvedValue({
      count: 5,
      error: null,
    });

    const mockEqChain = {
      eq: mockEqFinal,
    };

    const mockQuery = {
      eq: vi.fn().mockReturnValue(mockEqChain),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getUnreadCount();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(5);
    expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(mockEqFinal).toHaveBeenCalledWith("read", false);
  });
});

describe("markNotificationRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await markNotificationRead("notif-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("通知が存在しない場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSelectQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      }),
    };

    mockSupabase.from.mockReturnValue(mockSelectQuery);

    const result = await markNotificationRead("notif-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("通知が見つかりません");
  });

  it("所有権がない場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSelectQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { user_id: "other-user" },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockSelectQuery);

    const result = await markNotificationRead("notif-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("この通知にアクセスする権限がありません");
  });

  it("通知を正常に既読にできる", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSelectQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { user_id: "user-123" },
        error: null,
      }),
    };

    const mockEqFinal = vi.fn().mockResolvedValue({
      error: null,
    });

    const mockEqChain = {
      eq: mockEqFinal,
    };

    const mockUpdateQuery = {
      eq: vi.fn().mockReturnValue(mockEqChain),
      update: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockSelectQuery, mockUpdateQuery)
    );

    const result = await markNotificationRead("notif-123");

    expect(result.success).toBe(true);
    expect(mockUpdateQuery.update).toHaveBeenCalledWith({ read: true });
  });
});

describe("markAllNotificationsRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await markAllNotificationsRead();

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("すべての通知を正常に既読にできる", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockEqFinal = vi.fn().mockResolvedValue({
      error: null,
    });

    const mockEqChain = {
      eq: mockEqFinal,
    };

    const mockUpdateQuery = {
      eq: vi.fn().mockReturnValue(mockEqChain),
      update: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockUpdateQuery);

    const result = await markAllNotificationsRead();

    expect(result.success).toBe(true);
    expect(mockUpdateQuery.update).toHaveBeenCalledWith({ read: true });
    expect(mockUpdateQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(mockEqFinal).toHaveBeenCalledWith("read", false);
  });
});

describe("deleteNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await deleteNotification("notif-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("通知が存在しない場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSelectQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      }),
    };

    mockSupabase.from.mockReturnValue(mockSelectQuery);

    const result = await deleteNotification("notif-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("通知が見つかりません");
  });

  it("所有権がない場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSelectQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { user_id: "other-user" },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockSelectQuery);

    const result = await deleteNotification("notif-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("この通知を削除する権限がありません");
  });

  it("通知を正常に削除できる", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSelectQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { user_id: "user-123" },
        error: null,
      }),
    };

    const mockEqFinal = vi.fn().mockResolvedValue({
      error: null,
    });

    const mockEqChain = {
      eq: mockEqFinal,
    };

    const mockDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue(mockEqChain),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockSelectQuery, mockDeleteQuery)
    );

    const result = await deleteNotification("notif-123");

    expect(result.success).toBe(true);
    expect(mockDeleteQuery.delete).toHaveBeenCalled();
  });
});
