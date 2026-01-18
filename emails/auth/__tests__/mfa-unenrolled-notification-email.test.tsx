import { render, toPlainText } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { MfaUnenrolledNotificationEmail } from "../mfa-unenrolled-notification-email";

describe("MfaUnenrolledNotificationEmail", () => {
  const testProps = {
    factorType: "totp",
    locale: "en",
  };

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("HTML版のレンダリング", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("英語版を正しくレンダリングする", async () => {
      const html = await render(
        await MfaUnenrolledNotificationEmail(testProps)
      );

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="en"');

      // コンテンツの確認
      expect(html).toContain("Multi-Factor Authentication Disabled");
      expect(html).toContain("Hello,");
      expect(html).toContain(
        "Multi-factor authentication (MFA) has been disabled"
      );
      expect(html).toContain("Factor Type:");
      expect(html).toContain(testProps.factorType);
    });

    it("日本語版を正しくレンダリングする", async () => {
      const japaneseProps = { ...testProps, locale: "ja" };
      const html = await render(
        await MfaUnenrolledNotificationEmail(japaneseProps)
      );

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="ja"');

      // コンテンツの確認
      expect(html).toContain("多要素認証が無効になりました");
      expect(html).toContain("こんにちは、");
      expect(html).toContain(testProps.factorType);
    });

    it("セキュリティに関する注意事項を含む", async () => {
      const html = await render(
        await MfaUnenrolledNotificationEmail(testProps)
      );

      // セキュリティノートが含まれていることを確認
      expect(html).toContain("Security Notice");
      expect(html).toContain(
        "If you didn&#x27;t disable MFA, please contact our support team"
      );
    });

    it("推奨事項を含む", async () => {
      const html = await render(
        await MfaUnenrolledNotificationEmail(testProps)
      );

      // 推奨事項が含まれていることを確認
      expect(html).toContain("Security Recommendation");
      expect(html).toContain(
        "We strongly recommend keeping MFA enabled for enhanced account security"
      );
    });

    it("ファクタータイプが空の場合は表示しない", async () => {
      const propsWithoutFactorType = {
        ...testProps,
        factorType: "",
      };
      const html = await render(
        await MfaUnenrolledNotificationEmail(propsWithoutFactorType)
      );

      // ファクタータイプラベルが表示されていないことを確認
      expect(html).not.toContain("Factor Type:");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("テキスト版のレンダリング", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("英語版のプレーンテキストを正しくレンダリングする", async () => {
      const html = await render(
        await MfaUnenrolledNotificationEmail(testProps)
      );
      const text = toPlainText(html);

      // テキスト版の内容確認
      expect(text).toContain("MULTI-FACTOR AUTHENTICATION DISABLED");
      expect(text).toContain("Hello,");
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
    });

    it("HTMLタグを含まない", async () => {
      const html = await render(
        await MfaUnenrolledNotificationEmail(testProps)
      );
      const text = toPlainText(html);

      // HTMLタグが含まれていないことを確認
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
      expect(text).not.toContain("&lt;");
      expect(text).not.toContain("&gt;");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("デフォルト値の処理", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("localeが指定されない場合は英語版を表示する", async () => {
      const propsWithoutLocale = {
        factorType: testProps.factorType,
      };
      const html = await render(
        await MfaUnenrolledNotificationEmail(
          propsWithoutLocale as typeof testProps
        )
      );

      // 英語版のコンテンツが含まれていることを確認
      expect(html).toContain("Multi-Factor Authentication Disabled");
      expect(html).toContain("Hello,");
    });
  });
});
