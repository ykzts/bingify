# GLOSSARY (用語集)

このドキュメントは、Bingifyプロジェクトにおける主要な用語を定義し、AI開発およびチーム開発における認識齟齬を防ぐことを目的としています。

## 運用ルール

- AI (Cursor/Copilot) にコードを書かせる際は、可能な限りこのファイルをコンテキスト (`@docs/GLOSSARY.md`) に含めるか、参照させるようにしてください。
- 新しい概念が登場した際は、随時このファイルを更新してください。
- 用語の定義は、コード上の命名と一致させることを心がけてください。
- **日本語・英語の表記ルールについては [STYLE_GUIDE.md](STYLE_GUIDE.md) を参照してください。**

## UI表示における用語統一ルール

アプリケーション全体で一貫した用語を使用するため、以下の対訳表に従ってください。

| 英語 (Code/Key)        | 日本語 (UI Display)                        | 備考                                                                                               |
| :--------------------- | :----------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Share Key**          | **共有キー**                               | ❌ シェアキー, ❌ スラッグ, ❌ Share key (日本語環境下)<br>内部実装: `shareKey` / `share_key`      |
| **Space**              | **スペース**                               | ❌ ルーム, ❌ 会場                                                                                 |
| **Dashboard**          | **ダッシュボード**                         | ❌ 管理画面 (ダッシュボードの文脈で)<br>例外: AdminSpace.headingなど一部で「ダッシュボード」を使用 |
| **Host / Owner**       | **ホスト** または **所有者**               | スペースの文脈では「ホスト」、技術的な文脈では「所有者」                                           |
| **Participant**        | **参加者**                                 | ❌ ゲスト, ❌ ユーザー (参加者の文脈で)                                                            |
| **Join**               | **参加する**                               | ❌ 入室する                                                                                        |
| **Sign in / Sign out** | **ログイン / ログアウト**                  | ❌ サインイン, ❌ サインアウト<br>英語は "Sign in/Sign out" (動詞形) を使用                        |
| **View Token**         | **閲覧トークン**                           | 画面表示用の認証トークン                                                                           |
| **Gatekeeper**         | **ゲートキーパー** または **アクセス制御** | 参加条件設定機能                                                                                   |
| **Admin**              | **管理者**                                 | サイト管理者を指す場合                                                                             |

**重要**:

- 内部実装 (変数名、関数名、DBカラム名、スキーマフィールド等) では `shareKey` や `share_key` を使用
- ユーザーの目に触れる翻訳ファイル (`ja.json`) やUIコンポーネントのラベルでは必ず上記の日本語表記を使用すること
- 特に「共有キー」の内部実装では `slug` は使用せず、`shareKey` または `share_key` に統一すること

---

## 1. ロール・権限定義

Bingifyは**Supabase Authを利用したユーザー認証・ロール管理システム**を実装しています。OAuth (Google、Twitch) によるログインが必須であり、認証されたユーザーのみがスペースの作成や管理を行うことができます。

### 1.1 Site Admin (サイト管理者)

- **定義**: プラットフォーム全体を管理する権限を持つユーザー
- **権限範囲**: 全スペースの閲覧・削除、ユーザー管理、システム設定の変更
- **英語**: Site Admin
- **日本語**: サイト管理者
- **コード上の命名**: `role='admin'` in `profiles` table
- **アクセス**: `/admin/*` routes (middlewareで保護)

### 1.2 Space Owner (スペース所有者)

- **定義**: スペースを作成したユーザー。ビンゴの抽選を実行し、スペースを管理する
- **権限範囲**: 自分のスペースの管理 (設定変更、削除、抽選実行)
- **英語**: Space Owner
- **日本語**: スペース所有者
- **コード上の命名**: `owner_id` in `spaces` table
- **備考**: 認証が必須。`/dashboard/spaces/[id]` へのアクセスには認証が必要で、所有者のみが自分のスペースを管理可能

### 1.3 Participant (参加者)

- **定義**: ビンゴに参加し、カードを持つユーザー
- **権限範囲**: 自分のカードの閲覧、リアルタイム同期の受信
- **英語**: Participant
- **日本語**: 参加者
- **コード上の命名**: `participants` table
- **備考**: `/@<share_key>` または `/spaces/[id]` へのアクセスには認証が必須

### 1.4 Guest (ゲスト)

- **定義**: 閲覧のみ可能な、認証不要でアクセス可能なユーザー
- **権限範囲**: スペースの閲覧のみ（表示専用画面）
- **英語**: Guest
- **日本語**: ゲスト
- **実装**: 閲覧トークンにより認証なしアクセスを提供
- **備考**: ストリーミング配信などで利用される表示専用画面

---

## 2. ドメイン用語

### 2.1 Space (スペース)

- **定義**: ビンゴ大会を開催するための仮想的な「会場」。各スペースは独立したビンゴセッションを持つ
- **英語**: Space
- **日本語**: スペース
- **コード上の命名**:
- データベーステーブル: `spaces`
- 型定義: `Space` (未明示的定義)
- ルートパラメータ: `[id]`
- **関連用語**: Share Key, Space ID

### 2.2 Share Key (共有キー)

- **定義**: スペースを一意に識別するための人間が読める文字列。URLに含まれ、外部に共有される
- **英語**: Share Key
- **日本語**: 共有キー
- **コード上の命名**:
- データベースカラム: `spaces.share_key`
- フォームフィールド: `shareKey`
- Zodスキーマ: `spaceSchema.shareKey`
- 変数名: `shareKey`
- 関数名: `checkShareKeyAvailability ()`, `findAvailableShareKey ()`
- **形式**: `<user-input>-<YYYYMMDD>` (例: `my-party-20251224`)
- **制約**: 小文字の英数字とハイフンのみ、3〜30文字
- **UI表示ルール**:
  - ✅ 正しい表記:「共有キー」
  - ❌ 使用禁止:「シェアキー」「スラッグ」「slug」「Share key」(日本語環境下)
- コード内部 (変数名、関数名、DBカラム名、スキーマ) では `shareKey` または `share_key` を使用
- ユーザーの目に触れる翻訳ファイルやUIラベルでは必ず「共有キー」を使用すること
- **備考**: 将来的に日付サフィックスは有料オプションなどで省略可能となる可能性がある

### 2.3 Space ID

- **定義**: スペースを一意に識別するためのUUID。内部的なルーティングやデータベースの主キーとして使用される
- **英語**: Space ID
- **日本語**: スペースID
- **コード上の命名**:
- データベースカラム: `spaces.id`
- ルートパラメータ: `[id]`
- **形式**: UUID v4
- **例**: `550e8400-e29b-41d4-a716-446655440000`

### 2.4 Bingo Card (ビンゴカード)

- **定義**: 参加者が持つビンゴの数字カード
- **英語**: Bingo Card
- **日本語**: ビンゴカード
- **コード上の命名**:
- データベーステーブル: `bingo_cards`
- 型定義: `BingoCard` (未明示的定義)
- **関連フィールド**: `space_id`, `user_id`, `numbers`

### 2.5 Called Numbers (抽選済み番号)

- **定義**: ビンゴで既に抽選された番号
- **英語**: Called Numbers
- **日本語**: 抽選済み番号 / コール済み番号
- **コード上の命名**:
- データベーステーブル: `called_numbers`
- 型定義: `CalledNumber` (未明示的定義)
- **関連フィールド**: `space_id`, `value`, `called_at`

### 2.6 View Token (閲覧トークン)

- **定義**: 特定のスペースを認証なしで閲覧するための認証トークン
- **英語**: View Token
- **日本語**: 閲覧トークン
- **実装状況**: 実装済み（`spaces.view_token`）
- **形式**: 高エントロピーの安全なトークン（256-bit）
- **用途**: 表示専用画面、限定公開スペースへのアクセス
- **再生成**: スペース所有者により随時再生成可能

### 2.7 Gatekeeper (ゲートキーパー)

- **定義**: スペース参加時のアクセス制御機能
- **英語**: Gatekeeper
- **日本語**: ゲートキーパー
- **実装タイプ**:
  - `none`: 制限なし
  - `email`: メールアドレスまたはドメインによる許可リスト（例: `user@example.com`, `@example.com`, `example.com`）
  - `social`: ソーシャルプラットフォーム連携
    - YouTube: 購読者（subscriber）またはメンバー（member）
    - Twitch: フォロワー（follower）または購読者（subscriber）
- **管理**: スペース所有者のみ設定・変更可能（管理者は変更不可）

---

## 3. 技術用語

### 3.1 Realtime Sync (リアルタイム同期)

- **定義**: Supabase Realtimeを使用して、複数のクライアント間でデータをリアルタイムに同期する仕組み
- **英語**: Realtime Sync / Real-time Synchronization
- **日本語**: リアルタイム同期
- **コード上の命名**:
- Supabase機能: `supabase_realtime` publication
- 対象テーブル: `spaces`, `bingo_cards`, `called_numbers`
- **用途**: 抽選番号の同期、カードの更新など

### 3.2 Magic Link (マジックリンク)

- **定義**: パスワードなしでログインできる、メールで送信される一時的なリンク
- **英語**: Magic Link
- **日本語**: マジックリンク
- **有効期限**: 1時間
- **関連技術**: Supabase Auth（OTPベースのパスワードレス認証）
- **開発環境テスト**: メール受信環境で確認可能

### 3.3 Identity Linking (アイデンティティ連携)

- **定義**: 複数の認証プロバイダー (Google, Twitchなど) を同一ユーザーに紐付ける機能
- **英語**: Identity Linking
- **日本語**: アイデンティティ連携
- **実装場所**: ユーザー設定の接続管理ページ
- **対応プロバイダー**: Google, Twitch
- **制限**: 最低1つのプロバイダーを保持する必要がある（全削除不可）
- **関連技術**: Supabase Auth

### 3.4 Server Functions / Server Actions

- **定義**: Next.jsのServer Actions。サーバーサイドで実行される関数で、フォーム送信やデータ処理に使用される
- **英語**: Server Functions / Server Actions
- **日本語**: サーバー関数 / サーバーアクション
- **コード上の命名**:
- ファイルパス: `app/[locale]/dashboard/actions.ts`
- マーカー: `"use server"`
- 主要関数: `createSpace`, `checkSlugAvailability`
- **関連技術**: Zod, `useActionState`

### 3.5 Basic Auth (ベーシック認証)

- **定義**: HTTP Basic認証を使用した、サイト全体へのアクセス制御
- **英語**: Basic Auth / Basic Authentication
- **日本語**: ベーシック認証
- **コード上の命名**:
- ファイルパス: `lib/auth/basic-auth.ts`
- 関数: `checkBasicAuth`
- 環境変数: `ENABLE_BASIC_AUTH`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`
- **用途**: 公開前の制限、ステージング環境保護

### 3.6 Proxy (プロキシ)

- **定義**: Next.jsのProxy (旧Middleware)。リクエストを処理し、URL書き換えやアクセス制御を行う
- **英語**: Proxy
- **日本語**: プロキシ
- **コード上の命名**:
- ファイルパス: `lib/middleware/share-key.ts`
- 関数: `handleShareKeyRewrite`, `validateShareKey`
- **主要機能**:
- `/@<share_key>` → `/[locale]/spaces/[id]` への内部書き換え
- Share Keyのバリデーション
- **参考**: <https://nextjs.org/docs/app/api-reference/file-conventions/proxy>

### 3.7 Zod Schema (Zodスキーマ)

- **定義**: Zodライブラリを使用した、データバリデーションとTypeScript型推論のためのスキーマ定義
- **英語**: Zod Schema
- **日本語**: Zodスキーマ
- **コード上の命名**:
- ファイルパス: `lib/schemas/space.ts`
- スキーマ: `spaceSchema`
- 型推論: `z.infer<typeof spaceSchema>`
- **関連技術**: Server Functions, `useActionState`

---

## 4. URL / ルーティング

### 4.1 公開URL

- **形式**: `/@<share_key>`
- **例**: `/@my-party-20251224`
- **用途**: 参加者がビンゴカードを表示するための公開URL
- **内部動作**: Proxyで `/[locale]/spaces/[id]` に書き換え

### 4.2 内部URL

- **形式**: `/[locale]/spaces/[id]`
- **例**: `/ja/spaces/550e8400-e29b-41d4-a716-446655440000`
- **用途**: 実際のページコンポーネントへのルーティング

### 4.3 ダッシュボード (管理画面)URL

- **形式**: `/[locale]/dashboard/spaces/[id]`
- **例**: `/ja/dashboard/spaces/550e8400-e29b-41d4-a716-446655440000`
- **用途**: スペース管理、ビンゴ抽選実行

### 4.4 ダッシュボードURL

- **形式**: `/[locale]/dashboard`
- **例**: `/ja/dashboard`
- **用途**: スペース作成フォーム

---

## 5. データベーススキーマ

### 5.1 spacesテーブル

- **主キー**: `id` (UUID)
- **フィールド**:
- `share_key` (TEXT, UNIQUE): 共有キー
- `owner_id` (UUID): スペース所有者
- `status` (TEXT): ステータス
  - `draft`: 準備中（非公開・未公開）
  - `active`: 進行中（公開）
  - `closed`: 終了（閲覧のみ）- 手動終了と自動終了の両方を含む
- `view_token` (TEXT, UNIQUE): 認証不要アクセス用トークン
- `gatekeeper_rules` (JSONB): アクセス制御ルール（メール・YouTube・Twitch）
- `settings` (JSONB): スペース設定
- `title`, `description`: スペースメタデータ
- `created_at`, `updated_at` (TIMESTAMP)

**ライフサイクル**:

1. アクティブ期間: `active` ステータスで運用
2. 自動終了: 作成から一定期間後に `closed` に自動変更（管理画面の設定で期間変更可）
3. アーカイブ移動: `closed` スペースは一定期間（デフォルト168時間 = 7日）経過後に `spaces_archive` に移動
4. 完全削除: `spaces_archive` のレコードは一定期間（デフォルト2160時間 = 90日）経過後に完全削除（いずれも管理者設定で変更可能）

### 5.2 bingo_cardsテーブル

- **主キー**: `id` (UUID)
- **外部キー**: `space_id` → `spaces.id`
- **フィールド**:
- `user_id` (TEXT): ユーザー識別子
- `numbers` (JSONB): ビンゴカードの数字配列
- `created_at` (TIMESTAMP)

### 5.3 called_numbersテーブル

- **主キー**: `id` (UUID)
- **外部キー**: `space_id` → `spaces.id`
- **フィールド**:
- `value` (INTEGER): 抽選された番号
- `called_at` (TIMESTAMP): 抽選日時

---

## 6. 環境変数

### 6.1 Supabase 接続

- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseサービスロールキー

### 6.2 アプリケーション設定

- `NEXT_PUBLIC_SITE_URL`: サイトURL (例: `http://localhost:3000`)

### 6.3 アクセス制御

- `ENABLE_BASIC_AUTH`: Basic認証の有効化フラグ (`true` / `false`)
- `BASIC_AUTH_USER`: Basic認証のユーザー名
- `BASIC_AUTH_PASSWORD`: Basic認証のパスワード

### 6.4 定期ジョブ

- `CRON_SECRET`: Vercel Cronジョブの認証用シークレット (必須)
- 定期的なクリーンアップジョブの実行を認証するために使用されます

**アーカイブ保持期間の設定:**

- `archive_retention_hours` と `spaces_archive_retention_hours` は `system_settings` テーブルに保存され、管理画面から設定可能です
- `archive_retention_hours` (デフォルト: 168時間 = 7日): `closed` ステータスのスペースがこの期間経過後に自動削除され `spaces_archive` テーブルに移動します
- `spaces_archive_retention_hours` (デフォルト: 2160時間 = 90日): `spaces_archive` テーブル内のレコードがこの期間経過後に完全削除されます

---

## 7. 開発用語

### 7.1 pnpm

- **定義**: プロジェクトで使用するパッケージマネージャー
- **用途**: 依存関係のインストール、スクリプト実行

### 7.2 Tailwind CSS

- **定義**: ユーティリティファーストCSSフレームワーク
- **設定**: CSS-first構成 (`tailwind.config.ts` 不要)

### 7.3 next-intl

- **定義**: Next.jsの国際化 (i18n) ライブラリ
- **言語**: `ja`, `en`
- **メッセージファイル**: `messages/ja.json`, `messages/en.json`

### 7.4 Supabase

- **定義**: オープンソースのFirebase代替サービス
- **用途**: データベース (PostgreSQL)、リアルタイム同期、認証 (将来実装予定)

### 7.5 Conventional Commits

- **定義**: コミットメッセージの規約
- **形式**: `type (scope): subject`
- **例**: `feat (dashboard): add space creation form`

---

## 8. 更新履歴

| 日付       | 変更内容                                                                  | 変更者         |
| ---------- | ------------------------------------------------------------------------- | -------------- |
| 2025-12-30 | 内部実装を `slug` から `shareKey` に統一、Dashboard表記を統一、用語を追加 | GitHub Copilot |
| 2025-12-30 | UI表示における用語統一ルールを追加、Share Keyの定義を明確化               | GitHub Copilot |
| 2025-12-26 | 初版作成                                                                  | GitHub Copilot |

---

## 9. 参考資料

- [README.md](../README.md): プロジェクト概要、セットアップ手順
- [AGENTS.md](../AGENTS.md): AI開発者向けガイドライン
- [CONTRIBUTING.md](../CONTRIBUTING.md): コーディング指針、PR作成ルール
- [STYLE_GUIDE.md](STYLE_GUIDE.md): 日本語・英語表記の統一ルール
