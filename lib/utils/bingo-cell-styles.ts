import { cn } from "@/lib/utils";

/**
 * BINGOセルのスタイルクラスを生成する
 * ダークモード対応のTailwind CSSクラスを返す
 *
 * @param isCalled - セルが選択済みかどうか
 * @returns Tailwind CSSクラス文字列
 */
export function getBingoCellClassName(isCalled: boolean): string {
  return cn(
    "flex aspect-square items-center justify-center rounded border-2 font-bold text-xl",
    isCalled
      ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
      : "border-gray-300 bg-white text-black dark:border-gray-600 dark:bg-gray-800 dark:text-white"
  );
}
