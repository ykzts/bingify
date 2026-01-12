import { describe, expect, it } from "vitest";
import {
  createNotificationSchema,
  markNotificationReadSchema,
  notificationMetadataSchema,
  notificationTypeSchema,
} from "../notification";

describe("notificationTypeSchema", () => {
  it("有効な通知タイプを受け入れる", () => {
    expect(notificationTypeSchema.parse("space_invitation")).toBe(
      "space_invitation"
    );
    expect(notificationTypeSchema.parse("space_updated")).toBe("space_updated");
    expect(notificationTypeSchema.parse("bingo_achieved")).toBe(
      "bingo_achieved"
    );
    expect(notificationTypeSchema.parse("announcement_published")).toBe(
      "announcement_published"
    );
    expect(notificationTypeSchema.parse("system_update")).toBe("system_update");
    expect(notificationTypeSchema.parse("role_changed")).toBe("role_changed");
    expect(notificationTypeSchema.parse("space_closed")).toBe("space_closed");
  });

  it("無効な通知タイプを拒否する", () => {
    expect(() => notificationTypeSchema.parse("invalid_type")).toThrow();
    expect(() => notificationTypeSchema.parse("")).toThrow();
  });
});

describe("notificationMetadataSchema", () => {
  it("有効なメタデータを受け入れる", () => {
    const validMetadata = {
      action_url: "https://example.com/action",
      announcement_id: "123e4567-e89b-12d3-a456-426614174000",
      sender_id: "123e4567-e89b-12d3-a456-426614174001",
      space_id: "123e4567-e89b-12d3-a456-426614174002",
    };
    const result = notificationMetadataSchema.safeParse(validMetadata);
    expect(result.success).toBe(true);
  });

  it("空のメタデータを受け入れる", () => {
    const result = notificationMetadataSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("追加のフィールドを許可する", () => {
    const metadataWithExtra = {
      custom_field: "custom_value",
      space_id: "123e4567-e89b-12d3-a456-426614174000",
    };
    const result = notificationMetadataSchema.safeParse(metadataWithExtra);
    expect(result.success).toBe(true);
  });

  it("無効なURLを拒否する", () => {
    const invalidMetadata = {
      action_url: "not-a-url",
    };
    const result = notificationMetadataSchema.safeParse(invalidMetadata);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("action_url");
    }
  });

  it("無効なUUIDを拒否する", () => {
    const invalidMetadata = {
      space_id: "not-a-uuid",
    };
    const result = notificationMetadataSchema.safeParse(invalidMetadata);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("space_id");
    }
  });
});

describe("createNotificationSchema", () => {
  const validNotification = {
    content: "テスト通知コンテンツ",
    title: "テスト通知",
    type: "space_invitation" as const,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
  };

  it("有効な通知データを受け入れる", () => {
    const result = createNotificationSchema.safeParse(validNotification);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata).toEqual({}); // デフォルト値
    }
  });

  it("メタデータを含む通知を受け入れる", () => {
    const notificationWithMetadata = {
      ...validNotification,
      metadata: {
        space_id: "123e4567-e89b-12d3-a456-426614174001",
      },
    };
    const result = createNotificationSchema.safeParse(notificationWithMetadata);
    expect(result.success).toBe(true);
  });

  it("有効期限を含む通知を受け入れる", () => {
    const notificationWithExpiry = {
      ...validNotification,
      expires_at: "2024-12-31T23:59:59Z",
    };
    const result = createNotificationSchema.safeParse(notificationWithExpiry);
    expect(result.success).toBe(true);
  });

  it("タイトルが長すぎる場合拒否する", () => {
    const invalidNotification = {
      ...validNotification,
      title: "a".repeat(201),
    };
    const result = createNotificationSchema.safeParse(invalidNotification);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("200文字以内");
    }
  });

  it("コンテンツが長すぎる場合拒否する", () => {
    const invalidNotification = {
      ...validNotification,
      content: "a".repeat(1001),
    };
    const result = createNotificationSchema.safeParse(invalidNotification);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("1000文字以内");
    }
  });

  it("無効なuser_idを拒否する", () => {
    const invalidNotification = {
      ...validNotification,
      user_id: "not-a-uuid",
    };
    const result = createNotificationSchema.safeParse(invalidNotification);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("user_id");
    }
  });

  it("無効な通知タイプを拒否する", () => {
    const invalidNotification = {
      ...validNotification,
      type: "invalid_type",
    };
    const result = createNotificationSchema.safeParse(invalidNotification);
    expect(result.success).toBe(false);
  });
});

describe("markNotificationReadSchema", () => {
  it("有効な既読マークデータを受け入れる", () => {
    const validData = {
      notification_id: "123e4567-e89b-12d3-a456-426614174000",
      read: true,
    };
    const result = markNotificationReadSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("readフラグのデフォルト値はtrue", () => {
    const dataWithoutRead = {
      notification_id: "123e4567-e89b-12d3-a456-426614174000",
    };
    const result = markNotificationReadSchema.safeParse(dataWithoutRead);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.read).toBe(true);
    }
  });

  it("readをfalseに設定できる", () => {
    const dataWithFalse = {
      notification_id: "123e4567-e89b-12d3-a456-426614174000",
      read: false,
    };
    const result = markNotificationReadSchema.safeParse(dataWithFalse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.read).toBe(false);
    }
  });

  it("無効なnotification_idを拒否する", () => {
    const invalidData = {
      notification_id: "not-a-uuid",
      read: true,
    };
    const result = markNotificationReadSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("無効");
    }
  });
});
