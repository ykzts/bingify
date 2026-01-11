# スタイルガイド (Style Guide)

このドキュメントは、Bingifyプロジェクトにおける日本語および英語の表記統一ルールを定義します。

## 目的

- コードベース全体で一貫したスタイルを維持する
- AI開発者や人間の開発者が参照できる明確な基準を提供する
- ユーザー体験の向上とプロフェッショナルな印象を保つ

---

## 日本語スタイルルール

### 1. 括弧の統一

**ルール:** 半角括弧 `()` を使用する

**適用箇所:**

- メッセージファイル (`messages/ja.json`)
- MDXコンテンツ (`content/ja/*.mdx`)
- ドキュメント (`docs/*.md`, `README.md`)

**詳細:**

- 全角括弧 `（）` は使用しない
- 括弧の前に他の括弧や句読点がない場合、半角空白を入れる
- 括弧の後ろに他の括弧や句読点がない場合、半角空白を入れる
- 括弧内の文字と括弧の間には空白を入れない
- **句読点の直後に括弧が出現するパターンは避ける**（文を調整して括弧を別の位置に配置する）

**例:**

| ❌ 誤り                        | ✅ 正しい                       |
| ------------------------------ | ------------------------------- |
| （例）                         | (例)                            |
| 「Cookie」                     | (Cookie)                        |
| （ 必須 ）                     | (必須)                          |
| Cookie（クッキー）             | Cookie (クッキー)               |
| 運営者 (以下「運営者」)は      | 運営者 (以下「運営者」) は      |
| 情報 (メールアドレス等)です    | 情報 (メールアドレス等) です    |
| 元に戻せません。(保存されます) | 元に戻せません (保存されます)。 |

**根拠:**

- 技術文書では半角括弧が標準的
- コード内の括弧との視覚的統一感
- 現代的なウェブコンテンツの慣例

---

### 2. アルファベットの前後の空白

**ルール:** アルファベットの前後に空白を入れない

**適用箇所:**

- メッセージファイル
- MDXコンテンツ
- ドキュメント

**詳細:**

- アルファベット単語と日本語の間に空白を入れない
- 助詞「の」「が」「を」「は」などの前も含めて空白を削除
- 例外: 文の区切りとして明確に必要な場合のみ空白を許可

**例:**

| ❌ 誤り            | ✅ 正しい         |
| ------------------ | ----------------- |
| GitHub アカウント  | GitHubアカウント  |
| Twitch のOAuth     | TwitchのOAuth     |
| API を使用         | APIを使用         |
| YouTube チャンネル | YouTubeチャンネル |
| Supabase に接続    | Supabaseに接続    |

**根拠:**

- 日本語と英語の混在時の視覚的な統一感
- 現代的な日本語の表記慣例
- ウェブサイトやアプリケーションでの一般的な表記

---

### 3. 外来語の取り扱い

#### 3.1 アルファベットのまま表記する用語

**カテゴリ:**

- **組織名・サービス名:** GitHub, Supabase, Twitch, Google, YouTube, Facebook
- **技術名・ブランド:** React, Next.js, OAuth, API, Cookie (HTTPクッキーとして), Node.js, PostgreSQL
- **業界標準の略語:** URL, HTTP, JSON, UUID, SQL, RLS, JWT

**理由:**

- 技術文書としての明確性
- 国際的な統一性
- 公式な表記との一致

**例:**

| 用途             | 表記                         |
| ---------------- | ---------------------------- |
| 認証プロバイダー | Google, Twitch, GitHub       |
| データベース     | Supabase, PostgreSQL         |
| 技術スタック     | React, Next.js, Tailwind CSS |
| 認証方式         | OAuth, JWT                   |
| データ形式       | JSON, UUID                   |

#### 3.2 カタカナに変換する用語

**カテゴリ:**

- **一般概念:** User → ユーザー, Server → サーバー, Browser → ブラウザー
- **動作・状態:** Error → エラー, Loading → 読み込み中, Processing → 処理中
- **UI要素:** Button → ボタン, Form → フォーム, Link → リンク
- **役割・権限:** Admin → 管理者, Organizer → 主催者, Participant → 参加者

**理由:**

- 一般ユーザーの理解しやすさ
- 日本語としての自然さ
- 技術的な文脈ではない場合の可読性

**例:**

| 英語                  | 日本語               |
| --------------------- | -------------------- |
| User                  | ユーザー             |
| Server                | サーバー             |
| Browser               | ブラウザー           |
| Error                 | エラー               |
| Computer              | コンピューター       |
| Provider              | プロバイダー         |
| Privacy Policy        | プライバシーポリシー |
| Cookie (一般的な意味) | クッキー             |

---

### 4. カタカナの長音符

**ルール:** 語末の -er/-or/-ar には長音符「ー」をつける

**根拠:** 内閣告示「外来語の表記」に準拠

**適用対象:**

- コンピューター/ハードウェア用語
- 一般的な外来語

**詳細:**

- 3音以上の語で語末が -er/-or/-ar で終わる場合、長音符をつける
- 2音以下の語や慣用的に長音符なしで定着している語は例外とする
- 一般的な表現から大きくずれないよう配慮

**例:**

| ❌ 誤り      | ✅ 正しい      |
| ------------ | -------------- |
| ユーザ       | ユーザー       |
| サーバ       | サーバー       |
| エラー       | エラー         |
| ブラウザ     | ブラウザー     |
| コンピュータ | コンピューター |
| プロバイダ   | プロバイダー   |
| メンバー     | メンバー       |

**例外 (長音符なし):**

- 2音以下: カー, バー (これらは通常そのまま)
- 慣用表現: ページ, イメージ (これらは慣例的に長音符なし)

**参考:** [内閣告示第二号「外来語の表記」](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/gairai/index.html)

---

### 5. 漢字の使用範囲

**ルール:** 常用漢字及び人名用漢字の範囲に留める

**詳細:**

- 常用漢字表に掲載されていない漢字は使用しない
- ひらがなにした方が違和感のある場合は例外とする
- 専門用語で一般的に漢字表記される場合は例外とする

**例:**

| 場合         | 表記                 |
| ------------ | -------------------- |
| 一般的な文章 | 常用漢字を使用       |
| 固有名詞     | 元の表記を尊重       |
| 専門用語     | 業界標準の表記を使用 |

**参考:** [常用漢字表](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/kanji/index.html)

---

## 英語スタイルルール

### 1. シリアルコンマ (Oxford Comma)

**ルール:** リスト内の項目を区切る際は Oxford comma を使用する

**定義:** 3つ以上の項目を列挙する際、最後の接続詞 (and/or) の前にコンマを入れる

**例:**

| ❌ 誤り                    | ✅ 正しい                   |
| -------------------------- | --------------------------- |
| spaces, users and settings | spaces, users, and settings |
| Google, Twitch or GitHub   | Google, Twitch, or GitHub   |

**適用箇所:**

- メッセージファイル
- MDXコンテンツ
- ドキュメント

**理由:**

- 曖昧さの排除
- 技術文書での明確性
- Microsoft/Google スタイルガイドとの一致

---

### 2. 見出しの大文字表記

**ルール:** 技術ドキュメントでは sentence case を使用する

**Sentence case の定義:**

- 文の最初の単語のみ大文字
- 固有名詞は常に大文字
- 略語は大文字を保持

**例:**

| Title Case (使用しない)   | Sentence Case (使用する)  |
| ------------------------- | ------------------------- |
| Create New Space          | Create new space          |
| User Management Dashboard | User management dashboard |
| Configure OAuth Settings  | Configure OAuth settings  |

**例外:**

- ブランド名: GitHub, Supabase (常に大文字)
- 略語: API, OAuth, URL (常に大文字)

**適用箇所:**

- ページタイトル
- セクション見出し
- ボタンラベル

**理由:**

- 現代的なウェブUIの慣例
- 読みやすさの向上
- Microsoft/Google スタイルガイドの推奨

---

### 3. 短縮形

**ルール:**

- **ユーザー向けメッセージ:** 短縮形を許可 (自然な口調のため)
- **法的文書・正式な内容:** 完全形を使用

**例:**

| 文脈                 | 短縮形                      | 完全形       |
| -------------------- | --------------------------- | ------------ |
| エラーメッセージ     | You can't access this space | (短縮形OK)   |
| ボタンラベル         | Don't have an account?      | (短縮形OK)   |
| 利用規約             | The Service shall not...    | (完全形のみ) |
| プライバシーポリシー | We will not share...        | (完全形のみ) |

**一般的な短縮形:**

- can't (cannot)
- don't (do not)
- won't (will not)
- isn't (is not)
- you're (you are)
- we're (we are)

**適用箇所:**

- メッセージファイル: 短縮形OK
- MDXコンテンツ (利用規約・プライバシーポリシー): 完全形のみ
- ドキュメント: 短縮形OK

---

### 4. リストの句読点

**ルール:**

- **完全な文:** ピリオドをつける
- **断片やラベル:** 句読点を省略

**例:**

**完全な文のリスト:**

```
1. The Service provides real-time bingo functionality.
2. Users can create and manage spaces.
3. OAuth authentication is required for participation.
```

**断片のリスト:**

```
- Space creation
- Real-time synchronization
- OAuth authentication
```

**適用箇所:**

- ドキュメント
- MDXコンテンツ
- メッセージファイル (エラーメッセージなど)

---

### 5. 一貫性

**ルール:**

- 並列構造を保つ
- 句読点スタイルを混在させない
- 同じ文脈では同じ表現を使用

**例:**

**❌ 誤り (並列構造が不一致):**

```
- Creating spaces
- Manage users
- OAuth authentication
```

**✅ 正しい (動詞の形を統一):**

```
- Create spaces
- Manage users
- Authenticate with OAuth
```

**❌ 誤り (句読点が混在):**

```
- Space creation.
- User management
- OAuth settings.
```

**✅ 正しい (句読点を統一):**

```
- Space creation
- User management
- OAuth settings
```

---

## 用語の統一

### 日本語UIにおける用語

GLOSSARY.mdの「UI表示における用語統一ルール」を参照してください。

主要な用語:

- Share Key → **共有キー**
- Space → **スペース**
- Dashboard → **ダッシュボード**
- Host/Owner → **ホスト** または **所有者**
- Participant → **参加者**
- Join → **参加する**
- Sign in/Sign out → **ログイン/ログアウト**

---

## 参考資料

### 日本語

- [内閣告示「外来語の表記」](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/gairai/index.html)
- [常用漢字表](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/kanji/index.html)
- [Microsoft 日本語スタイルガイド](https://www.microsoft.com/ja-jp/language/styleguides)

### 英語

- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/)
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [The Chicago Manual of Style](https://www.chicagomanualofstyle.org/) (Oxford comma に関して)

---

## 更新履歴

| 日付       | 変更内容 | 変更者         |
| ---------- | -------- | -------------- |
| 2026-01-11 | 初版作成 | GitHub Copilot |
