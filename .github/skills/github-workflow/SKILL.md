---
name: github-workflow
description: Understand Conventional Commits, GitHub issue management, and Pull Request workflows. Apply best practices for collaborative development.
metadata:
  author: Bingify
  version: "1.0"
---

# GitHub Workflow & Conventions

このスキルは、Bingifyの開発プロセス・GitHub管理・コミット規約をカバーします。

## 概要

BingifyはConventionalCommitsとGitHubFlowを採用し、チーム開発の効率と品質を保証します。

## Conventional Commits

### コミットメッセージの形式

```
type(scope): subject
```

### type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト
- `ci`: CI/CD
- `chore`: その他

### 例

```bash
git commit -m "feat(dashboard): add space creation form"
git commit -m "fix(space): resolve slug validation error"
git commit -m "docs: update setup instructions"
```

## ブランチ戦略

```
main                    # 本番用
feat/dashboard-spaces   # 新機能
fix/auth-redirect       # バグ修正
refactor/api-routes     # リファクタリング
```

## PRワークフロー

1. フィーチャーブランチを作成
2. コミットを積み重ねる
3. PRを作成してレビュー
4. ApprovalをもらってSquash merge

```bash
git switch -c feat/dashboard-spaces
# ... コーディング ...
git commit -m "feat(dashboard): add form"
git push origin feat/dashboard-spaces
# GitHub: Create Pull Request
```

## CI/CDチェック

```bash
pnpm check       # Lint + Format
pnpm type-check  # TypeScript
pnpm test        # Vitest
```

## ドキュメントのフォーマット

SKILL.mdを編集した場合は、以下でフォーマットしてください：

```bash
pnpm format:docs
```

## 参考

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
