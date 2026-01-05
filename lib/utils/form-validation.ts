import type { z } from "zod";

// revalidateLogic を再エクスポート
// biome-ignore lint/performance/noBarrelFile: revalidateLogic は zodValidatorAdapter と一緒に使用されるため、一箇所から提供する
export { revalidateLogic } from "@tanstack/react-form";

/**
 * Zod スキーマを TanStack Form の onDynamic バリデーター関数に変換する
 * @param schema - Zod スキーマオブジェクト
 * @returns TanStack Form の onDynamic バリデーター関数
 */
export function zodValidatorAdapter<T extends z.ZodTypeAny>(schema: T) {
  return ({ value }: { value: unknown }) => {
    // Zod の safeParse() を使用してフォーム値を検証
    const result = schema.safeParse(value);

    // 検証成功時は undefined を返す
    if (result.success) {
      return undefined;
    }

    // TanStack Form のエラーマップ形式に変換
    const errorMap: Record<string, string> = {};

    // Zod の issues から直接エラーを取得し、パスをドット記法に変換
    for (const issue of result.error.issues) {
      if (issue.path.length === 0) {
        // フォームレベルのエラー
        errorMap.form = issue.message;
      } else {
        // パス配列をドット記法の文字列に変換
        // 例: ["features", "gatekeeper", "email"] → "features.gatekeeper.email"
        // 配列インデックスも同様に変換: ["tags", 0] → "tags.0"
        const path = issue.path.join(".");
        // 各パスの最初のエラーのみを保持（Zodは検証優先順でエラーを返す）
        if (!errorMap[path]) {
          errorMap[path] = issue.message;
        }
      }
    }

    // エラーマップが空の場合は undefined を返す
    return Object.keys(errorMap).length > 0 ? errorMap : undefined;
  };
}
