# GitHub Workflow & Conventions

Bingifyの開発プロセス・GitHub管理・コミット規約をカバーします。

## Conventional Commits

### コミットメッセージの形式

```text
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

```text
main                    # 本番用
feat/dashboard-spaces   # 新機能
fix/auth-redirect       # バグ修正
refactor/api-routes     # リファクタリング
```

## PRワークフロー

1. フィーチャーブランチを作成
2. コミットを積み重ねる
3. **PRを作成してレビュー** - PR タイトルは Conventional Commits に従う
4. Approval をもらって Squash merge

```bash
git switch -c feat/dashboard-spaces
# ... コーディング ...
git commit -m "feat(dashboard): add form"
git push origin feat/dashboard-spaces
# GitHub: Create Pull Request
```

### PR タイトル規約

GitHub の Pull Request タイトルは Conventional Commits 形式に統一：

```text
feat(dashboard): add space creation form
fix(auth): resolve token expiry issue
docs: update API documentation
```

**理由**: PR がマージされる際、PR タイトルがコミットメッセージとして使用されるため、Conventional Commits に準拠することで、コミット履歴の一貫性を保証します。

## 詳細ドキュメント

- **CI/CD & GitHub Actions**: [ci-cd.md](ci-cd.md)
- **コード品質チェック詳細**: [testing.md](testing.md)
- **PRレビュー対応**: [review-response.md](review-response.md)
