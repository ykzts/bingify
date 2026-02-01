# CI/CD & GitHub Actions

Bingifyの継続的インテグレーション・継続的デリバリーと GitHub Actions 設定をカバーします。

## コード品質チェック

プルリクエスト作成前に以下を実行：

- **Lint & Format**: `pnpm check` （Biome）
- **型チェック**: `pnpm type-check` （TypeScript）
- **テスト**: `pnpm test -- --run` （Vitest、1回実行モード）

詳細は [testing.md](testing.md) を参照してください。

## ドキュメント編集

Markdown ドキュメント編集後は、コミット前に以下を実行：

```bash
pnpm format:docs
```

## GitHub Actions

GitHub Actions でアクションを使用する際：

- タグ指定ではなく、**フルコミット SHA** を使用
- 末尾に `# vX.Y.Z` の形式でバージョンコメント付与

### 例

```yaml
- uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1
```

### 理由

- **セキュリティ**: タグ変更による意図しない挙動変更を防止
- **再現性**: ワークフロー実行の厳密な再現が可能
- **監査可能性**: 使用されたアクション版を明確に記録

## デプロイメント

詳細は [docs/VERCEL_DEPLOY.md](../../../../docs/VERCEL_DEPLOY.md) を参照してください。
