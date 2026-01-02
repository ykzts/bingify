/**
 * Escape HTML special characters to prevent XSS attacks
 * Replaces &, <, >, ", ', and / with their HTML entity equivalents
 */
export function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}
