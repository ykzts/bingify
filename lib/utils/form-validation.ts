import { revalidateLogic } from "@tanstack/react-form";
import type { z } from "zod";

/**
 * Zod スキーマを TanStack Form の onDynamic バリデーター関数に変換する
 * @param schema - Zod スキーマオブジェクト
 * @returns TanStack Form の onDynamic バリデーター関数
 */
export function zodValidatorAdapter<T extends z.ZodTypeAny>(schema: T) {
  return ({ value }: { value: z.infer<T> }) => {
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
        const path = issue.path.join(".");
        // 最初のエラーのみを保持（同じパスに複数のエラーがある場合）
        if (!errorMap[path]) {
          errorMap[path] = issue.message;
        }
      }
    }

    // エラーマップが空の場合は undefined を返す
    return Object.keys(errorMap).length > 0 ? errorMap : undefined;
  };
}

// revalidateLogic を再エクスポート
export { revalidateLogic };
