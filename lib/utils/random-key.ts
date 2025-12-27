/**
 * Generate a random URL-safe string using Web Crypto API
 * @param length - Length of the generated string (default: 11)
 * @returns Random string with format like "x7z-9bq-w2a"
 */
export function generateRandomKey(length = 11): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
    // Add hyphen every 3 characters for readability (except at the end)
    if ((i + 1) % 3 === 0 && i < length - 1) {
      result += "-";
    }
  }

  return result;
}
