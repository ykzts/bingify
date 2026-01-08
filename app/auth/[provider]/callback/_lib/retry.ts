import type { createClient } from "@/lib/supabase/server";

// Retry configuration for exchangeCodeForSession
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Retries the OAuth code exchange with exponential backoff strategy.
 *
 * @param supabase - Supabase client instance
 * @param code - OAuth authorization code
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns Promise with error (null if successful)
 *
 * Retry behavior:
 * - Attempt 0: Immediate
 * - Attempt 1: After 1 second (RETRY_DELAY_MS * 2^0)
 * - Attempt 2: After 2 seconds (RETRY_DELAY_MS * 2^1)
 *
 * Retryable errors include:
 * - Network errors (connection failures, DNS issues)
 * - Timeout errors (request timeouts)
 * - Fetch errors (aborted requests)
 *
 * Non-retryable errors (returned immediately):
 * - Invalid code errors
 * - Authentication failures
 * - Other business logic errors
 */
export async function exchangeCodeWithRetry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string,
  maxRetries = MAX_RETRIES
): Promise<{ error: Error | null }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait before retrying with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * 2 ** (attempt - 1))
      );
    }

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      // Success or non-retryable error
      if (!error) {
        return { error: null };
      }

      // Store the error for potential retry or final return
      lastError = error;

      // Check if error is retryable based on error type and message
      // Supabase errors don't have consistent error codes, so we use multiple detection strategies:
      // 1. Check error name/type (if available)
      // 2. Check error message content
      const errorMessage = error.message?.toLowerCase() || "";
      const errorName = error.name?.toLowerCase() || "";

      // Network-related errors that are worth retrying
      const isRetryable =
        errorName.includes("networkerror") ||
        errorName.includes("fetcherror") ||
        errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("fetch") ||
        errorMessage.includes("aborted") ||
        errorMessage.includes("econnrefused") ||
        errorMessage.includes("enotfound") ||
        errorMessage.includes("etimedout");

      // If not retryable, return immediately
      if (!isRetryable) {
        return { error };
      }

      // Log retry attempt
      console.warn(
        `OAuth code exchange failed (attempt ${attempt + 1}/${maxRetries + 1}):`,
        error.message
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `OAuth code exchange threw exception (attempt ${attempt + 1}/${maxRetries + 1}):`,
        lastError.message
      );
    }
  }

  // All retries exhausted
  return { error: lastError };
}
