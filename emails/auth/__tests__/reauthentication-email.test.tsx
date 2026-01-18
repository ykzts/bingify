import { render, toPlainText } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { ReauthenticationEmail } from "../reauthentication-email";

describe("ReauthenticationEmail", () => {
  const testProps = {
    locale: "en",
    token: "123456",
  };

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("HTML版のレンダリング", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("英語版を正しくレンダリングする", async () => {
      const html = await render(await ReauthenticationEmail(testProps));

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="en"');

      // コンテンツの確認
      expect(html).toContain("Verify Your Identity");
      expect(html).toContain("Hello,");
      expect(html).toContain(
        "We received a request that requires you to verify your identity"
      );
      expect(html).toContain(testProps.token);
    });

    it("日本語版を正しくレンダリングする", async () => {
      const japaneseProps = { ...testProps, locale: "ja" };
      const html = await render(await ReauthenticationEmail(japaneseProps));

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="ja"');

      // コンテンツの確認
      expect(html).toContain("本人確認が必要です");
      expect(html).toContain("こんにちは、");
      expect(html).toContain(testProps.token);
    });

    it("セキュリティに関する注意事項を含む", async () => {
      const html = await render(await ReauthenticationEmail(testProps));

      // セキュリティノートが含まれていることを確認（HTML エスケープされる）
      expect(html).toContain(
        "If you didn&#x27;t request this verification"
      );
    });

    it("有効期限に関する注意事項を含む", async () => {
      const html = await render(await ReauthenticationEmail(testProps));

      // 有効期限の注意事項が含まれていることを確認
      expect(html).toContain("This code will expire in 5 minutes");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("テキスト版のレンダリング", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("英語版のプレーンテキストを正しくレンダリングする", async () => {
      const html = await render(await ReauthenticationEmail(testProps));
      const text = toPlainText(html);

      // テキスト版の内容確認
      expect(text).toContain("VERIFY YOUR IDENTITY");
      expect(text).toContain("Hello,");
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
    });

    it("日本語版のプレーンテキストを正しくレンダリングする", async () => {
      const japaneseProps = { ...testProps, locale: "ja" };
      const html = await render(await ReauthenticationEmail(japaneseProps));
      const text = toPlainText(html);

      // テキスト版の内容確認
      expect(text).toContain("本人確認が必要です");
      expect(text).toContain("こんにちは、");
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
    });

    it("HTMLタグを含まない", async () => {
      const html = await render(await ReauthenticationEmail(testProps));
      const text = toPlainText(html);

      // HTMLタグが含まれていないことを確認
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
      expect(text).not.toContain("&lt;");
      expect(text).not.toContain("&gt;");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("OTPセクション", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("OTPコードを表示する", async () => {
      const html = await render(await ReauthenticationEmail(testProps));

      // OTPコードが含まれていることを確認
      expect(html).toContain(testProps.token);
    });

    it("6桁のOTPコードを正しく表示する", async () => {
      const propsWithSixDigit = {
        ...testProps,
        token: "654321",
      };
      const html = await render(await ReauthenticationEmail(propsWithSixDigit));

      // 6桁のOTPコードが含まれていることを確認
      expect(html).toContain("654321");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("デフォルト値の処理", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("localeが指定されない場合は英語版を表示する", async () => {
      const propsWithoutLocale = {
        token: testProps.token,
      };
      const html = await render(
        await ReauthenticationEmail(propsWithoutLocale as typeof testProps)
      );

      // 英語版のコンテンツが含まれていることを確認
      expect(html).toContain("Verify Your Identity");
      expect(html).toContain("Hello,");
    });
  });
});
