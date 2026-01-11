---
name: authentication
description: Implement authentication with Supabase, OAuth providers, and session management. Use when adding login, OAuth flows, or protecting routes.
metadata:
  author: Bingify
  version: "1.0"
---

# Authentication & Session Management

このスキルは、Bingifyの認証実装とセッション管理をカバーします。

## 概要

BingifyはSupabaseAuth (メール/パスワード、OAuth) とミドルウェア保護を使用します。

## ログインフォーム

```tsx
"use client";

import { useActionState } from "react";
import { signInWithOtp } from "./actions";

export function SignInForm() {
  const [state, action] = useActionState(signInWithOtp, undefined);

  return (
    <form action={action}>
      <input type="email" name="email" required />
      <button type="submit">Send magic link</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

## ServerActionでの認証

```tsx
"use server";

import { createClient } from "@/lib/supabase/server";

export async function signInWithOtp(prevState: unknown, formData: FormData) {
  const supabase = createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Magic Linkの遷移先（メール内リンク）
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

## OAuthフロー

```tsx
// Google OAuth（リダイレクト先はプロバイダー別のコールバック）
export async function signInWithGoogle() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // 例: https://example.com/auth/google/callback
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/google/callback`,
    },
  });

  if (error) {
    // 必要に応じてクライアント側でエラー表示
    return;
  }

  if (data?.url) {
    redirect(data.url);
  }
}
```

### コールバック処理（コード→セッション交換／トークン保存）

- リダイレクト後、`/auth/[provider]/callback` で `code` を受け取り、`exchangeCodeForSession` をリトライ付きで実行してセッションを確立します。
- その後、`session.provider_token` と `session.provider_refresh_token` を取得し、`upsertOAuthToken()` を呼び出してデータベース（Supabase Vault によりDB関数レイヤーで暗号化）へ安全に保存します。
- 実装例: [app/auth/[provider]/callback/route.ts](../../../app/auth/%5Bprovider%5D/callback/route.ts) 内で `upsertOAuthToken` を利用しています。
- トークン利用時は [lib/oauth/token-storage.ts](../../../lib/oauth/token-storage.ts) の `getOAuthToken()`／`getOAuthTokenWithRefresh()` を使って復号・期限管理を行います。失効や取り消しは `deleteOAuthToken()` を使用します。

参考実装:

- `signInWithGoogle()`（上記）
- コールバックハンドラ: [app/auth/[provider]/callback/route.ts](../../../app/auth/%5Bprovider%5D/callback/route.ts)
- トークン保存ラッパー: `upsertOAuthToken()`（[lib/oauth/token-storage.ts](../../../lib/oauth/token-storage.ts)）

## ミドルウェア保護

```tsx
// middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });

  const { data } = await supabase.auth.getSession();

  if (!data.session && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
```

## ドキュメントのフォーマット

SKILL.mdを編集した場合は、以下でフォーマットしてください：

```bash
pnpm format:docs
```

## 参考

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [mailpit-testing スキル](../mailpit-testing/SKILL.md)
