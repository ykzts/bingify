---
name: form-validation
description: Implement form validation using Zod + TanStack Form validators pattern. Use when creating new forms or refactoring existing form validation logic.
metadata:
  author: Bingify
  version: "1.0"
---

# Form Validation with Zod & TanStack Form

このスキルは、Bingifyにおけるフォームバリデーションの統一パターンを説明します。

## 概要

Bingifyでは、**TanStack Form**の`validators`プロパティと**Zod**スキーマを組み合わせた統一的なバリデーションパターンを採用しています。このパターンにより、型安全性、コードの一貫性、保守性が向上します。

## 推奨パターン

### 1. Zodスキーマの定義 (`form-options.ts`)

フォームごとに`form-options.ts`ファイルを作成し、Zodスキーマとフォームオプションを定義します。

```typescript
// app/[locale]/contact/_lib/form-options.ts
import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

// Zodスキーマ: [フォーム名]Schema の形式で命名
export const contactFormSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  message: z.string().min(10, "本文は10文字以上入力してください"),
});

// TypeScript型推論
export type ContactFormValues = z.infer<typeof contactFormSchema>;

// フォームオプション
export const contactFormOpts = formOptions({
  defaultValues: {
    name: "",
    email: "",
    message: "",
  },
});
```

### 2. TanStack Formでの使用

フォームコンポーネントで`validators`プロパティを使用してスキーマを適用します。

```typescript
// app/[locale]/contact/_components/contact-form.tsx
"use client";

import { useForm } from "@tanstack/react-form-nextjs";
import { contactFormOpts, contactFormSchema } from "../_lib/form-options";

export function ContactForm() {
  const form = useForm({
    ...contactFormOpts,
    validators: {
      onChange: contactFormSchema, // リアルタイムバリデーション
    },
  });

  return (
    <form onSubmit={() => form.handleSubmit()}>
      <form.Field name="name">
        {(field) => (
          <div>
            <input
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <span>{field.state.meta.errors[0]}</span>
            )}
          </div>
        )}
      </form.Field>
      
      {/* 他のフィールド */}
      
      <button type="submit">送信</button>
    </form>
  );
}
```

### 3. バリデーションタイミングの制御

`validationLogic`プロパティでバリデーションの動作を制御できます。

```typescript
import { revalidateLogic } from "@tanstack/react-form";

const form = useForm({
  ...contactFormOpts,
  validationLogic: revalidateLogic({
    mode: "submit",              // 初回は送信時にバリデーション
    modeAfterSubmission: "change", // 送信後は変更時にバリデーション
  }),
  validators: {
    onChange: contactFormSchema,
  },
});
```

## アンチパターン（避けるべき実装）

### ❌ 手動 `safeParse` の使用

```typescript
// 悪い例: 手動でsafeParseを呼び出す
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  const result = emailSchema.safeParse({ email });
  if (!result.success) {
    setError("エラー");
    return;
  }
  // ...
};
```

**問題点**:
- TanStack Formの型安全性が失われる
- エラーハンドリングが手動になり、コードが冗長
- フィールド単位のエラー表示が困難

### ❌ インライン `if` 文による手動バリデーション

```typescript
// 悪い例: if文で手動チェック
const handleSave = async () => {
  if (!clientId.trim()) {
    toast.error("Client IDは必須です");
    return;
  }
  
  if (clientSecret.length > 0 && clientSecret.length < 8) {
    toast.error("Client Secretは8文字以上必要です");
    return;
  }
  
  // ...
};
```

**問題点**:
- バリデーションロジックが分散し、保守性が低下
- 型安全性がない
- 再利用性がない
- エラーメッセージが一貫しない

### ❌ インラインZodスキーマの定義

```typescript
// 悪い例: コンポーネント内でスキーマを定義
function LoginForm() {
  const emailSchema = z.object({
    email: z.string().email(),
  });
  
  // ...
}
```

**問題点**:
- レンダリングごとにスキーマが再作成される
- 他のコンポーネントで再利用できない
- テストが困難

## ファイル配置ルール

### 推奨ディレクトリ構造

```
app/[locale]/contact/
├── _lib/
│   └── form-options.ts     # Zodスキーマとフォームオプション
├── _components/
│   └── contact-form.tsx    # フォームコンポーネント
└── _actions/
    └── contact.ts          # Server Actions
```

### 命名規則

1. **スキーマ**: `[フォーム名]Schema` (例: `contactFormSchema`, `loginFormSchema`)
2. **フォームオプション**: `[フォーム名]Opts` (例: `contactFormOpts`)
3. **型**: `[フォーム名]Values` (例: `ContactFormValues`)

## エラーメッセージのガイドライン

### 1. 日本語メッセージを直接定義

```typescript
export const contactFormSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
});
```

### 2. i18nキーの使用（国際化が必要な場合）

```typescript
// メッセージキーを返す
export const contactFormSchema = z.object({
  email: z
    .string()
    .min(1, "Contact.errors.emailRequired")
    .email("Contact.errors.emailInvalid"),
});

// コンポーネント側でi18n変換
<FieldError
  errors={field.state.meta.errors.map((msg) => ({
    message: getErrorMessage(msg), // i18n変換関数
  }))}
/>
```

### 3. 明確で具体的なエラーメッセージ

```typescript
// 良い例
z.string().min(10, "本文は10文字以上入力してください")

// 悪い例
z.string().min(10, "文字数が足りません")
```

## 既存フォームの例

### 統一済みフォーム（参考実装）

以下のフォームは推奨パターンで実装されています：

1. **Contact Form**
   - スキーマ: `app/[locale]/contact/_lib/form-options.ts`
   - コンポーネント: `app/[locale]/contact/_components/contact-form.tsx`

2. **Create Space Form**
   - スキーマ: `app/[locale]/dashboard/_lib/form-options.ts`
   - コンポーネント: `app/[locale]/dashboard/_components/create-space-form.tsx`

3. **Email Change Form**
   - スキーマ: `app/[locale]/settings/profile/_lib/form-options.ts`
   - コンポーネント: `app/[locale]/settings/profile/_components/email-change-form.tsx`

4. **Username Form**
   - スキーマ: `app/[locale]/settings/profile/_lib/form-options.ts`
   - コンポーネント: `app/[locale]/settings/profile/_components/username-form.tsx`

5. **Announcement Form**
   - スキーマ: `app/[locale]/admin/announcements/_lib/form-options.ts`
   - コンポーネント: `app/[locale]/admin/announcements/_components/announcement-form.tsx`

### 移行が必要なフォーム

以下のフォームは旧パターンを使用しており、統一が推奨されます：

1. **Login Form** (`app/[locale]/login/_components/login-form.tsx`)
   - 現状: 手動`safeParse`を使用
   - 対応: TanStack Form + Zod validatorsパターンへの移行

2. **OAuth Config Form** (`app/[locale]/admin/auth-providers/_components/oauth-config-form.tsx`)
   - 現状: if文による手動バリデーション
   - 対応: Zodスキーマとvalidatorsパターンへの移行

## 特殊なケース

### ファイルアップロードのバリデーション

ファイルアップロード（例: `avatar-upload-form.tsx`）では、`react-dropzone`のカスタムバリデーターを使用することが適切です。

```typescript
// ファイルアップロード専用のバリデーション
const fileValidator = (file: File) => {
  if (file.size < AVATAR_MIN_FILE_SIZE) {
    return {
      code: "file-too-small",
      message: "ファイルサイズが小さすぎます",
    };
  }
  if (file.size > AVATAR_MAX_FILE_SIZE) {
    return {
      code: "file-too-large",
      message: "ファイルサイズが大きすぎます",
    };
  }
  return null;
};

// react-dropzoneで使用
const { getRootProps, getInputProps } = useDropzone({
  validator: fileValidator,
  // ...
});
```

**理由**: ファイルアップロードは`File`オブジェクトを直接扱うため、Zodスキーマよりもreact-dropzoneの専用バリデーターが適しています。

### 入力フォームがないケース

以下のようなケースではバリデーションは不要です：

- **Avatar Selection Form** (`avatar-selection-form.tsx`): ラジオボタンでの選択のみ
- **Account Linking Form** (`account-linking-form.tsx`): OAuthリンク処理のみ

## 移行手順

既存フォームを推奨パターンに移行する場合：

1. **Zodスキーマの作成**
   - `_lib/form-options.ts`ファイルを作成
   - 既存のバリデーションロジックをZodスキーマに変換

2. **TanStack Formへの移行**
   - `useForm`フックで`validators`プロパティを使用
   - `form.Field`コンポーネントでフィールドを定義

3. **手動バリデーションの削除**
   - `safeParse`の呼び出しを削除
   - if文によるバリデーションを削除

4. **エラー表示の統一**
   - `field.state.meta.errors`からエラーを取得
   - `FieldError`コンポーネントで表示

5. **テスト**
   - バリデーションが正しく動作することを確認
   - エラーメッセージが適切に表示されることを確認

## まとめ

- ✅ **Zodスキーマ**を`form-options.ts`に定義
- ✅ **TanStack Form**の`validators`プロパティで使用
- ✅ **命名規則**に従う（`[フォーム名]Schema`）
- ✅ **手動バリデーション**を避ける
- ✅ **明確なエラーメッセージ**を提供
- ✅ **特殊なケース**（ファイルアップロードなど）は例外として扱う

この統一パターンにより、フォームバリデーションの一貫性、保守性、型安全性が向上します。
