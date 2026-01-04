import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Next.js cache functions
vi.mock("next/cache", async () => {
  const actual =
    await vi.importActual<typeof import("next/cache")>("next/cache");
  return {
    ...actual,
    cacheTag: vi.fn(),
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
  };
});
