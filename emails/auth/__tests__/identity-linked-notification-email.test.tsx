import { render, toPlainText } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { IdentityLinkedNotificationEmail } from "../identity-linked-notification-email";

describe("IdentityLinkedNotificationEmail", () => {
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
        await IdentityLinkedNotificationEmail(testProps)
      );

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="en"');

      // コンテンツの確認
      expect(html).toContain("External Provider Linked");
      expect(html).toContain("Hello,");
      expect(html).toContain(
        "An external authentication provider has been linked to your account"
      );
      expect(html).toContain("Provider:");
      expect(html).toContain(testProps.provider);
    });

    it("日本語版を正しくレンダリングする", async () => {
      const japaneseProps = { ...testProps, locale: "ja" };
      const html = await render(
        await IdentityLinkedNotificationEmail(japaneseProps)
      );

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="ja"');

      // コンテンツの確認
      expect(html).toContain("外部プロバイダーがリンクされました");
      expect(html).toContain("こんにちは、");
      expect(html).toContain(testProps.provider);
    });

    it("セキュリティに関する注意事項を含む", async () => {
      const html = await render(
        await IdentityLinkedNotificationEmail(testProps)
      );

      // セキュリティノートが含まれていることを確認
      expect(html).toContain("Security Notice");
      expect(html).toContain(
        "If you didn&#x27;t link this provider, please contact our support team"
      );
    });

    it("次にできることを含む", async () => {
      const html = await render(
        await IdentityLinkedNotificationEmail(testProps)
      );

      // 次のステップが含まれていることを確認
      expect(html).toContain("What You Can Do Now");
      expect(html).toContain("You can now sign in using this provider");
      expect(html).toContain("Manage your linked providers");
    });

    it("プロバイダーが空の場合は表示しない", async () => {
      const propsWithoutProvider = {
        ...testProps,
        provider: "",
      };
      const html = await render(
        await IdentityLinkedNotificationEmail(propsWithoutProvider)
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
        await IdentityLinkedNotificationEmail(testProps)
      );
      const text = toPlainText(html);

      // テキスト版の内容確認
      expect(text).toContain("EXTERNAL PROVIDER LINKED");
      expect(text).toContain("Hello,");
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
    });

    it("HTMLタグを含まない", async () => {
      const html = await render(
        await IdentityLinkedNotificationEmail(testProps)
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
        await IdentityLinkedNotificationEmail(propsWithoutLocale as typeof testProps)
      );

      // 英語版のコンテンツが含まれていることを確認
      expect(html).toContain("External Provider Linked");
      expect(html).toContain("Hello,");
    });
  });
});
