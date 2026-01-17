import { describe, expect, it } from "vitest";
import {
  announcementContentSchema,
  announcementPrioritySchema,
  announcementTitleSchema,
  createAnnouncementSchema,
  createSpaceAnnouncementSchema,
  dismissAnnouncementSchema,
  updateAnnouncementSchema,
} from "../announcement";

describe("announcementPrioritySchema", () => {
  it("有効な優先度を受け入れる", () => {
    expect(announcementPrioritySchema.parse("info")).toBe("info");
    expect(announcementPrioritySchema.parse("warning")).toBe("warning");
    expect(announcementPrioritySchema.parse("error")).toBe("error");
  });

  it("無効な優先度を拒否する", () => {
    expect(() => announcementPrioritySchema.parse("critical")).toThrow();
    expect(() => announcementPrioritySchema.parse("")).toThrow();
  });
});

describe("announcementTitleSchema", () => {
  it("有効なタイトルを受け入れる", () => {
    expect(announcementTitleSchema.parse("テストタイトル")).toBe(
      "テストタイトル"
    );
    expect(announcementTitleSchema.parse("a")).toBe("a");
    expect(announcementTitleSchema.parse("a".repeat(200))).toBe(
      "a".repeat(200)
    );
  });

  it("空のタイトルを拒否する", () => {
    const result = announcementTitleSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("200文字を超えるタイトルを拒否する", () => {
    const longTitle = "a".repeat(201);
    const result = announcementTitleSchema.safeParse(longTitle);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("200文字以内");
    }
  });
});

describe("announcementContentSchema", () => {
  it("有効なコンテンツを受け入れる", () => {
    expect(announcementContentSchema.parse("テストコンテンツ")).toBe(
      "テストコンテンツ"
    );
    expect(announcementContentSchema.parse("")).toBe("");
    expect(announcementContentSchema.parse("a".repeat(5000))).toBe(
      "a".repeat(5000)
    );
  });

  it("5000文字を超えるコンテンツを拒否する", () => {
    const longContent = "a".repeat(5001);
    const result = announcementContentSchema.safeParse(longContent);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("5000文字以内");
    }
  });
});

describe("createAnnouncementSchema", () => {
  const validAnnouncement = {
    content: "テストコンテンツ",
    locale: "ja" as const,
    priority: "info" as const,
    title: "テストタイトル",
  };

  it("有効なアナウンスメントデータを受け入れる", () => {
    const result = createAnnouncementSchema.safeParse(validAnnouncement);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dismissible).toBe(true); // デフォルト値
      expect(result.data.published).toBe(false); // デフォルト値
    }
  });

  it("starts_atとends_atを含むアナウンスメントを受け入れる", () => {
    const announcementWithDates = {
      ...validAnnouncement,
      ends_at: "2024-12-31T23:59:59Z",
      starts_at: "2024-01-01T00:00:00Z",
    };
    const result = createAnnouncementSchema.safeParse(announcementWithDates);
    expect(result.success).toBe(true);
  });

  it("dismissibleとpublishedを設定できる", () => {
    const announcement = {
      ...validAnnouncement,
      dismissible: false,
      published: true,
    };
    const result = createAnnouncementSchema.safeParse(announcement);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dismissible).toBe(false);
      expect(result.data.published).toBe(true);
    }
  });

  it("無効なpriorityを拒否する", () => {
    const invalidAnnouncement = {
      ...validAnnouncement,
      priority: "invalid",
    };
    const result = createAnnouncementSchema.safeParse(invalidAnnouncement);
    expect(result.success).toBe(false);
  });

  it("タイトルが長すぎる場合拒否する", () => {
    const invalidAnnouncement = {
      ...validAnnouncement,
      title: "a".repeat(201),
    };
    const result = createAnnouncementSchema.safeParse(invalidAnnouncement);
    expect(result.success).toBe(false);
  });
});

describe("updateAnnouncementSchema", () => {
  it("部分的な更新を受け入れる", () => {
    const partialUpdate = {
      title: "更新されたタイトル",
    };
    const result = updateAnnouncementSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it("全フィールドの更新を受け入れる", () => {
    const fullUpdate = {
      content: "更新されたコンテンツ",
      dismissible: false,
      ends_at: "2024-12-31T23:59:59Z",
      priority: "warning" as const,
      published: true,
      starts_at: "2024-01-01T00:00:00Z",
      title: "更新されたタイトル",
    };
    const result = updateAnnouncementSchema.safeParse(fullUpdate);
    expect(result.success).toBe(true);
  });

  it("空のオブジェクトを受け入れる", () => {
    const result = updateAnnouncementSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("createSpaceAnnouncementSchema", () => {
  it("有効なスペースアナウンスメントデータを受け入れる", () => {
    const validData = {
      announcement_id: "123e4567-e89b-12d3-a456-426614174000",
      space_id: "123e4567-e89b-12d3-a456-426614174001",
    };
    const result = createSpaceAnnouncementSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pinned).toBe(false); // デフォルト値
    }
  });

  it("pinnedフラグを設定できる", () => {
    const dataWithPinned = {
      announcement_id: "123e4567-e89b-12d3-a456-426614174000",
      pinned: true,
      space_id: "123e4567-e89b-12d3-a456-426614174001",
    };
    const result = createSpaceAnnouncementSchema.safeParse(dataWithPinned);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pinned).toBe(true);
    }
  });

  it("無効なUUIDを拒否する", () => {
    const invalidData = {
      announcement_id: "invalid-uuid",
      space_id: "123e4567-e89b-12d3-a456-426614174001",
    };
    const result = createSpaceAnnouncementSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("announcement_id");
    }
  });
});

describe("dismissAnnouncementSchema", () => {
  it("有効なアナウンスメントIDを受け入れる", () => {
    const validData = {
      announcement_id: "123e4567-e89b-12d3-a456-426614174000",
    };
    const result = dismissAnnouncementSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("無効なUUIDを拒否する", () => {
    const invalidData = {
      announcement_id: "not-a-uuid",
    };
    const result = dismissAnnouncementSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("無効");
    }
  });
});
