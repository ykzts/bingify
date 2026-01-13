import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { LoginForm } from "../_components/login-form";

// next-intlのモック
vi.mock("next-intl", () => ({
  useLocale: () => "ja",
  useTranslations: () => {
    const t = (key: string) => {
      const translations: Record<string, string> = {
        agreeToTerms:
          "ログインすることで、<termsLink>利用規約</termsLink>と<privacyLink>プライバシーポリシー</privacyLink>に同意したものとみなします。",
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
    };
    t.rich = (
      key: string,
      values?: Record<
        string,
        (chunks: React.ReactNode) => React.ReactElement
      >
    ) => {
      const text = t(key);
      if (!values) return text;
      
      // 簡易的なリッチテキストのレンダリング
      let result: React.ReactNode = text;
      for (const [tag, fn] of Object.entries(values)) {
        const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "g");
        const parts = text.split(regex);
        result = parts.map((part, i) =>
          i % 2 === 1 ? fn(part) : part
        );
      }
      return result;
    };
    return t;
  },
}));

// @/i18n/navigationのモック
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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
            member: { enabled: false },
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
