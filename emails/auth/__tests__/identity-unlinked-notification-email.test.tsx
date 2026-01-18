import { render, toPlainText } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { IdentityUnlinkedNotificationEmail } from "../identity-unlinked-notification-email";

describe("IdentityUnlinkedNotificationEmail", () => {
  const testProps = {
    locale: "en",
    provider: "Google",
  };

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("HTML版のレンダリング", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("英語版を正しくレンダリングする", async () => {
      const html = await render(
        await IdentityUnlinkedNotificationEmail(testProps)
      );

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="en"');

      // コンテンツの確認
      expect(html).toContain("External Provider Unlinked");
      expect(html).toContain("Hello,");
      expect(html).toContain(
        "An external authentication provider has been unlinked from your account"
      );
      expect(html).toContain("Provider:");
      expect(html).toContain(testProps.provider);
    });

    it("日本語版を正しくレンダリングする", async () => {
      const japaneseProps = { ...testProps, locale: "ja" };
      const html = await render(
        await IdentityUnlinkedNotificationEmail(japaneseProps)
      );

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="ja"');

      // コンテンツの確認
      expect(html).toContain("外部プロバイダーのリンクが解除されました");
      expect(html).toContain("こんにちは、");
      expect(html).toContain(testProps.provider);
    });

    it("セキュリティに関する注意事項を含む", async () => {
      const html = await render(
        await IdentityUnlinkedNotificationEmail(testProps)
      );

      // セキュリティノートが含まれていることを確認
      expect(html).toContain("Security Notice");
      expect(html).toContain(
        "If you didn&#x27;t unlink this provider, please contact our support team"
      );
    });

    it("アカウントアクセス情報を含む", async () => {
      const html = await render(
        await IdentityUnlinkedNotificationEmail(testProps)
      );

      // アクセス情報が含まれていることを確認
      expect(html).toContain(
        "You can still sign in using your email and password"
      );
    });

    it("プロバイダーが空の場合は表示しない", async () => {
      const propsWithoutProvider = {
        ...testProps,
        provider: "",
      };
      const html = await render(
        await IdentityUnlinkedNotificationEmail(propsWithoutProvider)
      );

      // プロバイダーラベルが表示されていないことを確認
      expect(html).not.toContain("Provider:");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("テキスト版のレンダリング", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("英語版のプレーンテキストを正しくレンダリングする", async () => {
      const html = await render(
        await IdentityUnlinkedNotificationEmail(testProps)
      );
      const text = toPlainText(html);

      // テキスト版の内容確認
      expect(text).toContain("EXTERNAL PROVIDER UNLINKED");
      expect(text).toContain("Hello,");
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
    });

    it("HTMLタグを含まない", async () => {
      const html = await render(
        await IdentityUnlinkedNotificationEmail(testProps)
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
        provider: testProps.provider,
      };
      const html = await render(
        await IdentityUnlinkedNotificationEmail(propsWithoutLocale as typeof testProps)
      );

      // 英語版のコンテンツが含まれていることを確認
      expect(html).toContain("External Provider Unlinked");
      expect(html).toContain("Hello,");
    });
  });
});
