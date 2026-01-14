import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSpaceAnnouncement,
  deleteSpaceAnnouncement,
  getSpaceAnnouncements,
  togglePinSpaceAnnouncement,
  updateSpaceAnnouncement,
} from "../space-announcements";

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

describe("getSpaceAnnouncements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await getSpaceAnnouncements(
      "550e8400-e29b-41d4-a716-446655440001"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("無効なスペースIDの場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const result = await getSpaceAnnouncements("invalid-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("無効なスペースIDです");
  });

  it("スペースが見つからない場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockSpaceQuery);

    const result = await getSpaceAnnouncements(
      "550e8400-e29b-41d4-a716-446655440001"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("スペースが見つかりません");
  });

  it("スペースお知らせをpinned DESC、created_at DESCでソートして取得できる", async () => {
    const mockUser = { id: "user-123" };
    const mockSpaceAnnouncements = [
      {
        announcement_id: "ann-1",
        announcements: {
          content: "ピン留めお知らせ",
          created_at: "2024-01-01T00:00:00Z",
          ends_at: null,
          id: "ann-1",
          priority: "info",
          published: true,
          starts_at: null,
          title: "ピン留めお知らせ",
        },
        created_at: "2024-01-01T00:00:00Z",
        id: "sa-1",
        pinned: true,
        space_id: "space-123",
      },
      {
        announcement_id: "ann-2",
        announcements: {
          content: "通常お知らせ2",
          created_at: "2024-01-03T00:00:00Z",
          ends_at: null,
          id: "ann-2",
          priority: "info",
          published: true,
          starts_at: null,
          title: "通常お知らせ2",
        },
        created_at: "2024-01-03T00:00:00Z",
        id: "sa-2",
        pinned: false,
        space_id: "space-123",
      },
      {
        announcement_id: "ann-3",
        announcements: {
          content: "通常お知らせ1",
          created_at: "2024-01-02T00:00:00Z",
          ends_at: null,
          id: "ann-3",
          priority: "info",
          published: true,
          starts_at: null,
          title: "通常お知らせ1",
        },
        created_at: "2024-01-02T00:00:00Z",
        id: "sa-3",
        pinned: false,
        space_id: "space-123",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "space-123", owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockParticipantQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "participant-123" },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockOrderChain2 = {
      order: vi.fn().mockResolvedValue({
        data: mockSpaceAnnouncements,
        error: null,
      }),
    };

    const mockOrderChain1 = {
      order: vi.fn().mockReturnValue(mockOrderChain2),
    };

    const mockEqChain = {
      eq: vi.fn().mockReturnValue(mockOrderChain1),
    };

    const mockAnnouncementQuery = {
      select: vi.fn().mockReturnValue(mockEqChain),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockParticipantQuery,
        mockAnnouncementQuery
      )
    );

    const result = await getSpaceAnnouncements(
      "550e8400-e29b-41d4-a716-446655440001"
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(3);
    // ピン留めが先頭、その後は作成日時降順
    expect(result.data?.[0]?.pinned).toBe(true);
    expect(result.data?.[1]?.pinned).toBe(false);
    expect(result.data?.[2]?.pinned).toBe(false);
  });

  it("公開されていないお知らせはフィルタされる", async () => {
    const mockUser = { id: "user-123" };
    const mockSpaceAnnouncements = [
      {
        announcement_id: "ann-1",
        announcements: {
          content: "公開お知らせ",
          created_at: "2024-01-01T00:00:00Z",
          ends_at: null,
          id: "ann-1",
          priority: "info",
          published: true,
          starts_at: null,
          title: "公開お知らせ",
        },
        created_at: "2024-01-01T00:00:00Z",
        id: "sa-1",
        pinned: false,
        space_id: "space-123",
      },
      {
        announcement_id: "ann-2",
        announcements: {
          content: "非公開お知らせ",
          created_at: "2024-01-02T00:00:00Z",
          ends_at: null,
          id: "ann-2",
          priority: "info",
          published: false,
          starts_at: null,
          title: "非公開お知らせ",
        },
        created_at: "2024-01-02T00:00:00Z",
        id: "sa-2",
        pinned: false,
        space_id: "space-123",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "space-123", owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockParticipantQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "participant-123" },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockOrderChain2 = {
      order: vi.fn().mockResolvedValue({
        data: mockSpaceAnnouncements,
        error: null,
      }),
    };

    const mockOrderChain1 = {
      order: vi.fn().mockReturnValue(mockOrderChain2),
    };

    const mockEqChain = {
      eq: vi.fn().mockReturnValue(mockOrderChain1),
    };

    const mockAnnouncementQuery = {
      select: vi.fn().mockReturnValue(mockEqChain),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockParticipantQuery,
        mockAnnouncementQuery
      )
    );

    const result = await getSpaceAnnouncements(
      "550e8400-e29b-41d4-a716-446655440001"
    );

    expect(result.success).toBe(true);
    expect(result.data?.length).toBe(1);
    expect(result.data?.[0]?.announcements.published).toBe(true);
  });

  it("非参加者のアクセスを拒否する", async () => {
    const mockUser = { id: "non-participant-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "space-123", owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockParticipantQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockParticipantQuery
      )
    );

    const result = await getSpaceAnnouncements(
      "550e8400-e29b-41d4-a716-446655440001"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "このスペースのお知らせを閲覧する権限がありません"
    );
  });

  it("スペースオーナーはお知らせを閲覧できる", async () => {
    const mockUser = { id: "owner-123" };
    const mockSpaceAnnouncements = [
      {
        announcement_id: "ann-1",
        announcements: {
          content: "テストお知らせ",
          created_at: "2024-01-01T00:00:00Z",
          ends_at: null,
          id: "ann-1",
          priority: "info",
          published: true,
          starts_at: null,
          title: "テスト",
        },
        created_at: "2024-01-01T00:00:00Z",
        id: "sa-1",
        pinned: false,
        space_id: "space-123",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "space-123", owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockParticipantQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockOrderChain2 = {
      order: vi.fn().mockResolvedValue({
        data: mockSpaceAnnouncements,
        error: null,
      }),
    };

    const mockOrderChain1 = {
      order: vi.fn().mockReturnValue(mockOrderChain2),
    };

    const mockEqChain = {
      eq: vi.fn().mockReturnValue(mockOrderChain1),
    };

    const mockAnnouncementQuery = {
      select: vi.fn().mockReturnValue(mockEqChain),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockParticipantQuery,
        mockAnnouncementQuery
      )
    );

    const result = await getSpaceAnnouncements(
      "550e8400-e29b-41d4-a716-446655440001"
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(1);
  });

  it("スペース管理者はお知らせを閲覧できる", async () => {
    const mockUser = { id: "admin-123" };
    const mockSpaceAnnouncements = [
      {
        announcement_id: "ann-1",
        announcements: {
          content: "テストお知らせ",
          created_at: "2024-01-01T00:00:00Z",
          ends_at: null,
          id: "ann-1",
          priority: "info",
          published: true,
          starts_at: null,
          title: "テスト",
        },
        created_at: "2024-01-01T00:00:00Z",
        id: "sa-1",
        pinned: false,
        space_id: "space-123",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "space-123", owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "role-123", role: "admin" },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockParticipantQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockOrderChain2 = {
      order: vi.fn().mockResolvedValue({
        data: mockSpaceAnnouncements,
        error: null,
      }),
    };

    const mockOrderChain1 = {
      order: vi.fn().mockReturnValue(mockOrderChain2),
    };

    const mockEqChain = {
      eq: vi.fn().mockReturnValue(mockOrderChain1),
    };

    const mockAnnouncementQuery = {
      select: vi.fn().mockReturnValue(mockEqChain),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockParticipantQuery,
        mockAnnouncementQuery
      )
    );

    const result = await getSpaceAnnouncements(
      "550e8400-e29b-41d4-a716-446655440001"
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(1);
  });

  it("参加者はお知らせを閲覧できる", async () => {
    const mockUser = { id: "participant-123" };
    const mockSpaceAnnouncements = [
      {
        announcement_id: "ann-1",
        announcements: {
          content: "テストお知らせ",
          created_at: "2024-01-01T00:00:00Z",
          ends_at: null,
          id: "ann-1",
          priority: "info",
          published: true,
          starts_at: null,
          title: "テスト",
        },
        created_at: "2024-01-01T00:00:00Z",
        id: "sa-1",
        pinned: false,
        space_id: "space-123",
      },
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "space-123", owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockParticipantQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "participant-123" },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockOrderChain2 = {
      order: vi.fn().mockResolvedValue({
        data: mockSpaceAnnouncements,
        error: null,
      }),
    };

    const mockOrderChain1 = {
      order: vi.fn().mockReturnValue(mockOrderChain2),
    };

    const mockEqChain = {
      eq: vi.fn().mockReturnValue(mockOrderChain1),
    };

    const mockAnnouncementQuery = {
      select: vi.fn().mockReturnValue(mockEqChain),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockParticipantQuery,
        mockAnnouncementQuery
      )
    );

    const result = await getSpaceAnnouncements(
      "550e8400-e29b-41d4-a716-446655440001"
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(1);
  });
});

describe("createSpaceAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await createSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      {
        content: "テストお知らせ",
        priority: "info",
        title: "テスト",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("権限がない場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "other-user" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockSpaceQuery, mockRoleQuery)
    );

    const result = await createSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      {
        content: "テストお知らせ",
        priority: "info",
        title: "テスト",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("スペースが見つからないか、権限がありません");
  });

  it("オーナーはお知らせを作成できる", async () => {
    const mockUser = { id: "owner-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockSelectChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "ann-123" },
        error: null,
      }),
    };

    const mockInsertQuery1 = {
      insert: vi.fn().mockReturnValue(mockSelectChain),
    };

    const mockInsertQuery2 = {
      insert: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockInsertQuery1,
        mockInsertQuery2
      )
    );

    const result = await createSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      {
        content: "テストお知らせ",
        pinned: true,
        priority: "info",
        title: "テスト",
      }
    );

    expect(result.success).toBe(true);
  });

  it("管理者はお知らせを作成できる", async () => {
    const mockUser = { id: "admin-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "role-123", role: "admin" },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockSelectChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "ann-123" },
        error: null,
      }),
    };

    const mockInsertQuery1 = {
      insert: vi.fn().mockReturnValue(mockSelectChain),
    };

    const mockInsertQuery2 = {
      insert: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockInsertQuery1,
        mockInsertQuery2
      )
    );

    const result = await createSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      {
        content: "テストお知らせ",
        priority: "info",
        title: "テスト",
      }
    );

    expect(result.success).toBe(true);
  });
});

describe("updateSpaceAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await updateSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      {
        title: "更新されたタイトル",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("権限がない場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "other-user" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockSpaceQuery, mockRoleQuery)
    );

    const result = await updateSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      {
        title: "更新されたタイトル",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("スペースが見つからないか、権限がありません");
  });

  it("オーナーはお知らせを更新できる", async () => {
    const mockUser = { id: "owner-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockSpaceAnnouncementQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { announcement_id: "ann-123" },
        error: null,
      }),
    };

    const mockSelectChain = {
      select: vi.fn().mockResolvedValue({
        data: [{ id: "ann-123", title: "更新されたタイトル" }],
        error: null,
      }),
    };

    const mockUpdateQuery = {
      eq: vi.fn().mockReturnValue(mockSelectChain),
      update: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockSpaceAnnouncementQuery,
        mockUpdateQuery
      )
    );

    const result = await updateSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      {
        title: "更新されたタイトル",
      }
    );

    expect(result.success).toBe(true);
  });

  it("ピン状態を更新できる", async () => {
    const mockUser = { id: "owner-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockSpaceAnnouncementQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { announcement_id: "ann-123" },
        error: null,
      }),
    };

    const mockEqChain2 = {
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    const mockUpdateQuery = {
      eq: vi.fn().mockReturnValue(mockEqChain2),
      update: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockSpaceAnnouncementQuery,
        mockUpdateQuery
      )
    );

    const result = await updateSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      {
        pinned: true,
      }
    );

    expect(result.success).toBe(true);
  });
});

describe("deleteSpaceAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await deleteSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("権限がない場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "other-user" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockSpaceQuery, mockRoleQuery)
    );

    const result = await deleteSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("スペースが見つからないか、権限がありません");
  });

  it("オーナーはお知らせを削除できる", async () => {
    const mockUser = { id: "owner-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockSpaceQuery, mockRoleQuery, mockDeleteQuery)
    );

    const result = await deleteSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    );

    expect(result.success).toBe(true);
  });
});

describe("togglePinSpaceAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はエラーを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });

    const result = await togglePinSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("認証が必要です");
  });

  it("権限がない場合はエラーを返す", async () => {
    const mockUser = { id: "user-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "other-user" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(mockSpaceQuery, mockRoleQuery)
    );

    const result = await togglePinSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("スペースが見つからないか、権限がありません");
  });

  it("ピン状態を切り替えることができる（false -> true）", async () => {
    const mockUser = { id: "owner-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockSpaceAnnouncementQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { pinned: false },
        error: null,
      }),
    };

    const mockEqChain2 = {
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    const mockUpdateQuery = {
      eq: vi.fn().mockReturnValue(mockEqChain2),
      update: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockSpaceAnnouncementQuery,
        mockUpdateQuery
      )
    );

    const result = await togglePinSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    );

    expect(result.success).toBe(true);
    expect(mockUpdateQuery.update).toHaveBeenCalledWith({ pinned: true });
  });

  it("ピン状態を切り替えることができる（true -> false）", async () => {
    const mockUser = { id: "owner-123" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockSpaceQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: "owner-123" },
        error: null,
      }),
    };

    const mockRoleQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    };

    const mockSpaceAnnouncementQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { pinned: true },
        error: null,
      }),
    };

    const mockEqChain2 = {
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    const mockUpdateQuery = {
      eq: vi.fn().mockReturnValue(mockEqChain2),
      update: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockImplementation(
      createSequentialFromMock(
        mockSpaceQuery,
        mockRoleQuery,
        mockSpaceAnnouncementQuery,
        mockUpdateQuery
      )
    );

    const result = await togglePinSpaceAnnouncement(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    );

    expect(result.success).toBe(true);
    expect(mockUpdateQuery.update).toHaveBeenCalledWith({ pinned: false });
  });
});
