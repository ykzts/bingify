---
name: bingify-project-guide
description: Bingify開発プロジェクト固有の内部ガイド。必ず参照してください。詳細は references/ を参照。
metadata:
  author: Bingify
  version: "1.0"
---

# Bingify Project Guide

Bingifyプロジェクト固有の内部ガイドです。開発を行う際は **必ずこのスキルを参照してください。**

## クイックスタート

```bash
# 環境構築
pnpm install
pnpm local:setup
pnpm dev

# コード品質チェック
pnpm check       # Lint + Format
pnpm type-check  # TypeScript
pnpm test        # テスト
```

## プロジェクト概要

- **Framework**: Next.js + App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, Database)
- **Testing**: Vitest
- **i18n**: next-intl (en, ja)

## スキルセクション

詳細は references/ 内の各ドキュメントを参照：

### 参照ガイド

| ファイル | 参照タイミング | 内容 |
|---------|--------------|------|
| **authentication.md** | ログイン機能実装・認証周りのバグ | SupabaseAuth、マジックリンク、OAuth、ミドルウェア保護 |
| **code-conventions.md** | 日々のコーディング | TypeScriptパターン、shadcn/ui管理、ServerActions |
| **form-validation.md** | フォーム実装 | Zod+TanStackForm統一パターン、命名規則 |
| **github-workflow.md** | コミット・PR作成 | ConventionalCommits、ブランチ戦略、PRタイトル規約 |
| **internationalization.md** | 多言語対応・i18n実装 | next-intl設定、locale-basedrouting、メッセージ管理 |
| **mailpit-testing.md** | メール機能のテスト・確認 | MailpitUI アクセス、メール送信検証 |
| **supabase-setup.md** | DB初期化・マイグレーション・RLS | SupabaseCLIコマンド、migration管理、RLSポリシー |
| **testing.md** | ユニットテスト・コード品質 | Vitestパターン、テストファイル配置、Biome使用法 |
| **ci-cd.md** | CI/CD・GitHubActions・デプロイ | GitHubActions設定、ドキュメント編集、デプロイメント |
| **debugging.md** | バグ調査・デバッグ・ログ確認 | ローカル環境へのアクセス、デバッグツール、よくあるシナリオ |

## プロジェクト構造

```
app/[locale]/              # ページ・レイアウト（i18n対応）
components/                # カスタムコンポーネント
components/ui/             # shadcn/ui（自動生成）
lib/                       # ユーティリティ・API・スキーマ
messages/                  # i18nメッセージ
docs/                      # ドキュメント
```

## 外部スキル（汎用）

以下はプロジェクト外からインストールされた汎用スキルです：

- **Supabase Postgres ベストプラクティス** - `.github/skills/supabase-postgres-best-practices/SKILL.md`
- **React ベストプラクティス** - `.github/skills/vercel-react-best-practices/SKILL.md`
- **ウェブデザインガイドライン** - `.github/skills/web-design-guidelines/SKILL.md`

## 関連ドキュメント

- [AGENTS.md](../../../AGENTS.md) - 開発ガイドライン全体
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) - 貢献ガイドライン
- [docs/STYLE_GUIDE.md](../../../docs/STYLE_GUIDE.md) - 表記ルール
- [docs/GLOSSARY.md](../../../docs/GLOSSARY.md) - 用語定義
