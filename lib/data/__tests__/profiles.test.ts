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
      { address: "admin1@example.com", name: "Admin One" },
      { address: "admin2@example.com", name: "Admin Two" },
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
      { address: "admin1@example.com", name: "Admin One" },
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

  it("特殊文字を含む表示名を持つ管理者のメールアドレスを返す", async () => {
    const mockData = [
      { email: "admin1@example.com", full_name: 'John "Johnny" Doe' },
      { email: "admin2@example.com", full_name: "Path\\User" },
      { email: "admin3@example.com", full_name: 'Quote" and Slash\\' },
      { email: "admin4@example.com", full_name: "Normal Name" },
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
      { address: "admin1@example.com", name: 'John "Johnny" Doe' },
      { address: "admin2@example.com", name: "Path\\User" },
      { address: "admin3@example.com", name: 'Quote" and Slash\\' },
      { address: "admin4@example.com", name: "Normal Name" },
    ]);
  });

  it("制御文字を含む表示名を持つ管理者のメールアドレスを返す", async () => {
    const mockData = [
      { email: "admin1@example.com", full_name: "Name\x00With\x1FControl" },
      { email: "admin2@example.com", full_name: "Tab\tName" },
      { email: "admin3@example.com", full_name: "Newline\nName" },
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
      { address: "admin1@example.com", name: "Name\x00With\x1FControl" },
      { address: "admin2@example.com", name: "Tab\tName" },
      { address: "admin3@example.com", name: "Newline\nName" },
    ]);
  });
});
