# textlint の使用方法

このプロジェクトでは、日本語ドキュメントの品質を維持するためにtextlintを使用しています。

## 概要

textlintは、マークダウンやテキストファイルの文章をチェックするツールです。このプロジェクトでは、[STYLE_GUIDE.md](./STYLE_GUIDE.md) で定義されたルールに基づいて、ドキュメントを自動的にチェックします。

## コマンド

### ドキュメントのチェック

```bash
pnpm lint:docs
```

すべてのMarkdownファイルをチェックします。

### 自動修正

```bash
pnpm lint:docs:fix
```

自動修正可能な問題を修正します。

### 特定のファイルのみチェック

```bash
pnpm textlint path/to/file.md
```

### 特定のファイルを自動修正

```bash
pnpm textlint --fix path/to/file.md
```

## チェックされるルール

### スタイルルール

- **半角括弧の使用**: 全角括弧 `（）` ではなく半角括弧 `()` を使用
- **スペースの削除**: アルファベットと日本語の間にスペースを入れない
- **カタカナ長音符**: 語末の -er/-or/-arには長音符「ー」をつける
  - 例: サーバー、ユーザー、ブラウザー、コンピューター

### 技術用語の統一

技術用語は大文字小文字を含めて正確に表記します:

- GitHub, Google, Next.js, Node.js, OAuth
- PostgreSQL, React, Supabase, Tailwind CSS
- Twitch, YouTube

### 文章品質

- **文の長さ**: 1文150文字以内を推奨
- **コンマの数**: 1文に4個までを推奨
- **連続する助詞**: 同じ助詞の連続使用を避ける
- **冗長な表現**:「〜を行う」「〜できる」などの冗長表現を避ける

## 自動修正されるルール

以下のルールは `pnpm lint:docs:fix` で自動修正されます:

- ✅ 半角括弧と全角文字の間の不要なスペース削除
- ✅ カタカナ長音符の統一
- ✅ 技術用語の表記統一

## 自動修正されないルール

以下のルールは警告のみで、手動での修正が必要です:

- ⚠️ 長すぎる文（150文字超）
- ⚠️ コンマが多い文（4個超）
- ⚠️ 連続する助詞
- ⚠️ 冗長な表現

## CI/CD

GitHub ActionsでPR作成時に自動的にチェックされます。エラーがある場合はCIが失敗します。

## 除外されるファイル

以下のファイルはtextlintのチェック対象外です（`.textlintignore` で定義）:

- `node_modules/`
- `.github/skills/` (AIエージェント用ドキュメント)
- `types/` (自動生成ファイル)
- ビルド成果物やログファイル

## 設定ファイル

- `.textlintrc.json`: textlintのルール設定
- `prh.yml`: 表記ゆれ辞書
- `.textlintignore`: チェック対象外ファイルの指定

## トラブルシューティング

### エラーが多すぎる場合

一度に修正せず、以下の手順で段階的に対応することを推奨します:

1. 自動修正: `pnpm lint:docs:fix`
2. 残ったエラーを確認: `pnpm lint:docs`
3. 重要度の高いエラーから手動で修正

### 特定のルールを無効化したい場合

コメントでルールを無効化できます:

```markdown
<!-- textlint-disable -->
この部分はチェックされません
<!-- textlint-enable -->
```

特定のルールのみ無効化:

```markdown
<!-- textlint-disable ja-technical-writing/sentence-length -->
長い文章でもエラーになりません
<!-- textlint-enable ja-technical-writing/sentence-length -->
```

## 参考

- [textlint 公式ドキュメント](https://textlint.github.io/)
- [textlint-rule-preset-ja-technical-writing](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing)
- [プロジェクトのスタイルガイド](./STYLE_GUIDE.md)
