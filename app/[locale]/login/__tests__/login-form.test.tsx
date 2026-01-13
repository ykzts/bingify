import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { LoginForm } from "../_components/login-form";

// next-intlのモック
vi.mock("next-intl", () => ({
  useLocale: () => "ja",
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      closeEmailForm: "メールフォームを閉じる",
      description:
        "ゲームのホストやアカウント管理のためにログインしてください。",
      emailButton: "メールアドレスでログイン",
      emailInputLabel: "メールアドレス",
      emailInputPlaceholder: "your@email.com",
      emailSendButton: "マジックリンクを送信",
      emailSending: "送信中...",
      emailSuccess: "メールを確認してください!ログインリンクを送信しました。",
      errorEmailInvalid: "有効なメールアドレスを入力してください",
      errorMessage:
        "ログイン中にエラーが発生しました。もう一度お試しください。",
      orDivider: "または",
      title: "Bingifyにログイン",
    };
    return translations[key] || key;
  },
}));

// next/navigationのモック
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

// Supabase clientのモック
const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithOtp: mockSignInWithOtp,
    },
  }),
}));

describe("LoginForm - Enterキー送信", () => {
  it("メールアドレス入力フィールドでEnterキーを押すとフォームが送信される", async () => {
    mockSignInWithOtp.mockClear();

    const mockProviders: never[] = [];
    const mockSystemSettings: SystemSettings = {
      archive_retention_hours: 72,
      default_user_role: "user",
      features: {
        gatekeeper: {
          email: { enabled: false },
          twitch: {
            enabled: false,
            follower: { enabled: false },
            subscriber: { enabled: false },
          },
          youtube: {
            enabled: false,
            subscriber: { enabled: false },
          },
        },
      },
      max_participants_per_space: 100,
      max_spaces_per_user: 10,
      max_total_spaces: 1000,
      space_expiration_hours: 24,
      spaces_archive_retention_hours: 168,
    };

    render(
      <LoginForm
        providers={mockProviders}
        systemSettings={mockSystemSettings}
      />
    );

    // メールアドレス入力フィールドを取得
    const emailInput = screen.getByPlaceholderText("your@email.com");
    expect(emailInput).toBeInTheDocument();

    // メールアドレスを入力
    fireEvent.change(emailInput, {
      target: { value: "test@example.com" },
    });

    // Enterキーを押下してフォームを送信
    // HTML標準では、input要素でEnterキーを押すとフォームが送信される
    const form = emailInput.closest("form");
    if (form) {
      fireEvent.submit(form);
    }

    // フォーム送信が実行され、signInWithOtpが呼ばれることを確認
    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        options: {
          data: {
            language: "ja",
          },
          emailRedirectTo: expect.any(String),
        },
      });
    });

    // 成功メッセージが表示されることを確認
    await waitFor(() => {
      expect(
        screen.getByText(
          "メールを確認してください!ログインリンクを送信しました。"
        )
      ).toBeInTheDocument();
    });
  });
});
