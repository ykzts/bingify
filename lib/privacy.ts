/**
 * Privacy utilities for masking sensitive information
 */

/**
 * Mask an email address to protect privacy
 * Examples:
 *   user@example.com -> u***@example.com
 *   test@google.com -> t***@google.com
 *   a@test.org -> a***@test.org
 *
 * @param email - The email address to mask
 * @returns The masked email address
 */
export function maskEmail(email: string): string {
  if (!email?.includes("@")) {
    return email;
  }

  const [localPart, domain] = email.split("@");

  if (domain === undefined || domain === "") {
    return email;
  }

  // Show first character of local part, mask the rest
  const maskedLocal = localPart.length > 0 ? `${localPart[0]}***` : "***";

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask an array of email patterns (emails and domains)
 * Emails: user@example.com -> u***@example.com
 * Domains: @example.com -> @example.com (kept as is, since domain is important for participation)
 *
 * @param patterns - Array of email addresses or domain patterns
 * @returns Array of masked patterns
 */
export function maskEmailPatterns(patterns: string[]): string[] {
  return patterns.map((pattern) => {
    // If it's a domain pattern (starts with @), keep it as is
    if (pattern.startsWith("@")) {
      return pattern;
    }

    // Otherwise, mask the email
    return maskEmail(pattern);
  });
}
