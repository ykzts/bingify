import { beforeEach, describe, expect, test, vi } from "vitest";
import { getSpacePublicInfo } from "../actions";

// Mock the Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock privacy utilities
vi.mock("@/lib/privacy", () => ({
  maskEmailPatterns: vi.fn((patterns: string[]) =>
    patterns.map((p) =>
      p.startsWith("@") ? p : `${p[0]}***@${p.split("@")[1]}`
    )
  ),
}));

describe("getSpacePublicInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("無効なUUIDに対してnullを返す", async () => {
    const result = await getSpacePublicInfo("invalid-uuid");
    expect(result).toBeNull();
  });

  test("スペースが見つからない場合nullを返す", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );
    expect(result).toBeNull();
  });

  test("アクティブなスペースに対してマスクされたメールを含むスペース情報を返す", async () => {
    const mockSpace = {
      description: "Test space description",
      gatekeeper_rules: {
        email: {
          allowed: ["user@example.com", "@company.com"],
        },
        youtube: {
          channelId: "UCtest123",
          requirement: "subscriber",
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {
        hide_metadata_before_join: false,
      },
      share_key: "test-space",
      status: "active",
      title: "Test Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test Space");
    expect(result?.status).toBe("active");
    expect(result?.hideMetadata).toBe(false);
    expect(result?.gatekeeper_rules?.email?.allowed).toEqual([
      "u***@example.com",
      "@company.com",
    ]);
    expect(result?.gatekeeper_rules?.youtube?.requirement).toBe("subscriber");
  });

  test("ドラフトスペースに対してステータス付きのスペース情報を返す", async () => {
    const mockSpace = {
      description: "Draft space",
      gatekeeper_rules: null,
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "draft-space",
      status: "draft",
      title: "Draft Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe("draft");
    expect(result?.hideMetadata).toBe(false);
  });

  test("hide_metadata_before_join設定を尊重する", async () => {
    const mockSpace = {
      description: "Private space",
      gatekeeper_rules: null,
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {
        hide_metadata_before_join: true,
      },
      share_key: "private-space",
      status: "active",
      title: "Private Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.hideMetadata).toBe(true);
  });

  test("すべてのルールがnoneの場合nullのgatekeeper_rulesを返す", async () => {
    const mockSpace = {
      description: "Space with no restrictions",
      gatekeeper_rules: {
        youtube: {
          channelId: "UCtest",
          requirement: "none",
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "open-space",
      status: "active",
      title: "Open Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.gatekeeper_rules).toBeNull();
  });

  test("レガシーYouTubeフォーマットを処理する", async () => {
    const mockSpace = {
      description: "Legacy YouTube",
      gatekeeper_rules: {
        youtube: {
          channelId: "UCtest",
          required: true,
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "legacy-space",
      status: "active",
      title: "Legacy Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.gatekeeper_rules?.youtube?.requirement).toBe("subscriber");
  });

  test("レガシーTwitchフォーマットを処理する", async () => {
    const mockSpace = {
      description: "Legacy Twitch",
      gatekeeper_rules: {
        twitch: {
          broadcasterId: "12345",
          requireFollow: true,
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "legacy-twitch",
      status: "active",
      title: "Legacy Twitch",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.gatekeeper_rules?.twitch?.requirement).toBe("follower");
  });
});
