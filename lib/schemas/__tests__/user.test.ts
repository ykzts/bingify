import { describe, expect, it } from "vitest";
import { emailChangeSchema, usernameSchema } from "../user";

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

describe("Email Change Schema", () => {
  it("有効なメールアドレスを受け入れる", () => {
    const result = emailChangeSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("複雑なメールアドレスを受け入れる", () => {
    const result = emailChangeSchema.safeParse({
      email: "user.name+tag@subdomain.example.co.jp",
    });
    expect(result.success).toBe(true);
  });

  it("空のメールアドレスを拒否する", () => {
    const result = emailChangeSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("無効な形式のメールアドレスを拒否する", () => {
    const invalidEmails = [
      "invalid",
      "invalid@",
      "@example.com",
      "invalid@.com",
      "invalid..email@example.com",
    ];

    for (const email of invalidEmails) {
      const result = emailChangeSchema.safeParse({ email });
      expect(result.success).toBe(false);
    }
  });

  it("255文字を超えるメールアドレスを拒否する", () => {
    // Create an email that is exactly 256 characters (one over the limit)
    const localPart = "a".repeat(244); // 244 + 1(@) + 11(example.com) = 256
    const longEmail = `${localPart}@example.com`;
    expect(longEmail.length).toBe(256);

    const result = emailChangeSchema.safeParse({ email: longEmail });
    expect(result.success).toBe(false);
  });

  it("ちょうど255文字のメールアドレスを受け入れる", () => {
    // Create an email that is exactly 255 characters
    // Format: localpart@domain.com
    const localPart = "a".repeat(243); // 243 + 1(@) + 11(example.com) = 255
    const email = `${localPart}@example.com`;
    expect(email.length).toBe(255);

    const result = emailChangeSchema.safeParse({ email });
    expect(result.success).toBe(true);
  });

  it("メールアドレスから空白をトリムする", () => {
    const result = emailChangeSchema.safeParse({
      email: "  user@example.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("トリム後に空白のみのメールアドレスを拒否する", () => {
    const result = emailChangeSchema.safeParse({ email: "   " });
    expect(result.success).toBe(false);
  });

  it("大文字小文字を含むメールアドレスを受け入れる", () => {
    const result = emailChangeSchema.safeParse({
      email: "User.Name@Example.COM",
    });
    expect(result.success).toBe(true);
  });
});
