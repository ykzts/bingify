# Form Validation with Zod & TanStack Form

Bingifyにおけるフォームバリデーションの統一パターンを説明します。

## 推奨パターン

### 1. Zodスキーマの定義 (`form-options.ts`)

```typescript
// app/[locale]/contact/_lib/form-options.ts
import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

// Zodスキーマ: [フォーム名]Schema の形式で命名
export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const contactFormOpts = formOptions({
  defaultValues: {
    name: "",
    email: "",
    message: "",
  },
});
```

### 2. TanStack Formでの使用

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
      <button type="submit">送信</button>
    </form>
  );
}
```

## ファイル配置ルール

```
app/[locale]/contact/
├── _lib/
│   └── form-options.ts     # Zodスキーマとフォームオプション
├── _components/
│   └── contact-form.tsx    # フォームコンポーネント
└── _actions/
    └── contact.ts          # Server Actions
```

## 命名規則

1. **スキーマ**: `[フォーム名]Schema` (例: `contactFormSchema`)
2. **フォームオプション**: `[フォーム名]Opts` (例: `contactFormOpts`)
3. **型**: `[フォーム名]Values` (例: `ContactFormValues`)

## アンチパターン（避けるべき実装）

❌ **手動 `safeParse`**:

```typescript
// 悪い例
const result = emailSchema.safeParse({ email });
if (!result.success) {
  setError("エラー");
  return;
}
```

❌ **インライン `if` による手動バリデーション**:

```typescript
// 悪い例
if (!clientId.trim()) {
  toast.error("Required");
  return;
}
```

❌ **インラインZodスキーマ定義**:

```typescript
// 悪い例: コンポーネント内でスキーマを定義
function LoginForm() {
  const emailSchema = z.object({ email: z.string().email() });
}
```

## フォーム判断基準

✅ **クライアント側バリデーション推奨**:

- テキスト入力フィールド
- 数値入力
- メール、URL形式チェック
- 必須項目
- 文字数制限

❌ **通常不要**:

- ラジオボタン/チェックボックスのみ（サーバー検証は必須）
- OAuth認証フロー
- ファイルアップロード（react-dropzone使用）

**重要**: サーバー側では必ずすべての入力値を検証すること。
