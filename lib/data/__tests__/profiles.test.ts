import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminEmails } from "../profiles";

// Mock Supabase admin client
const mockAdminClient = {
  auth: {
    admin: {
      getUserById: vi.fn(),
    },
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

describe("getAdminEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("管理者のメールアドレス配列を返す", async () => {
    const mockData = [
      { id: "user-1", email: "admin1@example.com", full_name: "Admin One" },
      { id: "user-2", email: "admin2@example.com", full_name: "Admin Two" },
      { id: "user-3", email: "admin3@example.com", full_name: null },
    ];

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });

    // Mock getUserById to return user metadata with language
    mockAdminClient.auth.admin.getUserById
      .mockResolvedValueOnce({
        data: { user: { user_metadata: { language: "ja" } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { user_metadata: { language: "en" } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { user_metadata: {} } }, // No language set, should default to 'ja'
        error: null,
      });

    const result = await getAdminEmails();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([
      {
        address: { address: "admin1@example.com", name: "Admin One" },
        locale: "ja",
      },
      {
        address: { address: "admin2@example.com", name: "Admin Two" },
        locale: "en",
      },
      { address: "admin3@example.com", locale: "ja" },
    ]);
  });

  it("null のメールアドレスを除外する", async () => {
    const mockData = [
      { id: "user-1", email: "admin1@example.com", full_name: "Admin One" },
      { id: "user-2", email: null, full_name: "No Email Admin" },
      { id: "user-3", email: "admin2@example.com", full_name: null },
    ];

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });

    // Mock getUserById for users with valid emails only
    mockAdminClient.auth.admin.getUserById
      .mockResolvedValueOnce({
        data: { user: { user_metadata: { language: "ja" } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { user_metadata: { language: "en" } } },
        error: null,
      });

    const result = await getAdminEmails();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([
      {
        address: { address: "admin1@example.com", name: "Admin One" },
        locale: "ja",
      },
      { address: "admin2@example.com", locale: "en" },
    ]);
  });

  it("管理者が存在しない場合にエラーを返す", async () => {
    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await getAdminEmails();

    expect(result.error).toBe("errorNoAdmins");
    expect(result.data).toBeUndefined();
  });

  it("有効なメールアドレスを持つ管理者が存在しない場合にエラーを返す", async () => {
    const mockData = [
      { email: null, full_name: "Admin One" },
      { email: null, full_name: "Admin Two" },
    ];

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });

    const result = await getAdminEmails();

    expect(result.error).toBe("errorNoAdmins");
    expect(result.data).toBeUndefined();
  });

  it("データベースクエリが失敗した場合にエラーを返す", async () => {
    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
    });

    const result = await getAdminEmails();

    expect(result.error).toBe("errorFetchFailed");
    expect(result.data).toBeUndefined();
  });

  it("予期しないエラーを適切に処理する", async () => {
    mockAdminClient.from.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const result = await getAdminEmails();

    expect(result.error).toBe("errorGeneric");
    expect(result.data).toBeUndefined();
  });

  it("特殊文字を含む表示名を持つ管理者のメールアドレスを返す", async () => {
    const mockData = [
      {
        id: "user-1",
        email: "admin1@example.com",
        full_name: 'John "Johnny" Doe',
      },
      { id: "user-2", email: "admin2@example.com", full_name: "Path\\User" },
      {
        id: "user-3",
        email: "admin3@example.com",
        full_name: 'Quote" and Slash\\',
      },
      { id: "user-4", email: "admin4@example.com", full_name: "Normal Name" },
    ];

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });

    // Mock getUserById for all users
    mockAdminClient.auth.admin.getUserById
      .mockResolvedValueOnce({
        data: { user: { user_metadata: { language: "en" } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { user_metadata: { language: "ja" } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { user_metadata: { language: "en" } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { user_metadata: {} } },
        error: null,
      });

    const result = await getAdminEmails();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([
      {
        address: { address: "admin1@example.com", name: 'John "Johnny" Doe' },
        locale: "en",
      },
      {
        address: { address: "admin2@example.com", name: "Path\\User" },
        locale: "ja",
      },
      {
        address: {
          address: "admin3@example.com",
          name: 'Quote" and Slash\\',
        },
        locale: "en",
      },
      {
        address: { address: "admin4@example.com", name: "Normal Name" },
        locale: "ja",
      },
    ]);
  });

  it("制御文字を含む表示名を持つ管理者のメールアドレスを返す", async () => {
    const mockData = [
      {
        id: "user-1",
        email: "admin1@example.com",
        full_name: "Name\x00With\x1FControl",
      },
      { id: "user-2", email: "admin2@example.com", full_name: "Tab\tName" },
      { id: "user-3", email: "admin3@example.com", full_name: "Newline\nName" },
    ];

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });

    // Mock getUserById for all users
    mockAdminClient.auth.admin.getUserById
      .mockResolvedValueOnce({
        data: { user: { user_metadata: { language: "en" } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { user_metadata: { language: "ja" } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { user_metadata: {} } },
        error: null,
      });

    const result = await getAdminEmails();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([
      {
        address: {
          address: "admin1@example.com",
          name: "Name\x00With\x1FControl",
        },
        locale: "en",
      },
      {
        address: { address: "admin2@example.com", name: "Tab\tName" },
        locale: "ja",
      },
      {
        address: { address: "admin3@example.com", name: "Newline\nName" },
        locale: "ja",
      },
    ]);
  });
});
