# Testing & Code Quality

Bingifyプロジェクトのテスト戦略とコード品質管理をカバーします。

## テストファイルの配置

テストファイルは以下のパターンで配置：

```
lib/
  utils.ts
  __tests__/
    utils.test.ts
```

## テストの作成

```typescript
import { describe, it, expect } from "vitest";
import { formatDate } from "../utils";

describe("ユーティリティ関数", () => {
  it("日付を正しくフォーマットする", () => {
    const date = new Date("2026-01-11");
    const result = formatDate(date, "YYYY-MM-DD");
    expect(result).toBe("2026-01-11");
  });
});
```

## テスト実行

```bash
# すべてのテスト
pnpm test

# ウォッチモード
pnpm test --watch

# カバレッジ
pnpm test --coverage
```

## Biome: Lint & Format

Biomeでコードを自動検査・フォーマット：

```bash
# 検査とフォーマット
pnpm check

# 単一ファイルの検査
pnpm format path/to/file.tsx
```

## File-scoped コマンド優先

型チェック・フォーマット・テストは **ファイル単位** で実行：

```bash
# 単一ファイルの型チェック
pnpm type-check path/to/file.tsx

# 単一ファイルのフォーマット
pnpm format path/to/file.tsx

# 単一ファイルのテスト
pnpm test path/to/file.test.ts
```

プロジェクト全体ビルドは明示的に指示された場合のみ。

## 参考

- [Vitest公式ドキュメント](https://vitest.dev/)
- [Biomejs公式ドキュメント](https://biomejs.dev/)
