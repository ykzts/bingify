/**
 * アバターアップロード関連の定数
 */

export const AVATAR_MIN_FILE_SIZE = 1; // 1 byte (0バイトファイルを防ぐ)
export const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export type AvatarMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];

export const AVATAR_MIME_TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isValidAvatarMimeType(type: string): type is AvatarMimeType {
  return AVATAR_ALLOWED_MIME_TYPES.includes(type);
}
