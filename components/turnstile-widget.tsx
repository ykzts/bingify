"use client";

import { Turnstile } from "@marsidev/react-turnstile";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
}

/**
 * Cloudflare Turnstile widget component
 * Only renders if NEXT_PUBLIC_TURNSTILE_SITE_KEY is set
 */
export function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Don't render if Turnstile is not configured
  if (!siteKey) {
    return null;
  }

  return (
    <Turnstile
      onSuccess={onVerify}
      options={{
        size: "normal",
        theme: "light",
      }}
      siteKey={siteKey}
    />
  );
}
