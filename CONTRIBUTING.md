# CONTRIBUTING

このプロジェクトへの貢献方法をまとめます。

## セットアップ

```bash
pnpm install
cp .env.example .env
pnpm local:setup
pnpm dev
```

## スクリプト

- `pnpm local:setup` / `pnpm local:stop` — Supabase起動/停止
- `pnpm dev` — 開発サーバー起動
- `pnpm build` — 本番ビルド
- `pnpm lint` — ESLint実行

## コーディング指針

- **Server Functions**: バリデーション・DB操作をサーバーサイド実装（"use server"）。
- **フォーム処理**: `useActionState` でServer Functionを呼び出し、エラーメッセージを状態管理。
- **Zod**: スキーマ定義 → 型推論 → Server Functions内で `safeParse()` でバリデーション。
- **スタイリング**: Tailwind CSS（CSS-first、`tailwind.config.ts` 不要）。
- **型安全**: `z.infer<typeof schema>` で型を推論し、手動定義を避ける。

## データベースマイグレーション

### ⚠️ 重要なルール

**既存のマイグレーションファイルは絶対に編集しないでください。**

- 既に `main` ブランチにマージされたマイグレーションファイルは、一度適用されると再実行されません
- 既存ファイルを編集すると、既存環境には変更が反映されず、新規環境とのスキーマ不整合が発生します
- **変更が必要な場合は、必ず新しいマイグレーションファイルを作成してください**

```bash
# ✅ 正しい方法: 新しいマイグレーションファイルを作成
supabase migration new fix_archive_table_schema

# ❌ 間違った方法: 既存ファイルを編集
# vim supabase/migrations/20251226000000_add_archive_tables.sql
```

詳細は [docs/MIGRATIONS.md](docs/MIGRATIONS.md) を参照してください。

## PR / コミット

### Conventional Commits に準拠

コミットメッセージとPull Requestは以下の形式に従ってください。GitHub Web UIでも見やすいようにシンプルで簡潔な英文を使用します。

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
- `db`: Supabaseスキーマ

**例:**

- `feat(dashboard): add space creation form`
- `fix(space): resolve slug validation error`
- `docs: update setup instructions`
- `chore(deps): update tailwindcss to latest`

**Pull Request との対応:**

- PRタイトル = `type(scope): subject`
- PR description = 詳細説明（body）
- マージ時のコミットメッセージ = PRタイトル + description

### コミット前のチェック

- 小さな粒度でコミット（1つの機能や修正 = 1コミット）。
- `pnpm check` を実行してリント・フォーマットエラーがないことを確認。
- `pnpm type-check` で型チェックエラーがないことを確認。
- `pnpm test` でテストが通ることを確認。
- 必要に応じて動作確認スクリーンショットをPRに記載。

## サンプルドメインの使用

コード例やドキュメント内でサンプルURLやメールアドレスを使用する際は、**RFC 2606** で定義された予約済みドメイン名を使用してください。

**使用すべきドメイン:**

- `example.com`
- `example.org`
- `example.net`

**適用箇所:**

- コード例（テスト、ドキュメント内のコードブロック）
- メールアドレスの例示
- URLの例示
- APIリクエスト/レスポンスの例

**例:**

```typescript
// ✅ 正しい
const email = "user@example.com";
const url = "https://example.com/callback";

// ❌ 誤り
const email = "user@mysite.com";
const url = "https://mycompany.com/callback";
```

## ドキュメント

### 記載すべきドキュメント

- `README.md` - プロジェクト概要とセットアップ手順
- `docs/STYLE_GUIDE.md` - 日本語・英語の表記統一ルール
- `docs/GLOSSARY.md` - プロジェクト固有の用語定義
- `docs/MIGRATIONS.md` - データベースマイグレーション運用ガイド
- `.github/skills/*/SKILL.md` - タスク別の詳細ガイド

### 記載すべきでないドキュメント

- **実装ログ**: コードが真実の情報源（Single Source of Truth）
- **未実装機能**: ドキュメント・コード乖離を生む
- **API リファレンスの重複**: 公式ドキュメントへリンクで十分
- **一時的な手順書**: READMEか `.env.example` で対応

### メンテナンス原則

1. **コード・ドキュメント同期**: 機能追加時にドキュメントも同じPRで更新
2. **Single Source of Truth**: 同じ情報を複数箇所に記載しない
3. **定期的な見直し**: 四半期ごとにドキュメント妥当性を確認
4. **簡潔さ**: 必要最小限の情報のみ記載
