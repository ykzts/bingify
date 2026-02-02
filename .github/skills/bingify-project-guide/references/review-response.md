# PR Review Response Guide

Pull Requestのレビューコメント（特に行単位のコメント）への対応手順をまとめます。

## レビューコメントの取得

### 全体的なコメント確認

```bash
# PR全体のコメントを確認
gh pr view {PR_NUMBER} --comments
```

**制限**: このコマンドでは全体的なコメントは取得できますが、コード行に紐づいた詳細なレビューコメントは表示されません。

### 行単位のレビューコメント取得

`gh api` を使用して、コード行に紐づいたレビューコメントを取得できます：

```bash
# PRの行単位コメントを取得
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/comments

# 整形して表示（ファイルパス、行番号、コメント本文）
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/comments \
  --jq '.[] | {path: .path, line: .line, body: .body}'

# 特定ファイルのコメントのみ抽出
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/comments \
  --jq '.[] | select(.path == "app/[locale]/page.tsx") | {line: .line, body: .body}'

# コメント詳細（ユーザー名、ファイル、行、本文）
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/comments \
  --jq '.[] | {user: .user.login, path: .path, line: .line, body: .body, created_at: .created_at}'
```

### レビューステータスの確認

```bash
# レビューステータス（承認、変更要求、コメント）を確認
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/reviews \
  --jq '.[] | {user: .user.login, state: .state, submitted_at: .submitted_at}'

# 最新のレビューステータスのみ表示
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/reviews \
  --jq '.[-1] | {user: .user.login, state: .state}'
```

## レビュー対応のワークフロー

### 1. レビューコメントの確認

```bash
# 現在のPRブランチでレビューコメントを確認
PR_NUMBER=$(gh pr view --json number --jq .number)
gh api /repos/ykzts/bingify/pulls/${PR_NUMBER}/comments \
  --jq '.[] | {path: .path, line: .line, body: .body}'
```

### 2. 各コメントへの対応

レビューコメントに対する対応は以下のいずれか：

- **修正**: コードを変更してコミット
- **説明**: コメントに返信して意図や理由を説明
- **議論**: 代替案や別のアプローチについて議論

### 3. 修正のコミット

```bash
# ファイルを修正
# ... コード編集 ...

# コミット（レビューコメントを反映した旨を記載）
git add <modified-files>
git commit -m "fix(scope): address review comments - <brief-summary>"

# プッシュ
git push origin <branch-name>
```

**ヒント**: コミットメッセージに「address review comments」や「apply feedback」などの記載を含めることで、レビュー対応のコミットであることが明確になります。

### 4. レビュアーへの返信

GitHub Web UI を使用してコメントに返信します：

1. PR ページでレビューコメントを表示
2. 各コメントに対して返信を記入
3. 修正した場合: "Fixed in [commit-hash]" や "Done" と記載
4. 説明が必要な場合: 詳細な理由や意図を記述
5. 解決済みの場合: "Resolve conversation" をクリック

## 便利なコマンド

### PR情報の確認

```bash
# 現在のブランチのPR番号を取得
gh pr view --json number --jq .number

# PR全体の情報を確認
gh pr view

# PRのdiffを確認
gh pr diff

# PRのチェック状況を確認
gh pr checks
```

### レビュアーの管理

```bash
# レビュアーを追加
gh pr edit --add-reviewer <username>

# レビュアーにレビューを再依頼（変更後）
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/requested_reviewers \
  -X POST -f "reviewers[]=<username>"
```

### コメントへの返信（CLI経由）

```bash
# レビューコメントに返信（comment_id は gh api で取得可能）
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/comments/{comment_id}/replies \
  -X POST -f "body=Thank you for the feedback. Fixed in abc123."
```

### 解決済みコメントの確認

```bash
# 未解決のレビューコメントのみを表示（Web UIでの操作を推奨）
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/comments \
  --jq '.[] | select(.in_reply_to_id == null) | {path: .path, line: .line, body: .body}'
```

## ベストプラクティス

### レビュー対応のポイント

1. **迅速な対応**: レビューコメントを受け取ったら、できるだけ早く確認・対応する
2. **明確なコミット**: レビュー対応のコミットは、どのコメントに対する修正かが分かるようにする
3. **丁寧な返信**: 質問や提案に対しては、丁寧に返信して意図を共有する
4. **コンテキストの提供**: 修正した場合はコミットハッシュを、説明が必要な場合は詳細な理由を記載する
5. **解決のマーク**: 対応が完了したコメントは "Resolve conversation" で解決済みとしてマークする

### 複数コメントへの一括対応

複数のレビューコメントに対応する場合：

```bash
# 1. すべてのコメントを確認
gh api /repos/ykzts/bingify/pulls/${PR_NUMBER}/comments \
  --jq '.[] | {id: .id, path: .path, line: .line, body: .body}' > review_comments.json

# 2. 各コメントに対応する修正を実施

# 3. 1つのコミットで複数の修正をまとめる（関連性がある場合）
git add .
git commit -m "fix(scope): address multiple review comments

- Fix issue A mentioned in comment #123
- Update logic B as suggested in comment #456
- Add documentation for C per comment #789"

# 4. プッシュ
git push origin <branch-name>
```

## トラブルシューティング

### コメントが見つからない場合

```bash
# レビュー全体を確認（コメント + ステータス）
gh api /repos/ykzts/bingify/pulls/{PR_NUMBER}/reviews \
  --jq '.[] | {id: .id, user: .user.login, state: .state, body: .body}'

# PRのタイムラインを確認（すべてのアクティビティ）
gh pr view {PR_NUMBER} --json comments,reviews --jq '.'
```

### レビューコメントの種類

GitHub には以下の種類のコメントがあります：

1. **Issue Comment** (`gh pr view --comments` で取得可能): PR全体へのコメント
2. **Review Comment** (`gh api .../pulls/{PR}/comments` で取得可能): コード行に紐づいたコメント
3. **Review** (`gh api .../pulls/{PR}/reviews` で取得可能): レビュー全体（複数のコメントを含む）

## 参考リンク

- [GitHub REST API: Pull Request Review Comments](https://docs.github.com/en/rest/pulls/comments)
- [GitHub CLI: gh api](https://cli.github.com/manual/gh_api)
- [GitHub CLI: gh pr](https://cli.github.com/manual/gh_pr)
- [Conventional Commits](https://www.conventionalcommits.org/)
