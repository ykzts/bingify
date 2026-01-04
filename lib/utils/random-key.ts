/**
 * Web Crypto APIを使用してURL安全なランダム文字列を生成する
 * @param length - 生成する文字列の長さ（デフォルト: 11）
 * @returns "x7z-9bq-w2a"のようなフォーマットのランダム文字列
 */
export function generateRandomKey(length = 11): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
    // 可読性のため3文字ごとにハイフンを追加（最後を除く）
    if ((i + 1) % 3 === 0 && i < length - 1) {
      result += "-";
    }
  }

  return result;
}
