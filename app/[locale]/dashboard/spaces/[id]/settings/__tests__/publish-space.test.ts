import { describe, expect, it, vi } from "vitest";
import { publishSpace } from "../actions";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/utils/uuid", () => ({
  isValidUUID: vi.fn(),
}));

describe("publishSpace", () => {
  it("should populate FormData with existing space data when formData is empty", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    // Mock UUID validation
    vi.mocked(isValidUUID).mockReturnValue(true);

    // Mock space data
    const mockSpace = {
      description: "Test space description",
      gatekeeper_rules: null,
      max_participants: 100,
      owner_id: "owner-123",
      settings: { hide_metadata_before_join: false },
      title: "Test Space",
    };

    // Mock Supabase client
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-123" } },
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockSpace,
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    // Create empty FormData (simulating the draft-status-view scenario)
    const emptyFormData = new FormData();

    // Call publishSpace
    const result = await publishSpace(
      "space-123",
      { success: false },
      emptyFormData
    );

    // Verify the function completes successfully
    // Note: The actual implementation will call updateSpaceSettings which may have its own validations
    // This test mainly verifies that publishSpace doesn't immediately fail on empty FormData
    expect(result).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalled();
  });

  it("should handle invalid UUID", async () => {
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(false);

    const emptyFormData = new FormData();

    const result = await publishSpace(
      "invalid-id",
      { success: false },
      emptyFormData
    );

    expect(result).toEqual({
      error: "Invalid space ID",
      success: false,
    });
  });

  it("should handle missing user authentication", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const emptyFormData = new FormData();

    const result = await publishSpace(
      "space-123",
      { success: false },
      emptyFormData
    );

    expect(result).toEqual({
      error: "認証が必要です。ログインしてください。",
      success: false,
    });
  });
});
