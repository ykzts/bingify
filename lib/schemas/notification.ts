import { z } from "zod";

/**
 * 通知タイプのZodスキーマ
 */
export const notificationTypeSchema = z.enum([
  "space_invitation",
  "space_updated",
  "bingo_achieved",
  "announcement_published",
  "system_update",
  "role_changed",
  "space_closed",
]);

/**
 * 通知メタデータスキーマ
 */
export const notificationMetadataSchema = z
  .object({
    action_url: z.string().url().optional(),
    announcement_id: z.string().uuid().optional(),
    sender_id: z.string().uuid().optional(),
    space_id: z.string().uuid().optional(),
  })
  .passthrough(); // 追加のフィールドを許可

/**
 * 通知作成スキーマ
 */
export const createNotificationSchema = z.object({
  content: z.string().max(1000, "コンテンツは1000文字以内で入力してください"),
  expires_at: z.string().datetime().optional(),
  metadata: notificationMetadataSchema.default({}),
  title: z.string().max(200, "タイトルは200文字以内で入力してください"),
  type: notificationTypeSchema,
  user_id: z.string().uuid("無効なユーザーIDです"),
});

/**
 * 通知既読スキーマ
 */
export const markNotificationReadSchema = z.object({
  notification_id: z.string().uuid("無効な通知IDです"),
  read: z.boolean().default(true),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type MarkNotificationReadInput = z.infer<
  typeof markNotificationReadSchema
>;
export type NotificationMetadata = z.infer<typeof notificationMetadataSchema>;
