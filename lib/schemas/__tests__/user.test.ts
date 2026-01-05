import { describe, expect, it } from "vitest";
import { usernameSchema } from "../user";

describe("Username Schema", () => {
  it("有効なユーザー名を受け入れる", () => {
    const result = usernameSchema.safeParse({ username: "John Doe" });
    expect(result.success).toBe(true);
  });

  it("空のユーザー名を拒否する", () => {
    const result = usernameSchema.safeParse({ username: "" });
    expect(result.success).toBe(false);
  });

  it("50文字を超えるユーザー名を拒否する", () => {
    const longUsername = "a".repeat(51);
    const result = usernameSchema.safeParse({ username: longUsername });
    expect(result.success).toBe(false);
  });

  it("ちょうど50文字のユーザー名を受け入れる", () => {
    const maxUsername = "a".repeat(50);
    const result = usernameSchema.safeParse({ username: maxUsername });
    expect(result.success).toBe(true);
  });

  it("ユーザー名から空白をトリムする", () => {
    const result = usernameSchema.safeParse({ username: "  John Doe  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("John Doe");
    }
  });

  it("トリム後に空白のみのユーザー名を拒否する", () => {
    const result = usernameSchema.safeParse({ username: "   " });
    expect(result.success).toBe(false);
  });
});
