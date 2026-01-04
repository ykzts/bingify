import { describe, expect, it, vi } from "vitest";
import { getEnabledAuthProviders } from "../auth-providers";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({
              data: [
                { label: "Google", provider: "google" },
                { label: "GitHub", provider: "github" },
              ],
              error: null,
            })
          ),
        })),
      })),
    })),
  })),
}));

describe("getEnabledAuthProviders", () => {
  it("should fetch enabled auth providers", async () => {
    const providers = await getEnabledAuthProviders();

    expect(providers).toHaveLength(2);
    expect(providers[0]).toEqual({ label: "Google", provider: "google" });
    expect(providers[1]).toEqual({ label: "GitHub", provider: "github" });
  });

  it("should return empty array on database error", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockImplementationOnce(
      () =>
        ({
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({
                    data: null,
                    error: { message: "Database error" },
                  })
                ),
              })),
            })),
          })),
        }) as never
    );

    const providers = await getEnabledAuthProviders();
    expect(providers).toEqual([]);
  });

  it("should use default label if label is null", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockImplementationOnce(
      () =>
        ({
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({
                    data: [{ label: null, provider: "twitter" }],
                    error: null,
                  })
                ),
              })),
            })),
          })),
        }) as never
    );

    const providers = await getEnabledAuthProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0]).toEqual({ label: "twitter", provider: "twitter" });
  });
});
