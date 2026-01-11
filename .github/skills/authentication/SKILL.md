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
import { signInWithEmail } from "./actions";

export function SignInForm() {
  const [state, action] = useActionState(signInWithEmail, undefined);

  return (
    <form action={action}>
      <input type="email" name="email" required />
      <input type="password" name="password" required />
      <button type="submit">Sign in</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

## ServerActionでの認証

```tsx
"use server";

import { createClient } from "@/lib/supabase/server";

export async function signInWithEmail(prevState: unknown, formData: FormData) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

## OAuthフロー

```tsx
// Google OAuth
export async function signInWithGoogle() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (data.url) {
    redirect(data.url);
  }
}
```

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
