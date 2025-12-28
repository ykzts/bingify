import { describe, expect, it } from "vitest";
import { usernameSchema } from "../user";

describe("Username Schema", () => {
  it("should accept valid username", () => {
    const result = usernameSchema.safeParse({ username: "John Doe" });
    expect(result.success).toBe(true);
  });

  it("should reject empty username", () => {
    const result = usernameSchema.safeParse({ username: "" });
    expect(result.success).toBe(false);
  });

  it("should reject username longer than 50 characters", () => {
    const longUsername = "a".repeat(51);
    const result = usernameSchema.safeParse({ username: longUsername });
    expect(result.success).toBe(false);
  });

  it("should accept username with exactly 50 characters", () => {
    const maxUsername = "a".repeat(50);
    const result = usernameSchema.safeParse({ username: maxUsername });
    expect(result.success).toBe(true);
  });

  it("should trim whitespace from username", () => {
    const result = usernameSchema.safeParse({ username: "  John Doe  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("John Doe");
    }
  });

  it("should reject whitespace-only username after trim", () => {
    const result = usernameSchema.safeParse({ username: "   " });
    expect(result.success).toBe(false);
  });
});
