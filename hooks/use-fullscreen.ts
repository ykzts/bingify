import { useCallback, useEffect, useState } from "react";

/**
 * フルスクリーン API を管理するカスタムフック
 *
 * @param ref - フルスクリーン表示する要素の ref（省略時は document.documentElement）
 * @param enableKeyboard - F キーでのトグル機能を有効にするか（デフォルト: true）
 * @returns フルスクリーン状態と切り替え関数
 */
export function useFullscreen(
  ref?: React.RefObject<HTMLElement>,
  enableKeyboard = true
) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // フルスクリーン変更イベントのハンドラ
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // フルスクリーン変更イベントをリッスン
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // 初期状態を設定
    setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        // フルスクリーンを終了
        await document.exitFullscreen();
      } else {
        // フルスクリーンに入る
        const element = ref?.current || document.documentElement;
        await element.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, [ref]);

  useEffect(() => {
    if (!enableKeyboard) {
      return;
    }

    // F キーでフルスクリーンをトグル
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "f" || event.key === "F") {
        // 入力フィールドなどでは無効化
        const target = event.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        event.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enableKeyboard, toggleFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
  };
}
