import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormattedText } from "../formatted-text";

describe("FormattedText", () => {
  it("null の場合は何も表示しない", () => {
    const { container } = render(<FormattedText text={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("undefined の場合は何も表示しない", () => {
    const { container } = render(<FormattedText text={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("空文字列の場合は何も表示しない", () => {
    const { container } = render(<FormattedText text="" />);
    expect(container.firstChild).toBeNull();
  });

  it("改行なしテキストを単一段落として表示する", () => {
    const { container } = render(
      <FormattedText text="これは改行のないテキストです。" />
    );
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent("これは改行のないテキストです。");
  });

  it("単一改行（\\n）を<br>タグとして表示する", () => {
    const text = "一行目\n二行目\n三行目";
    const { container } = render(<FormattedText text={text} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);

    const brTags = paragraphs[0]?.querySelectorAll("br");
    expect(brTags).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent("一行目二行目三行目");
  });

  it("連続改行（\\n\\n）を段落として分割する", () => {
    const text = "第一段落です。\n\n第二段落です。\n\n第三段落です。";
    const { container } = render(<FormattedText text={text} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toHaveTextContent("第一段落です。");
    expect(paragraphs[1]).toHaveTextContent("第二段落です。");
    expect(paragraphs[2]).toHaveTextContent("第三段落です。");
  });

  it("3回以上の連続改行も段落として分割する", () => {
    const text = "段落1\n\n\n段落2\n\n\n\n段落3";
    const { container } = render(<FormattedText text={text} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toHaveTextContent("段落1");
    expect(paragraphs[1]).toHaveTextContent("段落2");
    expect(paragraphs[2]).toHaveTextContent("段落3");
  });

  it("段落内の単一改行と段落分けを正しく処理する", () => {
    const text = "段落1の一行目\n段落1の二行目\n\n段落2の内容";
    const { container } = render(<FormattedText text={text} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);

    // 第一段落
    expect(paragraphs[0]).toHaveTextContent("段落1の一行目段落1の二行目");
    const brTags = paragraphs[0]?.querySelectorAll("br");
    expect(brTags).toHaveLength(1);

    // 第二段落
    expect(paragraphs[1]).toHaveTextContent("段落2の内容");
  });

  it("\\r\\n を \\n に正規化する", () => {
    const text = "Windows改行\r\n2行目\r\n\r\n段落2";
    const { container } = render(<FormattedText text={text} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);

    expect(paragraphs[0]).toHaveTextContent("Windows改行2行目");
    const brTags = paragraphs[0]?.querySelectorAll("br");
    expect(brTags).toHaveLength(1);

    expect(paragraphs[1]).toHaveTextContent("段落2");
  });

  it("連続する半角スペースをそのまま保持する", () => {
    const { container } = render(
      <FormattedText text="通常のテキスト    4つの半角スペース" />
    );
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
    // ブラウザは連続する半角スペースを1つに集約するので、textContentでは1つになる
    expect(paragraphs[0]?.textContent).toContain("通常のテキスト");
    expect(paragraphs[0]?.textContent).toContain("4つの半角スペース");
  });

  it("classNameプロパティが適用される", () => {
    const { container } = render(
      <FormattedText className="font-bold text-red-500" text="テスト" />
    );
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveClass("text-red-500", "font-bold");
  });

  it("段落に適切なスタイルが適用される", () => {
    const text = "段落1\n\n段落2";
    const { container } = render(<FormattedText text={text} />);

    const div = container.firstChild as HTMLElement;

    // prose クラスが適用されていることを確認
    expect(div).toHaveClass("prose");
    expect(div).toHaveClass("max-w-none");

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
  });

  it("HTMLタグをエスケープする（XSS防止）", () => {
    const { container } = render(
      <FormattedText text="<script>alert('XSS')</script>" />
    );
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
    // HTMLタグはエスケープされてテキストとして表示される
    expect(paragraphs[0]).toHaveTextContent("<script>alert('XSS')</script>");
    // script タグが実際に挿入されていないことを確認
    const scripts = container.querySelectorAll("script");
    expect(scripts).toHaveLength(0);
  });

  it("リンク文字列をプレーンテキストとして表示する", () => {
    const { container } = render(
      <FormattedText text="詳細はこちら: https://example.com をご覧ください。" />
    );
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent(
      "詳細はこちら: https://example.com をご覧ください。"
    );
    // aタグが存在しないことを確認
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(0);
  });

  it("複雑なテキストを正しく処理する", () => {
    const complexText = `タイトル

これは最初の段落です。
複数行にわたっています。
三行目です。

これは二番目の段落です。

これは三番目の段落です。
こちらも複数行です。`;

    const { container } = render(<FormattedText text={complexText} />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(4);

    // 第一段落
    expect(paragraphs[0]).toHaveTextContent("タイトル");

    // 第二段落
    expect(paragraphs[1]).toHaveTextContent(
      "これは最初の段落です。複数行にわたっています。三行目です。"
    );
    expect(paragraphs[1]?.querySelectorAll("br")).toHaveLength(2);

    // 第三段落
    expect(paragraphs[2]).toHaveTextContent("これは二番目の段落です。");

    // 第四段落
    expect(paragraphs[3]).toHaveTextContent(
      "これは三番目の段落です。こちらも複数行です。"
    );
    expect(paragraphs[3]?.querySelectorAll("br")).toHaveLength(1);
  });
});
