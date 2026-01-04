/**
 * Vercel環境サポート付きURL生成ユーティリティ
 */

/**
 * 以下の優先順位でアプリケーションのベースURLを取得する:
 * 1. NEXT_PUBLIC_SITE_URL（明示的に定義）
 * 2. Vercelプレビュー環境（NEXT_PUBLIC_VERCEL_BRANCH_URL または NEXT_PUBLIC_VERCEL_URL）
 * 3. Vercel本番環境（NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL）
 * 4. ローカル開発のフォールバック（http://localhost:3000）
 */
export function getBaseUrl(): string {
  // 1. 明示的に定義されたURL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // 2. Vercelプレビュー & 本番のフォールバック
  if (process.env.NODE_ENV === "production") {
    const vercelEnv =
      process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;

    if (vercelEnv === "preview") {
      const vercelUrl =
        process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL ||
        process.env.VERCEL_BRANCH_URL ||
        process.env.NEXT_PUBLIC_VERCEL_URL ||
        process.env.VERCEL_URL;
      if (vercelUrl) {
        return `https://${vercelUrl}`;
      }
    }

    const productionUrl =
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (productionUrl) {
      return `https://${productionUrl}`;
    }
  }

  // 3. ローカルのフォールバック
  return "http://localhost:3000";
}

/**
 * ベースURLとパスを結合して絶対URLを生成する
 * @param path - ベースURLに追加するオプションのパス（例: "/spaces/123"）
 * @returns 完全な絶対URL
 */
export function getAbsoluteUrl(path = ""): string {
  const baseUrl = getBaseUrl();
  try {
    return new URL(path, baseUrl).toString();
  } catch (e) {
    // パスが無効な場合はベースURLにフォールバック
    console.error("Failed to construct URL:", e);
    return baseUrl;
  }
}

const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const DANGEROUS_PROTOCOLS = /(?:javascript|data|vbscript|file|about):/i;
const CONTROL_CHARS_PATTERN = /[\r\n\t\0]/;
const PATH_TRAVERSAL_PATTERN = /(\.\.[/\\]|[/\\]\.\.)/;

/**
 * オープンリダイレクト脆弱性を防ぐためにリダイレクトパスを検証およびサニタイズする
 * @param redirect - 検証するリダイレクトパス（クエリパラメータから）
 * @param fallbackPath - 検証が失敗した場合に使用するフォールバックパス（デフォルト: "/"）
 * @returns 安全なリダイレクトパス
 */
export function validateRedirectPath(
  redirect: string | null | undefined,
  fallbackPath = "/"
): string {
  let redirectPath =
    redirect && redirect.trim() !== "" ? redirect : fallbackPath;

  // URIコンポーネントをデコードしてエンコードされた文字を処理
  try {
    redirectPath = decodeURIComponent(redirectPath);
  } catch {
    return fallbackPath;
  }

  // パストラバーサルパターンをチェック
  if (PATH_TRAVERSAL_PATTERN.test(redirectPath)) {
    return fallbackPath;
  }

  // 単一のスラッシュで始まる必要があり、プロトコル相対URL (//) を拒否
  if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
    return fallbackPath;
  }

  // プロトコルスキームをチェック
  if (PROTOCOL_PATTERN.test(redirectPath)) {
    return fallbackPath;
  }

  // 危険なプロトコルハンドラをチェック
  if (DANGEROUS_PROTOCOLS.test(redirectPath)) {
    return fallbackPath;
  }

  // 制御文字と改行を拒否
  if (CONTROL_CHARS_PATTERN.test(redirectPath)) {
    return fallbackPath;
  }

  // ベースURLを使用してURLコンストラクタで正規化と検証
  try {
    const origin = getBaseUrl();
    const testUrl = new URL(redirectPath, origin);

    // originが一致し、プロトコルが安全であることを確認
    if (
      testUrl.origin !== origin ||
      (testUrl.protocol !== "http:" && testUrl.protocol !== "https:")
    ) {
      return fallbackPath;
    }

    // URLオブジェクトから正規化されたpathnameを使用
    return testUrl.pathname + testUrl.search + testUrl.hash;
  } catch {
    return fallbackPath;
  }
}
