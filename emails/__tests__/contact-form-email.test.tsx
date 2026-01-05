import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import { ContactFormEmail } from "../contact-form-email";

describe("ContactFormEmail", () => {
  const testProps = {
    email: "user@example.com",
    message: "これはテストメッセージです。\n複数行のテキストが含まれています。",
    name: "テストユーザー",
  };

  describe("HTML版のレンダリング", () => {
    it("正しくHTMLメールをレンダリングする", async () => {
      const html = await render(ContactFormEmail(testProps));

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
        message: "<b>Bold text</b> & <script>alert('test')</script>",
        name: '<img src="x" onerror="alert(1)">',
      };

      const html = await render(ContactFormEmail(propsWithHtml));

      // HTMLタグがエスケープされていることを確認
      expect(html).not.toContain("<script>");
      expect(html).not.toContain('onerror="alert');
      expect(html).toContain("&lt;");
      expect(html).toContain("&gt;");
    });

    it("改行を含むメッセージを正しく処理する", async () => {
      const propsWithNewlines = {
        email: "test@example.com",
        message: "1行目\n2行目\n3行目",
        name: "テストユーザー",
      };

      const html = await render(ContactFormEmail(propsWithNewlines));

      // メッセージが含まれていることを確認
      expect(html).toContain(propsWithNewlines.message);
    });
  });

  describe("テキスト版のレンダリング", () => {
    it("正しくプレーンテキストメールをレンダリングする", async () => {
      const text = await render(ContactFormEmail(testProps), {
        plainText: true,
      });

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
      const text = await render(ContactFormEmail(testProps), {
        plainText: true,
      });

      // HTMLタグが含まれていないことを確認
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
      expect(text).not.toContain("&lt;");
      expect(text).not.toContain("&gt;");
    });

    it("不要な空白や改行が整形されている", async () => {
      const text = await render(ContactFormEmail(testProps), {
        plainText: true,
      });

      // テンプレートリテラルのインデント由来の不要な空白がないことを確認
      const lines = text.split("\n");

      // 各行の先頭に過剰な空白がないことを確認
      for (const line of lines) {
        if (line.trim() !== "") {
          // 空行以外で、行頭に3つ以上の連続スペースがないことを確認
          expect(line).not.toMatch(/^   /);
        }
      }

      // 先頭と末尾の不要な空白が除去されていることを確認
      expect(text.trim()).toBe(text);
    });

    it("改行を含むメッセージを正しく処理する", async () => {
      const propsWithNewlines = {
        email: "test@example.com",
        message: "1行目\n2行目\n3行目",
        name: "テストユーザー",
      };

      const text = await render(ContactFormEmail(propsWithNewlines), {
        plainText: true,
      });

      // プレーンテキスト版では改行がスペースに変換される
      expect(text).toContain("1行目");
      expect(text).toContain("2行目");
      expect(text).toContain("3行目");
    });
  });

  describe("プレビューテキスト", () => {
    it("送信者名を含むプレビューテキストを生成する", async () => {
      const html = await render(ContactFormEmail(testProps));

      // プレビューテキストが含まれていることを確認
      expect(html).toContain(`${testProps.name}様からお問い合わせがありました`);
    });
  });
});
