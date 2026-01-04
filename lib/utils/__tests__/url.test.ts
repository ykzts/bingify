import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getAbsoluteUrl, getBaseUrl, validateRedirectPath } from "../url";

describe("getBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("明示的に定義されたNEXT_PUBLIC_SITE_URLを返す", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    expect(getBaseUrl()).toBe("https://example.com");
  });

  test("プレビュー環境でVercel Branch URLを返す", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_BRANCH_URL", "my-branch-abc123.vercel.app");

    expect(getBaseUrl()).toBe("https://my-branch-abc123.vercel.app");
  });

  test("プレビューでNEXT_PUBLIC_*変数を使用してVercel Branch URLを返す", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_BRANCH_URL", "my-branch-abc123.vercel.app");

    expect(getBaseUrl()).toBe("https://my-branch-abc123.vercel.app");
  });

  test("NEXT_PUBLIC_VERCEL_BRANCH_URLがVERCEL_BRANCH_URLより優先される", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv(
      "NEXT_PUBLIC_VERCEL_BRANCH_URL",
      "next-public-branch.vercel.app"
    );
    vi.stubEnv("VERCEL_BRANCH_URL", "old-branch.vercel.app");

    expect(getBaseUrl()).toBe("https://next-public-branch.vercel.app");
  });

  test("プレビューでBranch URLが利用できない場合にVercel URLを返す", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "my-preview-xyz789.vercel.app");

    expect(getBaseUrl()).toBe("https://my-preview-xyz789.vercel.app");
  });

  test("プレビューでBranch URLが利用できない場合にNEXT_PUBLIC_VERCEL_URLを返す", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "my-preview-xyz789.vercel.app");

    expect(getBaseUrl()).toBe("https://my-preview-xyz789.vercel.app");
  });

  test("Vercel本番環境で本番URLを返す", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "myapp.vercel.app");

    expect(getBaseUrl()).toBe("https://myapp.vercel.app");
  });

  test("NEXT_PUBLIC_*変数を使用して本番URLを返す", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "myapp.vercel.app");

    expect(getBaseUrl()).toBe("https://myapp.vercel.app");
  });

  test("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URLがVERCEL_PROJECT_PRODUCTION_URLより優先される", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
      "next-public-production.vercel.app"
    );
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "old-production.vercel.app");

    expect(getBaseUrl()).toBe("https://next-public-production.vercel.app");
  });

  test("ローカル開発でlocalhostを返す", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    vi.stubEnv("NODE_ENV", undefined);
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });

  test("NEXT_PUBLIC_SITE_URLがVercel変数より優先される", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://custom-domain.com");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_BRANCH_URL", "my-branch.vercel.app");

    expect(getBaseUrl()).toBe("https://custom-domain.com");
  });

  test("本番環境でVercel URLが利用できない場合にlocalhostを返す", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);

    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("getAbsoluteUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("パスが提供されない場合にベースURLを返す", () => {
    expect(getAbsoluteUrl()).toBe("https://example.com/");
  });

  test("空文字列のパスが提供された場合にベースURLを返す", () => {
    expect(getAbsoluteUrl("")).toBe("https://example.com/");
  });

  test("ベースURLとパスを正しく結合する", () => {
    expect(getAbsoluteUrl("/spaces/123")).toBe(
      "https://example.com/spaces/123"
    );
  });

  test("先頭のスラッシュがないパスとベースURLを正しく結合する", () => {
    expect(getAbsoluteUrl("spaces/123")).toBe("https://example.com/spaces/123");
  });

  test("クエリパラメータを含むパスとベースURLを正しく結合する", () => {
    expect(getAbsoluteUrl("/search?q=test")).toBe(
      "https://example.com/search?q=test"
    );
  });

  test("ハッシュを含むパスを処理する", () => {
    expect(getAbsoluteUrl("/page#section")).toBe(
      "https://example.com/page#section"
    );
  });

  test("プロトコル相対URLを正しく処理する", () => {
    expect(getAbsoluteUrl("//spaces//123")).toBe("https://spaces//123");
  });

  test("複雑なパスを処理する", () => {
    expect(getAbsoluteUrl("/api/v1/users/123/posts?sort=desc&limit=10")).toBe(
      "https://example.com/api/v1/users/123/posts?sort=desc&limit=10"
    );
  });

  test("相対パスを正しく処理する", () => {
    expect(getAbsoluteUrl("../relative/path")).toBe(
      "https://example.com/relative/path"
    );
  });

  test("パス内の特殊文字を処理する", () => {
    expect(getAbsoluteUrl("/path/with!special@chars")).toBe(
      "https://example.com/path/with!special@chars"
    );
  });

  test("異なるベースURLで動作する", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(getAbsoluteUrl("/dashboard")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  test("パスの末尾のスラッシュを保持する", () => {
    expect(getAbsoluteUrl("/spaces/")).toBe("https://example.com/spaces/");
  });
});

describe("validateRedirectPath", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("有効な相対パスを返す", () => {
    expect(validateRedirectPath("/dashboard")).toBe("/dashboard");
  });

  test("クエリパラメータ付きの有効なパスを返す", () => {
    expect(validateRedirectPath("/spaces?id=123")).toBe("/spaces?id=123");
  });

  test("ハッシュ付きの有効なパスを返す", () => {
    expect(validateRedirectPath("/page#section")).toBe("/page#section");
  });

  test("null入力に対してフォールバックを返す", () => {
    expect(validateRedirectPath(null)).toBe("/");
  });

  test("undefined入力に対してフォールバックを返す", () => {
    expect(validateRedirectPath(undefined)).toBe("/");
  });

  test("空文字列に対してフォールバックを返す", () => {
    expect(validateRedirectPath("")).toBe("/");
  });

  test("空白のみの文字列に対してフォールバックを返す", () => {
    expect(validateRedirectPath("   ")).toBe("/");
  });

  test("カスタムフォールバックパスを使用する", () => {
    expect(validateRedirectPath(null, "/en")).toBe("/en");
  });

  test("プロトコル相対URL (//)を拒否する", () => {
    expect(validateRedirectPath("//evil.com")).toBe("/");
  });

  test("httpプロトコル付きの絶対URLを拒否する", () => {
    expect(validateRedirectPath("http://evil.com")).toBe("/");
  });

  test("httpsプロトコル付きの絶対URLを拒否する", () => {
    expect(validateRedirectPath("https://evil.com")).toBe("/");
  });

  test("javascript:プロトコルを拒否する", () => {
    expect(validateRedirectPath("javascript:alert(1)")).toBe("/");
  });

  test("data:プロトコルを拒否する", () => {
    expect(
      validateRedirectPath("data:text/html,<script>alert(1)</script>")
    ).toBe("/");
  });

  test("vbscript:プロトコルを拒否する", () => {
    expect(validateRedirectPath("vbscript:alert(1)")).toBe("/");
  });

  test("file:プロトコルを拒否する", () => {
    expect(validateRedirectPath("file:///etc/passwd")).toBe("/");
  });

  test("about:プロトコルを拒否する", () => {
    expect(validateRedirectPath("about:blank")).toBe("/");
  });

  test("..を含むパストラバーサルを拒否する", () => {
    expect(validateRedirectPath("/../../etc/passwd")).toBe("/");
  });

  test("中間のパストラバーサルを拒否する", () => {
    expect(validateRedirectPath("/safe/../dangerous")).toBe("/");
  });

  test("バックスラッシュ付きのパストラバーサルを拒否する", () => {
    expect(validateRedirectPath("/..\\etc\\passwd")).toBe("/");
  });

  test("先頭のバックスラッシュ付きのパストラバーサルを拒否する", () => {
    expect(validateRedirectPath("\\..\\file")).toBe("/");
  });

  test("改行文字を拒否する", () => {
    expect(validateRedirectPath("/path\nwith\nnewlines")).toBe("/");
  });

  test("キャリッジリターン文字を拒否する", () => {
    expect(validateRedirectPath("/path\rwith\rreturns")).toBe("/");
  });

  test("タブ文字を拒否する", () => {
    expect(validateRedirectPath("/path\twith\ttabs")).toBe("/");
  });

  test("ヌルバイトを拒否する", () => {
    expect(validateRedirectPath("/path\0with\0nulls")).toBe("/");
  });

  test("URLエンコードされた有効なパスを処理する", () => {
    expect(validateRedirectPath("/spaces%2F123")).toBe("/spaces/123");
  });

  test("URLエンコードされたプロトコル相対URLを拒否する", () => {
    expect(validateRedirectPath("%2F%2Fevil.com")).toBe("/");
  });

  test("二重エンコードされたプロトコル相対URLを拒否する", () => {
    expect(validateRedirectPath("%252F%252Fevil.com")).toBe("/");
  });

  test("三重エンコードされたプロトコル相対URLを拒否する", () => {
    expect(validateRedirectPath("%25252F%25252Fevil.com")).toBe("/");
  });

  test("二重エンコードされた絶対URLを拒否する", () => {
    expect(validateRedirectPath("https%253A%252F%252Fevil.com")).toBe("/");
  });

  test("不正なエンコードパスを拒否する", () => {
    expect(validateRedirectPath("%XX%invalid")).toBe("/");
  });

  test("安全な特殊文字を含むパスを受け入れる", () => {
    expect(validateRedirectPath("/path/with-dash_underscore")).toBe(
      "/path/with-dash_underscore"
    );
  });

  test("エンコードされたスペースを含むパスを受け入れる", () => {
    expect(validateRedirectPath("/path%20with%20spaces")).toBe(
      "/path%20with%20spaces"
    );
  });

  test("パスを正しく正規化する", () => {
    expect(validateRedirectPath("/path//double//slash")).toBe(
      "/path//double//slash"
    );
  });

  test("検証後にクエリパラメータを保持する", () => {
    expect(validateRedirectPath("/search?q=test&page=2")).toBe(
      "/search?q=test&page=2"
    );
  });

  test("検証後にハッシュを保持する", () => {
    expect(validateRedirectPath("/page#section-1")).toBe("/page#section-1");
  });

  test("複雑な有効なパスを処理する", () => {
    expect(
      validateRedirectPath("/en/dashboard/spaces/123?view=edit#settings")
    ).toBe("/en/dashboard/spaces/123?view=edit#settings");
  });
});
