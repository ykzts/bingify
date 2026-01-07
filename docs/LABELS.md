# GitHub ラベル管理

Bingify では GitHub Issue / Pull Request のラベルをコードとして管理しています。

## 概要

ラベル定義をコード管理することで、以下のメリットが得られます：

- **バージョン管理**: ラベルの追加・変更・削除履歴を Git で追跡
- **一貫性**: すべてのラベルが定義ファイルに基づいて同期される
- **レビュー可能**: ラベル変更を Pull Request でレビュー
- **自動同期**: 定義ファイルの更新時に GitHub へ自動反映

## ファイル構成

```
.github/
├── labels.json          # ラベル定義ファイル
└── workflows/
    └── sync-labels.yml  # 自動同期ワークフロー
scripts/
├── sync-labels.ts       # ラベル同期スクリプト
└── sync-labels.test.ts  # テストファイル
```

## ラベル定義ファイル

`.github/labels.json` にすべてのラベルを定義します：

```json
[
  {
    "name": "bug",
    "color": "d73a4a",
    "description": "Something isn't working"
  },
  {
    "name": "enhancement",
    "color": "a2eeef",
    "description": "New feature or request"
  }
]
```

### フィールド

- **name** (必須): ラベル名
- **color** (必須): 6桁の16進数カラーコード（`#` は不要）
- **description** (任意): ラベルの説明

### ルール

- ラベル名は**アルファベット順**にソートすること
- 色コードは小文字で統一すること
- ラベル名は重複不可

## ラベルの変更手順

### 1. ローカルでラベル定義を編集

`.github/labels.json` を編集します：

```bash
# ファイルを編集
vim .github/labels.json
```

### 2. テストを実行

変更内容が正しいか確認します：

```bash
pnpm test scripts/sync-labels.test.ts
```

### 3. Pull Request を作成

変更を commit して PR を作成します：

```bash
git add .github/labels.json
git commit -m "chore(labels): add new label"
git push origin feature/update-labels
```

### 4. 自動同期

PR が `main` ブランチにマージされると、GitHub Actions が自動的にラベルを同期します。

## 手動同期

ローカル環境から手動でラベルを同期することも可能です：

```bash
# GitHub CLI (gh) が必要
# https://cli.github.com/

# ラベルを同期
GH_TOKEN=<your_token> pnpm labels:sync
```

**必要な権限:**

- `issues:write` — ラベルの作成・更新・削除権限

## GitHub Actions ワークフロー

`.github/workflows/sync-labels.yml` が自動同期を実行します。

### トリガー条件

- `main` ブランチへのプッシュ
- `.github/labels.json` または `.github/workflows/sync-labels.yml` の変更
- 手動実行 (workflow_dispatch)

### 手動実行手順

1. GitHub リポジトリの **Actions** タブを開く
2. **Sync Labels** ワークフローを選択
3. **Run workflow** をクリック

## トラブルシューティング

### エラー: "GitHub CLI is not installed"

GitHub CLI がインストールされていません。以下からインストールしてください：

https://cli.github.com/

### エラー: "gh auth login required"

GitHub CLI の認証が必要です：

```bash
gh auth login
```

または、環境変数で Personal Access Token を設定：

```bash
export GH_TOKEN=<your_token>
```

### エラー: "Label already exists"

ラベルが既に存在する場合、自動的に更新されます。エラーの場合は：

1. 既存ラベルを確認: `gh label list`
2. 手動で削除: `gh label delete "<label_name>"`
3. 再度同期スクリプトを実行

### テストが失敗する

テストエラーの内容を確認して、`.github/labels.json` を修正してください：

```bash
pnpm test scripts/sync-labels.test.ts
```

よくあるエラー：

- ラベル名がアルファベット順でない
- 色コードが無効（6桁の16進数ではない）
- ラベル名が重複している
- 必須フィールド（name, color）が欠けている

## スクリプト詳細

### `scripts/sync-labels.ts`

ラベル同期スクリプトの主な機能：

1. `.github/labels.json` からラベル定義を読み込み
2. GitHub リポジトリから既存ラベルを取得
3. 差分を検出して以下の操作を実行：
   - **作成**: 定義ファイルにあり、GitHub に存在しないラベル
   - **更新**: 色または説明が異なるラベル
   - **削除**: GitHub に存在するが、定義ファイルにないラベル

### `scripts/sync-labels.test.ts`

ラベル定義の妥当性を検証するテスト：

- ファイルの存在確認
- JSON 形式の検証
- 必須フィールドの確認
- カラーコードの形式検証
- 重複チェック
- アルファベット順のソート確認

## 参考リンク

- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [GitHub Labels API](https://docs.github.com/en/rest/issues/labels)
- [Managing labels - GitHub Docs](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels)
