import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { isValidOAuthProvider } from "@/lib/oauth/provider-validation";
import { upsertOAuthToken } from "@/lib/oauth/token-storage";
import { createClient } from "@/lib/supabase/server";
import { validateRedirectPath } from "@/lib/utils/url";

const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/`);

// Retry configuration for exchangeCodeForSession
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// Helper function to retry exchangeCodeForSession with exponential backoff
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
async function exchangeCodeWithRetry(
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

interface RouteContext {
  params: Promise<{ provider: string }>;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: OAuth callback handling requires multiple conditional checks for security and error handling
export async function GET(request: NextRequest, context: RouteContext) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect = requestUrl.searchParams.get("redirect");
  const origin = requestUrl.origin;

  // URLからプロバイダーを取得
  const { provider } = await context.params;

  // Helper function to extract locale from referer
  const getLocaleFromReferer = (): string | null => {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const localeMatch = refererUrl.pathname.match(LOCALE_PATTERN);
        if (localeMatch?.[1]) {
          const locale = localeMatch[1];
          // Validate locale against configured locales
          if (
            routing.locales.includes(locale as (typeof routing.locales)[number])
          ) {
            return locale;
          }
        }
      } catch {
        // Invalid URL in referer header, return null
        return null;
      }
    }
    return null;
  };

  // Helper function to build path with optional locale
  const buildPath = (path: string, locale: string | null): string => {
    return locale ? `/${locale}${path}` : path;
  };

  // Validate provider parameter
  if (!isValidOAuthProvider(provider)) {
    console.error(`Invalid OAuth provider in callback URL: ${provider}`);
    const locale = getLocaleFromReferer();
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  // Code parameter is required for authentication
  if (!code || code.trim() === "") {
    console.error("Auth callback called without code parameter");
    const locale = getLocaleFromReferer();
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  // Exchange code for session with retry logic
  const supabase = await createClient();
  const { error } = await exchangeCodeWithRetry(supabase, code);

  if (error) {
    console.error("Error exchanging code for session:", error);
    const locale = getLocaleFromReferer();
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  // セッションをリフレッシュして最新のapp_metadataを取得する
  // exchangeCodeForSessionの後、ブラウザストレージにキャッシュされた古いセッションデータではなく
  // サーバーから最新のセッション情報（特にapp_metadata.provider）を取得するため
  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError) {
    console.error(
      "Error refreshing session after OAuth callback:",
      refreshError
    );
    const locale = getLocaleFromReferer();
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  const session = refreshedSession;

  if (session) {
    // Save OAuth tokens to database if available
    const { provider_token, provider_refresh_token } = session;

    // URLから取得したプロバイダーを使用してトークンを保存
    // これにより、app_metadata.providerのキャッシュ問題を回避できる
    if (provider_token) {
      // Calculate token expiry if available from session
      // Use session.expires_at which represents when the OAuth session expires
      let expiresAt: string | null = null;
      if (session.expires_at) {
        // session.expires_at is a Unix timestamp (seconds)
        expiresAt = new Date(session.expires_at * 1000).toISOString();
      }

      // Store token in encrypted database
      const result = await upsertOAuthToken(supabase, {
        access_token: provider_token,
        expires_at: expiresAt,
        provider,
        refresh_token: provider_refresh_token || null,
      });

      if (!result.success) {
        console.warn(
          `Failed to store OAuth token for provider ${provider}:`,
          result.error
        );
        // Continue anyway - token storage failure shouldn't block authentication
      }
    }

    // Set language metadata if not already set (for OAuth users)
    const userMetadata = session.user?.user_metadata;
    if (!userMetadata?.language) {
      const locale = getLocaleFromReferer();
      if (locale) {
        // Update user metadata with language preference
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            language: locale,
          },
        });

        if (updateError) {
          console.warn("Failed to set language metadata:", updateError);
          // Continue anyway - metadata update failure shouldn't block authentication
        }
      }
    }
  }

  // Successfully authenticated, redirect to specified path or default
  const locale = getLocaleFromReferer();
  const redirectPath = validateRedirectPath(redirect);

  // If redirect path already includes locale, use it as-is
  // Otherwise, prepend locale if available
  const hasLocale = LOCALE_PATTERN.test(redirectPath);
  const finalPath = hasLocale ? redirectPath : buildPath(redirectPath, locale);

  return NextResponse.redirect(`${origin}${finalPath}`);
}
