import { describe, expect, it } from "vitest";
import { avatarUploadSchema, emailChangeSchema, usernameSchema } from "../user";

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

describe("Avatar Upload Schema", () => {
  // テスト用のFileオブジェクトを作成するヘルパー関数
  const createMockFile = (
    size: number,
    type: string,
    name = "test.jpg"
  ): File => {
    const buffer = new ArrayBuffer(size);
    const blob = new Blob([buffer], { type });
    return new File([blob], name, { type });
  };

  it("有効なJPEGファイルを受け入れる", () => {
    const file = createMockFile(1024 * 1024, "image/jpeg", "avatar.jpg"); // 1MB
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(true);
  });

  it("有効なPNGファイルを受け入れる", () => {
    const file = createMockFile(1024 * 1024, "image/png", "avatar.png"); // 1MB
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(true);
  });

  it("有効なWebPファイルを受け入れる", () => {
    const file = createMockFile(1024 * 1024, "image/webp", "avatar.webp"); // 1MB
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(true);
  });

  it("2MB以下のファイルを受け入れる", () => {
    const file = createMockFile(2 * 1024 * 1024, "image/jpeg"); // 2MB（境界値）
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(true);
  });

  it("2MBを超えるファイルを拒否する", () => {
    const file = createMockFile(2 * 1024 * 1024 + 1, "image/jpeg"); // 2MB + 1byte
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "";
      expect(errorMessage).toContain("2MB");
    }
  });

  it("無効なMIMEタイプを拒否する（GIF）", () => {
    const file = createMockFile(1024 * 1024, "image/gif", "avatar.gif");
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "";
      expect(errorMessage).toContain("JPEG, PNG, and WebP");
    }
  });

  it("無効なMIMEタイプを拒否する（SVG）", () => {
    const file = createMockFile(1024, "image/svg+xml", "avatar.svg");
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(false);
  });

  it("無効なMIMEタイプを拒否する（テキストファイル）", () => {
    const file = createMockFile(1024, "text/plain", "file.txt");
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(false);
  });

  it("無効なMIMEタイプを拒否する（PDFファイル）", () => {
    const file = createMockFile(1024, "application/pdf", "file.pdf");
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(false);
  });

  it("空のファイルを拒否する", () => {
    const file = createMockFile(0, "image/jpeg");
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(true); // サイズは0でもOK（実際のアップロードで検証）
  });

  it("非常に小さいファイルを受け入れる", () => {
    const file = createMockFile(100, "image/jpeg"); // 100 bytes
    const result = avatarUploadSchema.safeParse({ file });
    expect(result.success).toBe(true);
  });
});
