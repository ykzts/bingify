# TanStack Form Integration Guide

このプロジェクトでは、Next.js の Server Actions と統合された **TanStack Form** を使用してフォームを実装しています。

## パッケージ

- `@tanstack/react-form`: コアフォームライブラリ
- `@tanstack/react-form-nextjs`: Next.js 統合（SSR、Server Actions サポート）

## 基本的な実装パターン

### 1. 共有フォームオプションの定義

`form-options.ts` でフォームオプションとスキーマを定義します：

\`\`\`typescript
import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

// Zod スキーマ定義
export const createSpaceFormSchema = z.object({
  share_key: z
    .string()
    .min(3, "3文字以上入力してください")
    .max(30, "30文字以内で入力してください")
    .regex(/^[a-z0-9-]+$/, "小文字の英数字とハイフンのみ使用できます"),
});

export type CreateSpaceFormValues = z.infer<typeof createSpaceFormSchema>;

// フォームオプション
export const createSpaceFormOpts = formOptions({
  defaultValues: {
    share_key: "",
  } as CreateSpaceFormValues,
});
\`\`\`

### 2. Server Actions の実装

`create-space-actions.ts` で `createServerValidate` を使用してサーバー側バリデーションを実装：

\`\`\`typescript
"use server";

import { createServerValidate, initialFormState } from "@tanstack/react-form-nextjs";
import { createSpaceFormOpts, type CreateSpaceFormValues } from "./form-options";

// サーバー側バリデーション
const serverValidate = createServerValidate({
  ...createSpaceFormOpts,
  onServerValidate: async ({ value }: { value: CreateSpaceFormValues }) => {
    // データベースチェックなどのサーバー専用バリデーション
    const existing = await checkIfExists(value.share_key);
    
    if (existing) {
      return {
        fields: {
          share_key: "この共有キーは既に使用されています",
        },
      };
    }
    
    // バリデーション成功
    return undefined;
  },
});

// Server Action
export async function createSpaceAction(_prevState: unknown, formData: FormData) {
  try {
    // フォームデータをバリデーション
    const validatedData = await serverValidate(formData);
    
    // データベース操作など
    const result = await createInDatabase(validatedData);
    
    // 成功時は initialFormState に追加のメタデータを含めて返す
    return {
      ...initialFormState,
      values: { share_key: validatedData.share_key },
      meta: {
        success: true,
        spaceId: result.id,
      },
    };
  } catch (e) {
    // ServerValidateError の場合は formState を返す
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }
    
    // その他のエラー
    return {
      ...initialFormState,
      errors: ["予期しないエラーが発生しました"],
    };
  }
}
\`\`\`

### 3. クライアントコンポーネントの実装

`create-space-form.tsx` で `useForm` と `useActionState` を統合：

\`\`\`typescript
"use client";

import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { createSpaceAction } from "./create-space-actions";
import { createSpaceFormOpts, createSpaceFormSchema } from "./form-options";

export function CreateSpaceForm() {
  // useActionState で Server Action に接続
  const [state, action] = useActionState(createSpaceAction, initialFormState);

  // TanStack Form の初期化
  const form = useForm({
    ...createSpaceFormOpts,
    validators: {
      onChange: createSpaceFormSchema, // クライアント側バリデーション
    },
    // サーバー状態とクライアント状態をマージ
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
  });

  // フォームエラーを監視
  const formErrors = useStore(form.store, (formState) => formState.errors);
  const canSubmit = useStore(form.store, (formState) => formState.canSubmit);
  const isSubmitting = useStore(form.store, (formState) => formState.isSubmitting);

  return (
    <form action={action as never} onSubmit={() => form.handleSubmit()}>
      {/* グローバルエラー表示 */}
      {formErrors.length > 0 && (
        <div>
          {formErrors.map((error) => (
            <p key={String(error)}>{String(error)}</p>
          ))}
        </div>
      )}

      {/* フィールド定義 */}
      <form.Field name="share_key">
        {(field) => (
          <div>
            <input
              name={field.name}
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            
            {/* フィールドレベルエラー表示 */}
            {field.state.meta.errors.length > 0 && (
              <div>
                {field.state.meta.errors.map((error) => (
                  <p key={String(error)}>{String(error)}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </form.Field>

      <button type="submit" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? "送信中..." : "送信"}
      </button>
    </form>
  );
}
\`\`\`

## 主要な API

### `formOptions`

フォームの共有設定を定義します。クライアントとサーバー間で共有可能です。

### `createServerValidate`

サーバー専用のバリデーション関数を作成します。データベースチェックや外部 API 呼び出しなど、サーバーでのみ実行可能な処理を実装できます。

### `useForm`

クライアント側でフォームインスタンスを作成します。`transform` オプションで `mergeForm` を使用することで、サーバーから返されたバリデーション結果をクライアント側のフォーム状態にマージできます。

### `useActionState`

React の `useActionState` フックを使用して Server Action とフォームを接続します。

### `mergeForm`

サーバーから返された状態をクライアント側のフォーム状態にマージします。これにより、サーバー側のバリデーションエラーがクライアント側で自動的に表示されます。

## エラーハンドリング

- **フォームレベルのエラー**: `formState.errors` に格納されます
- **フィールドレベルのエラー**: `field.state.meta.errors` に格納されます
- **サーバー側のエラー**: `onServerValidate` から返されたエラーは自動的にクライアント側にマージされます

## 型安全性

- Zod スキーマから TypeScript 型を自動推論
- `formOptions` で定義したデフォルト値の型がフォーム全体に適用される
- `createServerValidate` は `formOptions` の型を継承する
- フィールド値は `field.state.value` から取得でき、必要に応じて型アサーションを使用

## ベストプラクティス

1. **共有可能なコードは分離する**: `form-options.ts` でスキーマとフォームオプションを定義
2. **サーバー専用のロジックは Server Actions に**: データベースアクセスなど
3. **即座のフィードバックにはクライアント側バリデーションを使用**: `validators.onChange` に Zod スキーマを渡す
4. **権威のあるバリデーションはサーバー側で**: `onServerValidate` で実装
5. **エラー表示は一貫性を保つ**: `field.state.meta.errors` と `formState.errors` を使用

## 参考リンク

- [TanStack Form 公式ドキュメント](https://tanstack.com/form/latest)
- [Next.js SSR ガイド](https://tanstack.com/form/latest/docs/framework/react/guides/ssr#nextjs-prerequisites)
