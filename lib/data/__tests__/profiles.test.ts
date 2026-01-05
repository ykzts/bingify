import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminEmails } from "../profiles";

// Mock Supabase admin client
const mockAdminClient = {
  auth: {
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
      { email: "admin1@example.com", full_name: "Admin One" },
      { email: "admin2@example.com", full_name: "Admin Two" },
      { email: "admin3@example.com", full_name: null },
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

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([
      '"Admin One" <admin1@example.com>',
      '"Admin Two" <admin2@example.com>',
      "admin3@example.com",
    ]);
  });

  it("null のメールアドレスを除外する", async () => {
    const mockData = [
      { email: "admin1@example.com", full_name: "Admin One" },
      { email: null, full_name: "No Email Admin" },
      { email: "admin2@example.com", full_name: null },
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

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([
      '"Admin One" <admin1@example.com>',
      "admin2@example.com",
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
});
