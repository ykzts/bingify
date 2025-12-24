# CONTRIBUTING

このプロジェクトへの貢献方法をまとめます。

## セットアップ

```bash
pnpm install
cp .env.local.example .env.local
pnpm local:setup
pnpm dev
```

## スクリプト

- `pnpm local:setup` / `pnpm local:stop` — Supabase 起動/停止
- `pnpm dev` — 開発サーバー起動
- `pnpm build` — 本番ビルド
- `pnpm lint` — ESLint 実行

## コーディング指針

- **Server Functions**: バリデーション・DB操作をサーバーサイド実装（"use server"）。
- **フォーム処理**: `useActionState` で Server Function を呼び出し、エラーメッセージを状態管理。
- **Zod**: スキーマ定義 → 型推論 → Server Functions 内で `safeParse()` でバリデーション。
- **スタイリング**: Tailwind CSS（CSS-first、`tailwind.config.ts` 不要）。
- **型安全**: `z.infer<typeof schema>` で型を推論し、手動定義を避ける。

## PR / コミット

### Conventional Commits に準拠

コミットメッセージと Pull Request は以下の形式に従ってください。GitHub Web UI でも見やすいようにシンプルで簡潔な英文を使用します。

**形式:**

```
type(scope): brief subject

optional detailed explanation
```

**type の例:**

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `refactor`: コード整理（機能変更なし）
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `ci`: CI設定の変更
- `chore`: その他の変更（依存関係など）

**scope の例:**

- `dashboard`: ダッシュボード機能
- `space`: スペース関連
- `auth`: 認証処理
- `db`: Supabase スキーマ

**例:**

- `feat(dashboard): add space creation form`
- `fix(space): resolve slug validation error`
- `docs: update setup instructions`
- `chore(deps): update tailwindcss to latest`

**Pull Request との対応:**

- PR タイトル = `type(scope): subject`
- PR description = 詳細説明（body）
- マージ時のコミットメッセージ = PR タイトル + description

### コミット前のチェック

- 小さな粒度でコミット（1つの機能や修正 = 1コミット）。
- `pnpm lint` を実行してエラーがないことを確認。
- `pnpm format:check` でフォーマット違反がないことを確認。
- 必要に応じて動作確認スクリーンショットを PR に記載。
