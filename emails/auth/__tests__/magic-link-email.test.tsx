import { render, toPlainText } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { MagicLinkEmail } from "../magic-link-email";

describe("MagicLinkEmail", () => {
  const testProps = {
    confirmationUrl: "https://example.com/auth/confirm?token=abc123",
    locale: "en",
    token: "123456",
  };

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("HTML版のレンダリング", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("英語版を正しくレンダリングする", async () => {
      const html = await render(await MagicLinkEmail(testProps));

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="en"');

      // コンテンツの確認
      expect(html).toContain("Sign In to Bingify");
      expect(html).toContain("Hello,");
      expect(html).toContain(
        "We received a request to sign in to your account"
      );
      expect(html).toContain("Sign In");
      expect(html).toContain(testProps.confirmationUrl);
      expect(html).toContain(testProps.token);
    });

    it("日本語版を正しくレンダリングする", async () => {
      const japaneseProps = { ...testProps, locale: "ja" };
      const html = await render(await MagicLinkEmail(japaneseProps));

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="ja"');

      // コンテンツの確認
      expect(html).toContain("Bingifyにログイン");
      expect(html).toContain("こんにちは、");
      expect(html).toContain("ログインリクエストを受け付けました");
      expect(html).toContain("ログイン");
      expect(html).toContain(testProps.confirmationUrl);
      expect(html).toContain(testProps.token);
    });

    it("確認URLをエスケープする", async () => {
      const propsWithSpecialChars = {
        ...testProps,
        confirmationUrl:
          'https://example.com/auth?token=abc"><script>alert("xss")</script>',
      };

      const html = await render(await MagicLinkEmail(propsWithSpecialChars));

      // スクリプトタグがエスケープされていることを確認
      expect(html).not.toContain("<script>");
      expect(html).toContain("&quot;");
    });

    it("セキュリティに関する注意事項を含む", async () => {
      const html = await render(await MagicLinkEmail(testProps));

      // セキュリティノートが含まれていることを確認（HTML エスケープされる）
      expect(html).toContain(
        "If you didn&#x27;t request this sign-in link, you can safely ignore this email"
      );
    });

    it("有効期限に関する注意事項を含む", async () => {
      const html = await render(await MagicLinkEmail(testProps));

      // 有効期限の注意事項が含まれていることを確認
      expect(html).toContain("This link will expire in 1 hour");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("テキスト版のレンダリング", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("英語版のプレーンテキストを正しくレンダリングする", async () => {
      const html = await render(await MagicLinkEmail(testProps));
      const text = toPlainText(html);

      // テキスト版の内容確認（プレーンテキストでは大文字に変換される）
      expect(text).toContain("SIGN IN TO BINGIFY");
      expect(text).toContain("Hello,");
      expect(text).toContain("Sign In");
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
    });

    it("日本語版のプレーンテキストを正しくレンダリングする", async () => {
      const japaneseProps = { ...testProps, locale: "ja" };
      const html = await render(await MagicLinkEmail(japaneseProps));
      const text = toPlainText(html);

      // テキスト版の内容確認（プレーンテキストでは大文字に変換される）
      expect(text).toContain("BINGIFYにログイン");
      expect(text).toContain("こんにちは、");
      expect(text).toContain("ログイン");
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
    });

    it("HTMLタグを含まない", async () => {
      const html = await render(await MagicLinkEmail(testProps));
      const text = toPlainText(html);

      // HTMLタグが含まれていないことを確認
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
      expect(text).not.toContain("&lt;");
      expect(text).not.toContain("&gt;");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("プレビューテキスト", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("英語版のプレビューテキストを生成する", async () => {
      const html = await render(await MagicLinkEmail(testProps));

      // プレビューテキストが含まれていることを確認
      expect(html).toContain("Sign In to Bingify");
    });

    it("日本語版のプレビューテキストを生成する", async () => {
      const japaneseProps = { ...testProps, locale: "ja" };
      const html = await render(await MagicLinkEmail(japaneseProps));

      // プレビューテキストが含まれていることを確認
      expect(html).toContain("Bingifyにログイン");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("パスワードリセットとの違い", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("パスワードリセット特有の表現を含まない", async () => {
      const html = await render(await MagicLinkEmail(testProps));

      // パスワードリセット特有の表現が含まれていないことを確認
      expect(html).not.toContain("Reset Your Password");
      expect(html).not.toContain("Reset Password");
      expect(html).not.toContain("reset your password");
      expect(html).not.toContain("パスワードのリセット");
      expect(html).not.toContain("パスワードをリセット");
    });

    it("ログイン特有の表現を含む", async () => {
      const html = await render(await MagicLinkEmail(testProps));

      // ログイン特有の表現が含まれていることを確認
      expect(html).toContain("Sign In");
      expect(html).toContain("sign in");
    });

    it("日本語版でログイン特有の表現を含む", async () => {
      const japaneseProps = { ...testProps, locale: "ja" };
      const html = await render(await MagicLinkEmail(japaneseProps));

      // ログイン特有の表現が含まれていることを確認
      expect(html).toContain("ログイン");
      expect(html).toContain("ログインリクエスト");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("OTPセクション", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("OTPコードを表示する", async () => {
      const html = await render(await MagicLinkEmail(testProps));

      // OTPコードが含まれていることを確認
      expect(html).toContain(testProps.token);
    });
  });

  describe("デフォルト値の処理", () => {
    it("localeが指定されない場合は英語版を表示する", async () => {
      const propsWithoutLocale = {
        confirmationUrl: testProps.confirmationUrl,
        token: testProps.token,
      };
      const html = await render(
        MagicLinkEmail(propsWithoutLocale as typeof testProps)
      );

      // 英語版のコンテンツが含まれていることを確認
      expect(html).toContain("Sign In to Bingify");
      expect(html).toContain("Hello,");
    });
  });
});
