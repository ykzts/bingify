# GitHub ラベル管理

Bingify では GitHub Issue / Pull Request のラベルをコードとして管理しています。

## 概要

ラベル定義をコード管理することで、以下のメリットが得られます：

- **バージョン管理**: ラベルの追加・変更・削除履歴を Git で追跡
- **一貫性**: すべてのラベルが定義ファイルに基づいて同期される
- **レビュー可能**: ラベル変更を Pull Request でレビュー
- **自動同期**: 定義ファイルの更新時に GitHub へ自動反映

## 実装

[ghaction-github-labeler](https://github.com/crazy-max/ghaction-github-labeler) を使用しています。

### ファイル構成

```
.github/
├── labels.yml               # ラベル定義ファイル
└── workflows/
    └── sync-labels.yml      # 自動同期ワークフロー
```

## ラベル定義ファイル

`.github/labels.yml` にすべてのラベルを YAML 形式で定義します：

```yaml
- name: "type: bug"
  color: "d73a4a"
  description: "バグの報告"

- name: "priority: high"
  color: "d93f0b"
  description: "優先度が高い問題"
```

### フィールド

- **name** (必須): ラベル名
- **color** (必須): 6桁の16進数カラーコード（`#` は不要）
- **description** (任意): ラベルの説明

### ラベル体系

Issue #337 で定義されたラベル体系に基づいています：

#### 🏷️ タイプラベル (`type:`)

| ラベル名 | 色 | 説明 |
|---------|-----|------|
| `type: bug` | `#d73a4a` | バグの報告 |
| `type: feature` | `#0e8a16` | 新機能の提案 |
| `type: enhancement` | `#a2eeef` | 既存機能の改善 |
| `type: documentation` | `#0075ca` | ドキュメントの改善 |
| `type: refactoring` | `#5319e7` | コードのリファクタリング |
| `type: performance` | `#ff6b6b` | パフォーマンスの改善 |
| `type: security` | `#ee0701` | セキュリティ関連の問題 |
| `type: test` | `#bfd4f2` | テストの追加・修正 |

#### 🎯 優先度ラベル (`priority:`)

| ラベル名 | 色 | 説明 |
|---------|-----|------|
| `priority: critical` | `#b60205` | 緊急対応が必要な問題 |
| `priority: high` | `#d93f0b` | 優先度が高い問題 |
| `priority: medium` | `#fbca04` | 中程度の優先度 |
| `priority: low` | `#0e8a16` | 優先度が低い問題 |

#### 📊 ステータスラベル (`status:`)

| ラベル名 | 色 | 説明 |
|---------|-----|------|
| `status: in progress` | `#1d76db` | 作業中 |
| `status: blocked` | `#d73a4a` | 進行がブロックされている |
| `status: needs review` | `#6f42c1` | レビュー待ち |
| `status: on hold` | `#7f8c8d` | 保留中 |

#### 🔍 作業範囲ラベル (`scope:`)

| ラベル名 | 色 | 説明 |
|---------|-----|------|
| `scope: frontend` | `#c2e0c6` | フロントエンド関連 |
| `scope: backend` | `#fef2c0` | バックエンド関連 |
| `scope: ci/cd` | `#bfdadc` | CI/CD関連 |
| `scope: tooling` | `#e99695` | 開発ツール関連 |

#### 📝 その他の便利なラベル

| ラベル名 | 色 | 説明 |
|---------|-----|------|
| `needs: discussion` | `#d4c5f9` | 議論が必要 |
| `needs: reproduction` | `#ffa07a` | 再現手順が必要 |
| `breaking change` | `#b60205` | 破壊的変更を含む |
| `good to have` | `#84b6eb` | あると良い改善 |

#### 📦 特別なラベル

| ラベル名 | 色 | 説明 |
|---------|-----|------|
| `dependencies` | `#0366d6` | 依存関係の更新（Renovate が使用） |

## ラベルの変更手順

### 1. ローカルでラベル定義を編集

`.github/labels.yml` を編集します：

```bash
# ファイルを編集
vim .github/labels.yml
```

### 2. Pull Request を作成

変更を commit して PR を作成します：

```bash
git add .github/labels.yml
git commit -m "chore(labels): update label definitions"
git push origin feature/update-labels
```

### 3. 自動同期

PR が `main` ブランチにマージされると、GitHub Actions が自動的にラベルを同期します。

## GitHub Actions ワークフロー

`.github/workflows/sync-labels.yml` が自動同期を実行します。

### トリガー条件

- `main` ブランチへのプッシュ
- `.github/labels.yml` または `.github/workflows/sync-labels.yml` の変更
- 手動実行 (workflow_dispatch)

### 手動実行手順

1. GitHub リポジトリの **Actions** タブを開く
2. **Sync Labels** ワークフローを選択
3. **Run workflow** をクリック

## 動作

ghaction-github-labeler は以下の処理を自動実行します：

1. `.github/labels.yml` からラベル定義を読み込み
2. GitHub リポジトリの既存ラベルと比較
3. 差分を検出して同期：
   - **作成**: YAML に定義があり、GitHub に存在しないラベル
   - **更新**: 色または説明が異なるラベル
   - **削除**: GitHub に存在するが、YAML に定義がないラベル（`skip-delete: false` の場合）

## トラブルシューティング

### ワークフローが失敗する

1. GitHub Actions のログで詳細なエラーメッセージを確認
2. `.github/labels.yml` の YAML 構文を確認
3. 必要な権限（`issues: write`, `pull-requests: write`）が設定されているか確認

### ラベルが同期されない

- `main` ブランチへのマージが完了しているか確認
- ワークフローのトリガー条件（`paths`）に該当するファイルが変更されているか確認
- GitHub Actions のログでワークフローが実行されているか確認

### YAML 構文エラー

```bash
# YAML 構文チェック
yamllint .github/labels.yml
```

または、オンラインの YAML Validator を使用して検証してください。

## 参考リンク

- [ghaction-github-labeler](https://github.com/crazy-max/ghaction-github-labeler)
- [GitHub Labels API](https://docs.github.com/en/rest/issues/labels)
- [Managing labels - GitHub Docs](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels)
- [Issue #337: ラベルの整理と改善](https://github.com/ykzts/bingify/issues/337)
- [Issue #339: GitHubのラベルのコード管理](https://github.com/ykzts/bingify/issues/339)
