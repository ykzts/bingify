# AGENTS

AIエージェント向けプロジェクトガイド。詳細な技術情報は各ドキュメントを参照してください。

## WHAT（プロジェクト構成）

- **Framework**: Next.js + App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **UI Components**: shadcn/ui (`@/components/ui`) + custom components (`@/components`)
- **Backend**: Supabase (Auth, Database)
- **Package Manager**: pnpm
- **Testing**: Vitest
- **i18n**: next-intl (en, ja)

## WHY（設計方針）

- **AppRouter 優先**: Next.jsの最新パターンに従う
- **Server Actions**: フォーム処理・データ操作はサーバーサイド
- **型安全性**: TypeScript + Zodスキーマから型推論
- **UI 一貫性**: shadcn/uiでブランドカラー（Purple）統一
- **多言語対応**: メッセージ管理は `messages/en.json`, `messages/ja.json`

## HOW（開発コマンド）

```bash
pnpm install           # 依存パッケージインストール
pnpm local:setup       # Supabase + DB初期化
pnpm dev               # 開発サーバー起動（localhost:3000）
pnpm build             # 本番ビルド
pnpm check             # Lint + Format（Biome）
pnpm type-check        # TypeScript 型チェック
pnpm test              # テスト実行
pnpm format:docs       # Markdown フォーマット
```

## プロジェクト構造

- `app/[locale]/` - ページ・レイアウト（i18n対応）
- `components/` - カスタムコンポーネント
- `components/ui/` - shadcn/uiコンポーネント（自動生成）
- `lib/` - ユーティリティ・API・スキーマ
- `lib/supabase/` - Supabaseクライアント
- `lib/middleware/` - 認証・ルーティングミドルウェア
- `messages/` - i18nメッセージ
- `docs/` - ドキュメント

## 詳細ドキュメント

段階的開示：タスクに応じて以下を参照してください。

### 認証・セッション管理

→ `.github/skills/authentication/SKILL.md`

### 開発環境・コード規約

→ `.github/skills/development/SKILL.md`

### フォームバリデーション (Zod + TanStack Form)

→ `.github/skills/form-validation/SKILL.md`

### GitHub ワークフロー・Conventional Commits

→ `.github/skills/github-workflow/SKILL.md`

### 国際化 (i18n) & メッセージ管理

→ `.github/skills/internationalization/SKILL.md`

### ローカルメールテスト

→ `.github/skills/mailpit-testing/SKILL.md`

### Supabase セットアップ・マイグレーション

→ `.github/skills/supabase-setup/SKILL.md`

### テスト・コード品質

→ `.github/skills/testing/SKILL.md`

### React ベストプラクティス

→ `.github/skills/vercel-react-best-practices/SKILL.md`

### 表記ルール（日本語・英語）

→ `docs/STYLE_GUIDE.md`

### 用語定義

→ `docs/GLOSSARY.md`

### コミット規約・貢献ガイドライン

→ `CONTRIBUTING.md`

## 実行ポリシー（エージェント必須）

- **新規パッケージ**: npm registry確認 → `pnpm add <pkg>@latest`
- **ライブラリ ドキュメント**: Context7 MCPを自動的に使用
- **リンター**: 自動ツール (Biome) に任せる。LLMにStyle Guideを判定させない
- **自動生成**: AGENTS.mdは手動作成。`/init` コマンド不使用

## File-scoped コマンド優先

型チェック・フォーマット・テストは **ファイル単位** で実行：

```bash
# 単一ファイルの型チェック
pnpm type-check path/to/file.tsx

# 単一ファイルのフォーマット
pnpm format path/to/file.tsx

# 単一ファイルのテスト
pnpm test path/to/file.test.ts
```

プロジェクト全体ビルドは明示的に指示された場合のみ。
