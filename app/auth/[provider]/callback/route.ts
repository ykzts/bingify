import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isValidOAuthProvider } from "@/lib/oauth/provider-validation";
import { upsertOAuthToken } from "@/lib/oauth/token-storage";
import { createClient } from "@/lib/supabase/server";
import { validateRedirectPath } from "@/lib/utils/url";
import { buildPath, getLocaleFromReferer } from "./_lib/locale";
import { exchangeCodeWithRetry } from "./_lib/retry";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: OAuth callback handling requires multiple conditional checks for security and error handling
export async function GET(
  request: NextRequest,
  context: RouteContext<"/auth/[provider]/callback">
) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect = requestUrl.searchParams.get("redirect");
  const origin = requestUrl.origin;

  // URLからプロバイダーを取得
  const { provider } = await context.params;

  // Extract locale from referer for error redirects
  const refererHeader = request.headers.get("referer");
  const locale = getLocaleFromReferer(refererHeader);

  // Validate provider parameter
  if (!isValidOAuthProvider(provider)) {
    console.error(`Invalid OAuth provider in callback URL: ${provider}`);
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  // Code parameter is required for authentication
  if (!code || code.trim() === "") {
    console.error("Auth callback called without code parameter");
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  // Exchange code for session with retry logic
  const supabase = await createClient();
  const { error } = await exchangeCodeWithRetry(supabase, code);

  if (error) {
    console.error("Error exchanging code for session:", error);
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  // Get the current session after code exchange
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error("Error getting session after OAuth callback:", sessionError);
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  if (session) {
    // Save OAuth tokens to database if available
    const { provider_token, provider_refresh_token } = session;

    // URLから取得したプロバイダーを使用してトークンを保存
    // これにより、app_metadata.providerのキャッシュ問題を回避できる
    if (provider_token) {
      // Extract OAuth token expiry from provider-specific fields
      // Do NOT use session.expires_at as it's the Supabase session expiry, not OAuth token expiry
      let expiresAt: string | null = null;

      // Try to get expiry from session metadata fields
      // Some providers return expires_in (seconds) or provider_token_expires_at
      const sessionAny = session as unknown as Record<string, unknown>;

      // Check for provider-specific expiry fields
      if (
        typeof sessionAny.provider_token_expires_at === "number" &&
        sessionAny.provider_token_expires_at > 0
      ) {
        // Some providers include explicit token expiry timestamp
        expiresAt = new Date(
          sessionAny.provider_token_expires_at * 1000
        ).toISOString();
      } else if (
        typeof sessionAny.provider_token_expires_in === "number" &&
        sessionAny.provider_token_expires_in > 0
      ) {
        // Calculate expiry from expires_in (seconds from now)
        const expiryTime =
          Date.now() + sessionAny.provider_token_expires_in * 1000;
        expiresAt = new Date(expiryTime).toISOString();
      } else if (
        typeof sessionAny.expires_in === "number" &&
        sessionAny.expires_in > 0
      ) {
        // Some providers use expires_in at session level
        const expiryTime = Date.now() + sessionAny.expires_in * 1000;
        expiresAt = new Date(expiryTime).toISOString();
      } else {
        // Try to decode JWT to get expiry if token is a JWT
        try {
          const tokenParts = provider_token.split(".");
          if (tokenParts.length === 3) {
            // Looks like a JWT, decode the payload
            const payload = JSON.parse(
              Buffer.from(tokenParts[1], "base64").toString("utf8")
            );
            if (typeof payload.exp === "number" && payload.exp > 0) {
              // JWT exp claim is Unix timestamp in seconds
              expiresAt = new Date(payload.exp * 1000).toISOString();
            }
          }
        } catch {
          // Not a JWT or failed to decode - leave expiresAt as null
          // This is fine, some tokens don't have expiry (e.g., long-lived tokens)
        }
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
    if (!userMetadata?.language && locale) {
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

  // Successfully authenticated, redirect to specified path or default
  const redirectPath = validateRedirectPath(redirect);

  // If redirect path already includes locale, use it as-is
  // Otherwise, prepend locale if available
  const finalPath =
    locale && redirectPath.startsWith(`/${locale}/`)
      ? redirectPath
      : buildPath(redirectPath, locale);

  // Add login_success parameter to trigger toast notification
  const finalUrl = new URL(`${origin}${finalPath}`);
  finalUrl.searchParams.set("login_success", "true");

  return NextResponse.redirect(finalUrl.toString());
}
