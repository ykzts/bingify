/**
 * Generate a secure random token using Web Crypto API
 * @returns 64-character hexadecimal string (32 bytes)
 */
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
