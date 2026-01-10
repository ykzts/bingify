import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tables } from "@/types/supabase";
import { getSpaceBingoCards, getSpaceParticipants } from "../participants";

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("getSpaceParticipants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はnullを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getSpaceParticipants("test-space-id");

    expect(result).toBeNull();
  });

  it("参加者でない場合はnullを返す", async () => {
    // ユーザーは認証済み
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
    });

    // スペースのオーナーではない
    let _callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      _callCount++;
      if (table === "spaces") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { owner_id: "other-user-id" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "space_roles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Not found" },
                  }),
                }),
              }),
            }),
          }),
        };
      }
      // participants - 参加者でない
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not found" },
              }),
            }),
          }),
        }),
      };
    });

    const result = await getSpaceParticipants("test-space-id");

    expect(result).toBeNull();
  });

  it("一般参加者の場合は自分の情報のみ返す", async () => {
    // ユーザーは認証済みで参加者（オーナー/管理者ではない）
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
    });

    const mockParticipant = {
      bingo_status: "reach",
      id: "participant-1",
      joined_at: "2024-01-01T00:00:00Z",
      user_id: "user-id",
    };

    const mockProfile: Tables<"profiles"> = {
      avatar_source: "upload",
      avatar_url: "https://example.com/avatar1.jpg",
      created_at: "2024-01-01T00:00:00Z",
      email: "user@example.com",
      full_name: "User One",
      id: "user-id",
      role: "user",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "spaces") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { owner_id: "other-user-id" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "space_roles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Not found" },
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "participants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockParticipant,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    const result = await getSpaceParticipants("test-space-id");

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({
      avatar_url: "https://example.com/avatar1.jpg",
      bingo_status: "reach",
      full_name: "User One",
      user_id: "user-id",
    });
  });
});

describe("getSpaceBingoCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証されていない場合はnullを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getSpaceBingoCards("test-space-id");

    expect(result).toBeNull();
  });

  it("一般参加者の場合は自分のカードのみ返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
    });

    const mockCard = {
      created_at: "2024-01-01T00:00:00Z",
      id: "card-1",
      numbers: [
        [1, 16, 31, 46, 61],
        [2, 17, 32, 47, 62],
        [3, 18, 0, 48, 63],
        [4, 19, 33, 49, 64],
        [5, 20, 34, 50, 65],
      ],
      space_id: "test-space-id",
      user_id: "user-id",
    };

    const mockParticipant = { bingo_status: "reach", user_id: "user-id" };

    const mockProfile: Tables<"profiles"> = {
      avatar_source: "google",
      avatar_url: "https://example.com/avatar1.jpg",
      created_at: "2024-01-01T00:00:00Z",
      email: "user@example.com",
      full_name: "User One",
      id: "user-id",
      role: "user",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "spaces") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { owner_id: "other-user-id" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "space_roles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Not found" },
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "participants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockParticipant,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "bingo_cards") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCard,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    const result = await getSpaceBingoCards("test-space-id");

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({
      avatar_url: "https://example.com/avatar1.jpg",
      bingo_status: "reach",
      full_name: "User One",
      user_id: "user-id",
    });
    expect(result?.[0].numbers).toEqual(mockCard.numbers);
  });
});
