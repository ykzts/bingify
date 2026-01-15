import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFullscreen } from "../use-fullscreen";

describe("useFullscreen", () => {
  let mockRequestFullscreen: ReturnType<typeof vi.fn>;
  let mockExitFullscreen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // document.fullscreenElement のモック
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
      writable: true,
    });

    // requestFullscreen と exitFullscreen のモック
    mockRequestFullscreen = vi.fn().mockResolvedValue(null);
    mockExitFullscreen = vi.fn().mockResolvedValue(null);

    // 型エラーを回避するため as any を使用
    HTMLElement.prototype.requestFullscreen =
      mockRequestFullscreen as HTMLElement["requestFullscreen"];
    document.exitFullscreen =
      mockExitFullscreen as Document["exitFullscreen"];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("初期状態ではフルスクリーンでないことを確認", () => {
    const { result, unmount } = renderHook(() => useFullscreen());

    expect(result.current.isFullscreen).toBe(false);

    unmount();
  });

  it("toggleFullscreen でフルスクリーンをリクエストできる", async () => {
    const { result, unmount } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(mockRequestFullscreen).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("フルスクリーン状態で toggleFullscreen を呼ぶと終了する", async () => {
    // フルスクリーン状態をシミュレート
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: document.documentElement,
      writable: true,
    });

    const { result, unmount } = renderHook(() => useFullscreen());

    // fullscreenchange イベントをトリガー
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(result.current.isFullscreen).toBe(true);

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(mockExitFullscreen).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("F キーでフルスクリーンをトグルできる", async () => {
    const { unmount } = renderHook(() => useFullscreen());

    await act(() => {
      const event = new KeyboardEvent("keydown", { key: "f" });
      document.dispatchEvent(event);
    });

    expect(mockRequestFullscreen).toHaveBeenCalled();

    unmount();
  });

  it("入力フィールドで F キーを押してもフルスクリーンがトグルされない", async () => {
    const { unmount } = renderHook(() => useFullscreen());

    // input 要素をシミュレート
    const input = document.createElement("input");
    document.body.appendChild(input);

    await act(() => {
      const event = new KeyboardEvent("keydown", {
        bubbles: true,
        key: "f",
      });
      Object.defineProperty(event, "target", {
        value: input,
        writable: false,
      });
      document.dispatchEvent(event);
    });

    expect(mockRequestFullscreen).not.toHaveBeenCalled();

    document.body.removeChild(input);
    unmount();
  });

  it("enableKeyboard が false の場合、F キーが無効化される", async () => {
    const { unmount } = renderHook(() => useFullscreen(undefined, false));

    await act(() => {
      const event = new KeyboardEvent("keydown", { key: "f" });
      document.dispatchEvent(event);
    });

    expect(mockRequestFullscreen).not.toHaveBeenCalled();

    unmount();
  });
});
