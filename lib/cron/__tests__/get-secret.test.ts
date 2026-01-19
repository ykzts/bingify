import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCronSecretForAuth } from "../get-secret";

// Mock Supabase client
const mockRpc = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe("getCronSecretForAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return environment variable when CRON_SECRET is set", async () => {
    const envSecret = "test-env-secret";
    vi.stubEnv("CRON_SECRET", envSecret);

    const result = await getCronSecretForAuth();

    expect(result).toBe(envSecret);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("should return database secret when environment variable is not set", async () => {
    const dbSecret = "test-db-secret";
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");

    mockRpc.mockResolvedValue({
      data: {
        data: {
          secret: dbSecret,
          updated_at: "2024-01-01T00:00:00Z",
        },
        success: true,
      },
      error: null,
    });

    const result = await getCronSecretForAuth();

    expect(result).toBe(dbSecret);
    expect(mockRpc).toHaveBeenCalledWith("get_cron_secret");
  });

  it("should return null when neither environment variable nor database secret exists", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");

    mockRpc.mockResolvedValue({
      data: {
        error: "Secret not found",
        success: false,
      },
      error: null,
    });

    const result = await getCronSecretForAuth();

    expect(result).toBeNull();
  });

  it("should return null when Supabase configuration is missing", async () => {
    const result = await getCronSecretForAuth();

    expect(result).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
