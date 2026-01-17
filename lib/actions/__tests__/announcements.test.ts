import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAnnouncement,
  deleteAnnouncement,
  dismissAnnouncement,
  getActiveAnnouncements,
  getAllAnnouncements,
  getAnnouncementById,
  getDismissedAnnouncements,
  updateAnnouncement,
} from "../announcements";

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
      errorAdminRequired: "Admin権限が必要です",
      errorCreateFailed: "お知らせの作成に失敗しました",
      errorDeleteFailed: "お知らせの削除に失敗しました",
      errorDismissFailed: "お知らせの非表示に失敗しました",
      errorFetchAnnouncementsFailed: "お知らせの取得に失敗しました",
      errorGeneric: "エラーが発生しました",
      errorInvalidInput: "入力値が不正です",
      errorNotFound: "お知らせが見つかりません",
      errorUnauthorized: "認証が必要です",
      errorUpdateFailed: "お知らせの更新に失敗しました",
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

describe("getAnnouncementById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証ユーザーでもお知らせを取得できる", async () => {
    const mockAnnouncement = {
      content: "情報お知らせ",
      created_at: "2024-01-01T00:00:00Z",
      dismissible: true,
      ends_at: null,
      id: "ann-1",
      priority: "info",
      published: true,
      starts_at: null,
      title: "お知らせ1",
    };

    // 未認証状態をモック
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const mockSingleChain = {
      single: vi.fn().mockResolvedValue({
        data: mockAnnouncement,
        error: null,
      }),
    };

    const mockOrChain = {
      or: vi.fn().mockReturnValue(mockSingleChain),
    };

    const mockEqChain2 = {
      eq: vi.fn().mockReturnValue(mockOrChain),
    };

    const mockEqChain1 = {
      eq: vi.fn().mockReturnValue(mockEqChain2),
    };

    const mockQuery = {
      select: vi.fn().mockReturnValue(mockEqChain1),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getAnnouncementById("ann-1");

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe("ann-1");
  });

  it("お知らせが見つからない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const mockSingleChain = {
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      }),
    };

    const mockOrChain = {
      or: vi.fn().mockReturnValue(mockSingleChain),
    };

    const mockEqChain2 = {
      eq: vi.fn().mockReturnValue(mockOrChain),
    };

    const mockEqChain1 = {
      eq: vi.fn().mockReturnValue(mockEqChain2),
    };

    const mockQuery = {
      select: vi.fn().mockReturnValue(mockEqChain1),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getAnnouncementById("non-existent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("お知らせが見つかりません");
  });
});

describe("getActiveAnnouncements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証ユーザーでもお知らせを取得できる", async () => {
    const mockAnnouncements = [
      {
        content: "情報お知らせ",
        created_at: "2024-01-01T00:00:00Z",
        dismissible: true,
        ends_at: null,
        id: "ann-1",
        priority: "info",
        published: true,
        starts_at: null,
        title: "お知らせ1",
      },
    ];

    // 未認証状態をモック
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const mockOrChain = {
      or: vi.fn().mockResolvedValue({
        data: mockAnnouncements,
        error: null,
      }),
    };

    const mockQuery = {
      eq: vi.fn().mockReturnValue(mockOrChain),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getActiveAnnouncements();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(1);
  });

  it("公開中で日付範囲内のお知らせを優先度順で取得できる", async () => {
    const mockAnnouncements = [
      {
        content: "情報お知らせ",
        created_at: "2024-01-01T00:00:00Z",
        dismissible: true,
        ends_at: null,
        id: "ann-1",
        priority: "info",
        published: true,
        starts_at: null,
        title: "お知らせ1",
      },
      {
        content: "警告お知らせ",
        created_at: "2024-01-02T00:00:00Z",
        dismissible: true,
        ends_at: null,
        id: "ann-2",
        priority: "warning",
        published: true,
        starts_at: null,
        title: "お知らせ2",
      },
      {
        content: "エラーお知らせ",
        created_at: "2024-01-03T00:00:00Z",
        dismissible: true,
        ends_at: null,
        id: "ann-3",
        priority: "error",
        published: true,
        starts_at: null,
        title: "お知らせ3",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const mockOrChain = {
      or: vi.fn().mockResolvedValue({
        data: mockAnnouncements,
        error: null,
      }),
    };

    const mockQuery = {
      eq: vi.fn().mockReturnValue(mockOrChain),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getActiveAnnouncements();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(3);
    // 優先度順にソート: error > warning > info
    expect(result.data?.[0]?.priority).toBe("error");
    expect(result.data?.[1]?.priority).toBe("warning");
    expect(result.data?.[2]?.priority).toBe("info");
  });

  it("同じ優先度の場合は作成日時降順でソートされる", async () => {
    const mockAnnouncements = [
      {
        content: "お知らせ1",
        created_at: "2024-01-01T00:00:00Z",
        dismissible: true,
        ends_at: null,
        id: "ann-1",
        priority: "info",
        published: true,
        starts_at: null,
        title: "お知らせ1",
      },
      {
        content: "お知らせ2",
        created_at: "2024-01-03T00:00:00Z",
        dismissible: true,
        ends_at: null,
        id: "ann-2",
        priority: "info",
        published: true,
        starts_at: null,
        title: "お知らせ2",
      },
      {
        content: "お知らせ3",
        created_at: "2024-01-02T00:00:00Z",
        dismissible: true,
        ends_at: null,
        id: "ann-3",
        priority: "info",
        published: true,
        starts_at: null,
        title: "お知らせ3",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const mockOrChain = {
      or: vi.fn().mockResolvedValue({
        data: mockAnnouncements,
        error: null,
      }),
    };

    const mockQuery = {
      eq: vi.fn().mockReturnValue(mockOrChain),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getActiveAnnouncements();

    expect(result.success).toBe(true);
    expect(result.data?.[0]?.id).toBe("ann-2"); // 2024-01-03
    expect(result.data?.[1]?.id).toBe("ann-3"); // 2024-01-02
    expect(result.data?.[2]?.id).toBe("ann-1"); // 2024-01-01
  });
});

describe("getAllAnnouncements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await getAllAnnouncements();

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("非adminユーザーの場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "user" },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockProfileQuery);

    const result = await getAllAnnouncements();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Admin権限が必要です");
  });

  it("adminユーザーは全お知らせを取得できる", async () => {
    const mockUser = { id: "admin-123" };
    const mockAnnouncements = [
      {
        content: "お知らせ1",
        created_at: "2024-01-03T00:00:00Z",
        dismissible: true,
        ends_at: null,
        id: "ann-1",
        priority: "info",
        published: true,
        starts_at: null,
        title: "お知らせ1",
      },
      {
        content: "お知らせ2",
        created_at: "2024-01-02T00:00:00Z",
        dismissible: true,
        ends_at: null,
        id: "ann-2",
        priority: "info",
        published: false,
        starts_at: null,
        title: "お知らせ2",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    };

    const mockOrderChain = {
      order: vi.fn().mockResolvedValue({
        data: mockAnnouncements,
        error: null,
      }),
    };

    const mockAnnouncementQuery = {
      select: vi.fn().mockReturnValue(mockOrderChain),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockProfileQuery, mockAnnouncementQuery)
    );

    const result = await getAllAnnouncements();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockAnnouncements);
  });
});

describe("createAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await createAnnouncement({
      content: "テストお知らせ",
      dismissible: true,
      locale: "ja",
      priority: "info",
      published: true,
      title: "テスト",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("非adminユーザーの場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "user" },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockProfileQuery);

    const result = await createAnnouncement({
      content: "テストお知らせ",
      dismissible: true,
      locale: "ja",
      priority: "info",
      published: true,
      title: "テスト",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Admin権限が必要です");
  });

  it("adminユーザーはお知らせを作成できる", async () => {
    const mockUser = { id: "admin-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    };

    const mockInsertQuery = {
      insert: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockProfileQuery, mockInsertQuery)
    );

    const result = await createAnnouncement({
      content: "テストお知らせ",
      dismissible: true,
      locale: "ja",
      priority: "info",
      published: true,
      title: "テスト",
    });

    expect(result.success).toBe(true);
    expect(mockInsertQuery.insert).toHaveBeenCalled();
  });

  it("不正な入力値の場合はエラーを返す", async () => {
    const mockUser = { id: "admin-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockProfileQuery);

    const result = await createAnnouncement({
      content: "テストお知らせ",
      dismissible: true,
      locale: "ja",
      priority: "info",
      published: true,
      title: "", // 空のタイトル（不正）
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("updateAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await updateAnnouncement("ann-123", {
      title: "更新されたタイトル",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("非adminユーザーの場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "user" },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockProfileQuery);

    const result = await updateAnnouncement("ann-123", {
      title: "更新されたタイトル",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Admin権限が必要です");
  });

  it("adminユーザーはお知らせを更新できる", async () => {
    const mockUser = { id: "admin-123" };
    const mockUpdatedData = [
      {
        content: "更新されたコンテンツ",
        id: "ann-123",
        title: "更新されたタイトル",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    };

    const mockSelectChain = {
      select: vi.fn().mockResolvedValue({
        data: mockUpdatedData,
        error: null,
      }),
    };

    const mockUpdateQuery = {
      eq: vi.fn().mockReturnValue(mockSelectChain),
      update: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockProfileQuery, mockUpdateQuery)
    );

    const result = await updateAnnouncement("ann-123", {
      title: "更新されたタイトル",
    });

    expect(result.success).toBe(true);
    expect(mockUpdateQuery.update).toHaveBeenCalled();
  });

  it("存在しないIDの場合はエラーを返す", async () => {
    const mockUser = { id: "admin-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    };

    const mockSelectChain = {
      select: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const mockUpdateQuery = {
      eq: vi.fn().mockReturnValue(mockSelectChain),
      update: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockProfileQuery, mockUpdateQuery)
    );

    const result = await updateAnnouncement("non-existent-id", {
      title: "更新されたタイトル",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("お知らせが見つかりません");
  });
});

describe("deleteAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await deleteAnnouncement("ann-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("非adminユーザーの場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "user" },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockProfileQuery);

    const result = await deleteAnnouncement("ann-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Admin権限が必要です");
  });

  it("adminユーザーはお知らせを削除できる", async () => {
    const mockUser = { id: "admin-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    };

    const mockDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockProfileQuery, mockDeleteQuery)
    );

    const result = await deleteAnnouncement("ann-123");

    expect(result.success).toBe(true);
    expect(mockDeleteQuery.delete).toHaveBeenCalled();
  });
});

describe("dismissAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await dismissAnnouncement("ann-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("お知らせを正常に非表示にできる", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // First query: fetch announcement to get parent_id
    const mockAnnouncementQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "ann-123", parent_id: null },
        error: null,
      }),
    };

    // Second query: upsert dismissal
    const mockUpsertQuery = {
      upsert: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockAnnouncementQuery, mockUpsertQuery)
    );

    const result = await dismissAnnouncement("ann-123");

    expect(result.success).toBe(true);
    expect(mockUpsertQuery.upsert).toHaveBeenCalledWith(
      {
        announcement_id: "ann-123",
        user_id: "user-123",
      },
      {
        onConflict: "announcement_id,user_id",
      }
    );
  });
});

describe("getDismissedAnnouncements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await getDismissedAnnouncements();

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("非表示お知らせID配列を取得できる", async () => {
    const mockUser = { id: "user-123" };
    const mockDismissals = [
      { announcement_id: "ann-1" },
      { announcement_id: "ann-2" },
      { announcement_id: "ann-3" },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockQuery = {
      eq: vi.fn().mockResolvedValue({
        data: mockDismissals,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getDismissedAnnouncements();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(["ann-1", "ann-2", "ann-3"]);
  });

  it("非表示お知らせがない場合は空配列を返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockQuery = {
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await getDismissedAnnouncements();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});
