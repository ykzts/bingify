import { z } from "zod";

/**
 * アナウンスメントのロケールスキーマ
 */
export const localeSchema = z.enum(["en", "ja"]);

/**
 * アナウンスメントの優先度スキーマ
 */
export const announcementPrioritySchema = z.enum(["info", "warning", "error"]);

/**
 * アナウンスメントのタイトルスキーマ
 * 1文字以上200文字以内
 */
export const announcementTitleSchema = z
  .string()
  .min(1, "タイトルは1文字以上入力してください")
  .max(200, "タイトルは200文字以内で入力してください");

/**
 * アナウンスメントのコンテンツスキーマ
 * 1文字以上5000文字以内
 */
export const announcementContentSchema = z
  .string()
  .min(1, "コンテンツは1文字以上入力してください")
  .max(5000, "コンテンツは5000文字以内で入力してください");

/**
 * アナウンスメント作成フォームスキーマ
 */
export const createAnnouncementSchema = z.object({
  content: announcementContentSchema,
  dismissible: z.boolean().default(true),
  ends_at: z.string().datetime().optional().nullable(),
  locale: localeSchema,
  parent_id: z.string().uuid().optional().nullable(),
  priority: announcementPrioritySchema,
  published: z.boolean().default(false),
  starts_at: z.string().datetime().optional().nullable(),
  title: announcementTitleSchema,
});

/**
 * アナウンスメント更新フォームスキーマ
 */
export const updateAnnouncementSchema = createAnnouncementSchema.partial();

/**
 * スペースアナウンスメント作成スキーマ
 */
export const createSpaceAnnouncementSchema = z.object({
  announcement_id: z.string().uuid("無効なアナウンスメントIDです"),
  pinned: z.boolean().default(false),
  space_id: z.string().uuid("無効なスペースIDです"),
});

/**
 * スペースアナウンスメント更新スキーマ
 */
export const updateSpaceAnnouncementSchema = z.object({
  content: announcementContentSchema.optional(),
  ends_at: z.string().datetime().optional().nullable(),
  pinned: z.boolean().optional(),
  priority: announcementPrioritySchema.optional(),
  starts_at: z.string().datetime().optional().nullable(),
  title: announcementTitleSchema.optional(),
});

/**
 * アナウンスメント非表示スキーマ
 */
export const dismissAnnouncementSchema = z.object({
  announcement_id: z.string().uuid("無効なアナウンスメントIDです"),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type CreateSpaceAnnouncementInput = z.infer<
  typeof createSpaceAnnouncementSchema
>;
export type UpdateSpaceAnnouncementInput = z.infer<
  typeof updateSpaceAnnouncementSchema
>;
export type DismissAnnouncementInput = z.infer<
  typeof dismissAnnouncementSchema
>;
