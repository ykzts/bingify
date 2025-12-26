import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("should merge class names correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle conditional classes", () => {
    const isLarge = false;
    expect(cn("text-base", isLarge && "text-lg", "font-bold")).toBe(
      "text-base font-bold"
    );
  });

  it("should handle arrays", () => {
    expect(cn(["px-2", "py-1"])).toBe("px-2 py-1");
  });

  it("should deduplicate and merge tailwind classes", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("should return empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("should handle undefined and null values", () => {
    expect(cn("text-base", undefined, null, "font-bold")).toBe(
      "text-base font-bold"
    );
  });
});
