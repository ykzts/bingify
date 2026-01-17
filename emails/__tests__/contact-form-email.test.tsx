import { render, toPlainText } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { ContactFormEmail } from "../contact-form-email";

// 行頭の連続スペース検出用の正規表現（トップレベルで定義）
const THREE_OR_MORE_LEADING_SPACES = /^ {3}/;

describe("ContactFormEmail", () => {
  const testProps = {
    email: "user@example.com",
    locale: "ja" as const,
    message: "これはテストメッセージです。\n複数行のテキストが含まれています。",
    name: "テストユーザー",
  };

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("HTML版のレンダリング (日本語)", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("正しくHTMLメールをレンダリングする", async () => {
      const html = await render(await ContactFormEmail(testProps));

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="ja"');

      // コンテンツの確認
      expect(html).toContain("お問い合わせ");
      expect(html).toContain(testProps.name);
      expect(html).toContain(testProps.email);
      expect(html).toContain(testProps.message);
    });

    it("ユーザー入力をエスケープする", async () => {
      const propsWithHtml = {
        email: 'test@example.com"><script>alert("xss")</script>',
        locale: "ja" as const,
        message: "<b>Bold text</b> & <script>alert('test')</script>",
        name: '<img src="x" onerror="alert(1)">',
      };

      const html = await render(await ContactFormEmail(propsWithHtml));

      // HTMLタグがエスケープされていることを確認
      expect(html).not.toContain("<script>");
      expect(html).not.toContain('onerror="alert');
      expect(html).toContain("&lt;");
      expect(html).toContain("&gt;");
    });

    it("改行を含むメッセージを正しく処理する", async () => {
      const propsWithNewlines = {
        email: "test@example.com",
        locale: "ja" as const,
        message: "1行目\n2行目\n3行目",
        name: "テストユーザー",
      };

      const html = await render(await ContactFormEmail(propsWithNewlines));

      // メッセージが含まれていることを確認
      expect(html).toContain(propsWithNewlines.message);
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("HTML版のレンダリング (英語)", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    const englishProps = {
      email: "user@example.com",
      locale: "en" as const,
      message: "This is a test message.\nIt contains multiple lines.",
      name: "Test User",
    };

    it("正しくHTMLメールをレンダリングする", async () => {
      const html = await render(await ContactFormEmail(englishProps));

      // HTML構造の確認
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain('lang="en"');

      // コンテンツの確認
      expect(html).toContain("Contact Form");
      expect(html).toContain(englishProps.name);
      expect(html).toContain(englishProps.email);
      expect(html).toContain(englishProps.message);
    });

    it("英語ラベルが正しく表示される", async () => {
      const html = await render(await ContactFormEmail(englishProps));

      expect(html).toContain("Name:");
      expect(html).toContain("Email Address:");
      expect(html).toContain("Message:");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("テキスト版のレンダリング (日本語)", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("正しくプレーンテキストメールをレンダリングする", async () => {
      const html = await render(await ContactFormEmail(testProps));
      const text = toPlainText(html);

      // テキスト版の内容確認
      expect(text).toContain("お問い合わせ");
      expect(text).toContain("名前:");
      expect(text).toContain(testProps.name);
      expect(text).toContain("メールアドレス:");
      expect(text).toContain(testProps.email);
      expect(text).toContain("本文:");
      // プレーンテキスト版では改行がスペースに変換される
      expect(text).toContain("これはテストメッセージです。");
      expect(text).toContain("複数行のテキストが含まれています。");
    });

    it("HTMLタグを含まない", async () => {
      const html = await render(await ContactFormEmail(testProps));
      const text = toPlainText(html);

      // HTMLタグが含まれていないことを確認
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
      expect(text).not.toContain("&lt;");
      expect(text).not.toContain("&gt;");
    });

    it("不要な空白や改行が整形されている", async () => {
      const html = await render(await ContactFormEmail(testProps));
      const text = toPlainText(html);

      // テンプレートリテラルのインデント由来の不要な空白がないことを確認
      const lines = text.split("\n");

      // 各行の先頭に過剰な空白がないことを確認
      for (const line of lines) {
        if (line.trim() !== "") {
          // 空行以外で、行頭に3つ以上の連続スペースがないことを確認
          expect(line).not.toMatch(THREE_OR_MORE_LEADING_SPACES);
        }
      }

      // 先頭と末尾の不要な空白が除去されていることを確認
      expect(text.trim()).toBe(text);
    });

    it("改行を含むメッセージを正しく処理する", async () => {
      const propsWithNewlines = {
        email: "test@example.com",
        locale: "ja" as const,
        message: "1行目\n2行目\n3行目",
        name: "テストユーザー",
      };

      const html = await render(await ContactFormEmail(propsWithNewlines));
      const text = toPlainText(html);

      // プレーンテキスト版では改行がスペースに変換される
      expect(text).toContain("1行目");
      expect(text).toContain("2行目");
      expect(text).toContain("3行目");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("テキスト版のレンダリング (英語)", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    const englishProps = {
      email: "user@example.com",
      locale: "en" as const,
      message: "This is a test message.\nIt contains multiple lines.",
      name: "Test User",
    };

    it("正しくプレーンテキストメールをレンダリングする", async () => {
      const html = await render(await ContactFormEmail(englishProps));
      const text = toPlainText(html);

      // テキスト版の内容確認
      expect(text).toContain("Contact Form");
      expect(text).toContain("Name:");
      expect(text).toContain(englishProps.name);
      expect(text).toContain("Email Address:");
      expect(text).toContain(englishProps.email);
      expect(text).toContain("Message:");
      expect(text).toContain("This is a test message.");
      expect(text).toContain("It contains multiple lines.");
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("プレビューテキスト", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("送信者名を含むプレビューテキストを生成する (日本語)", async () => {
      const html = await render(await ContactFormEmail(testProps));

      // プレビューテキストが含まれていることを確認
      expect(html).toContain(`${testProps.name}様からお問い合わせがありました`);
    });

    it("送信者名を含むプレビューテキストを生成する (英語)", async () => {
      const englishProps = {
        email: "user@example.com",
        locale: "en" as const,
        message: "Test message",
        name: "John Doe",
      };

      const html = await render(await ContactFormEmail(englishProps));

      // プレビューテキストが含まれていることを確認
      expect(html).toContain(
        `You have received an inquiry from ${englishProps.name}`
      );
    });
  });

  // biome-ignore lint/suspicious/noSkippedTests: Server-only function (getTranslations) cannot be tested in jsdom
  describe.skip("デフォルトロケール", () => {
    // NOTE: getTranslations は Server-only function です。
    // テスト環境では実行できないため、Integration Tests で検証してください。
    it("locale未指定時は日本語がデフォルトになる", async () => {
      const propsWithoutLocale = {
        email: testProps.email,
        message: testProps.message,
        name: testProps.name,
      };
      const html = await render(
        await ContactFormEmail(propsWithoutLocale as typeof testProps)
      );

      expect(html).toContain('lang="ja"');
      expect(html).toContain("お問い合わせ");
      expect(html).toContain("名前:");
    });
  });
});
