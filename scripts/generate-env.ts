#!/usr/bin/env node
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

const ENV_FILE = path.join(process.cwd(), ".env");
const TEMPLATE_FILE = path.join(process.cwd(), ".env.example");
const LINE_SPLIT_REGEX = /\r?\n/;
const QUOTED_VALUE_REGEX = /^(["'])(.*)\1$/;

// 必須の環境変数
const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

// 自動生成が必要なシークレット
const AUTO_GENERATED_SECRETS = ["CRON_SECRET"];

/**
 * プロセス環境変数から値を収集する
 */
const collectProcessEnvValues = (): Record<string, string> => {
  const values: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }

  return values;
};

/**
 * Supabaseの実行中のインスタンスから設定を取得する
 */
const fetchSupabaseConfig = (): {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
} | null => {
  try {
    const output = execSync("pnpm exec supabase status -o json", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const config = JSON.parse(output);
    const { API_URL, ANON_KEY, SERVICE_ROLE_KEY } = config ?? {};

    if (API_URL && ANON_KEY && SERVICE_ROLE_KEY) {
      return { ANON_KEY, API_URL, SERVICE_ROLE_KEY };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * .env.exampleファイルを読み込んでパースする
 */
const parseEnvTemplate = (content: string): Record<string, string> => {
  const values: Record<string, string> = {};

  for (const line of content.split(LINE_SPLIT_REGEX)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    values[key] = value;
  }

  return values;
};

/**
 * 既存の.envファイルから値を読み込む
 */
const parseExistingEnv = (filePath: string): Record<string, string> => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  return parseEnvTemplate(content);
};

/**
 * 既存の環境変数値を収集する（ファイル＋プロセス環境変数）
 */
const collectExistingValues = (
  filePath: string,
  includeProcessEnv = false
): Record<string, string> => {
  const fileValues = parseExistingEnv(filePath);

  if (includeProcessEnv) {
    return {
      ...fileValues,
      ...collectProcessEnvValues(),
    };
  }

  return fileValues;
};

/**
 * ランダムなシークレットキーを生成する
 */
const generateSecret = (prefix = ""): string => {
  const secret = randomBytes(32).toString("base64");
  return prefix ? `${prefix}${secret}` : secret;
};

/**
 * 引用符を適切に処理する
 */
const wrapWithTemplateQuotes = (
  value: string,
  templateValue: string
): string => {
  if (QUOTED_VALUE_REGEX.test(value)) {
    return value;
  }

  const quoteMatch = templateValue.match(QUOTED_VALUE_REGEX);
  if (!quoteMatch) {
    return value;
  }

  const quote = quoteMatch[1];
  return `${quote}${value}${quote}`;
};

/**
 * 対話的にユーザーから入力を取得する
 */
const promptUser = async (
  rl: readline.Interface,
  key: string,
  currentValue: string,
  isRequired: boolean
): Promise<string> => {
  const requiredLabel = isRequired ? " (必須)" : " (オプション)";
  const defaultLabel = currentValue ? ` [現在値: ${currentValue}]` : "";

  const answer = await rl.question(`${key}${requiredLabel}${defaultLabel}: `);

  return answer.trim() || currentValue;
};

/**
 * 必須項目のバリデーション
 */
const validateRequired = (values: Record<string, string>): string[] => {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!values[key] || values[key].trim() === "") {
      missing.push(key);
    }
  }

  return missing;
};

/**
 * .envファイルを生成する
 */
const generateEnvFile = (
  templateContent: string,
  values: Record<string, string>
): string => {
  const templateLines = templateContent.split(LINE_SPLIT_REGEX);

  const renderedLines = templateLines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return line;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      return line;
    }

    const key = line.slice(0, eqIndex).trim();
    const templateValue = line.slice(eqIndex + 1);

    if (Object.hasOwn(values, key)) {
      return `${key}=${wrapWithTemplateQuotes(values[key], templateValue)}`;
    }

    return line;
  });

  const newContent = renderedLines.join("\n");
  return newContent.endsWith("\n") ? newContent : `${newContent}\n`;
};

/**
 * 既存ファイルの上書き確認
 */
const confirmOverwrite = async (): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question(
    "\n⚠️  .env は既に存在します。上書きしますか？ (y/N): "
  );
  rl.close();

  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
};

/**
 * 自動生成シークレットを生成
 */
const generateAutoSecrets = (
  mergedValues: Record<string, string>
): Record<string, string> => {
  const result = { ...mergedValues };

  for (const key of AUTO_GENERATED_SECRETS) {
    if (!result[key] || result[key].trim() === "") {
      result[key] = generateSecret();
      console.log(`✨ ${key} を自動生成しました`);
    }
  }

  return result;
};

/**
 * 対話的に必須項目を入力
 */
const promptRequiredValues = async (
  rl: readline.Interface,
  mergedValues: Record<string, string>
): Promise<Record<string, string>> => {
  const result = { ...mergedValues };

  console.log("\n📝 必須項目を設定してください:\n");

  for (const key of REQUIRED_VARS) {
    const currentValue = result[key] || "";
    const newValue = await promptUser(rl, key, currentValue, true);
    if (newValue) {
      result[key] = newValue;
    }
  }

  return result;
};

/**
 * 対話的にオプション項目を入力
 */
const promptOptionalValues = async (
  rl: readline.Interface,
  mergedValues: Record<string, string>,
  templateValues: Record<string, string>
): Promise<Record<string, string>> => {
  const result = { ...mergedValues };

  console.log(
    "\n📝 オプション項目を設定しますか？ (スキップする場合は Enter)\n"
  );

  // オプション項目の入力
  const optionalKeys = Object.keys(templateValues).filter(
    (key) =>
      !(REQUIRED_VARS.includes(key) || AUTO_GENERATED_SECRETS.includes(key))
  );

  const answer = await rl.question("オプション項目を設定しますか？ (y/N): ");

  if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
    for (const key of optionalKeys) {
      const currentValue = result[key] || templateValues[key] || "";
      const newValue = await promptUser(rl, key, currentValue, false);
      if (newValue) {
        result[key] = newValue;
      }
    }
  }

  return result;
};

/**
 * テンプレート値でデフォルトを補完
 */
const mergeTemplateDefaults = (
  values: Record<string, string>,
  templateValues: Record<string, string>
): Record<string, string> => {
  const result = { ...values };

  for (const [key, value] of Object.entries(templateValues)) {
    if (!result[key]) {
      result[key] = value;
    }
  }

  return result;
};

/**
 * Supabaseモードで設定を取得する
 */
const handleSupabaseMode = (): ReturnType<typeof fetchSupabaseConfig> => {
  console.log("🔄 Supabase インスタンスから設定を取得しています...");
  const supabaseConfig = fetchSupabaseConfig();

  if (!supabaseConfig) {
    console.error("❌ Supabase の設定を取得できませんでした");
    console.error(
      'Supabase が起動していることを確認してください: "pnpm exec supabase start"'
    );
    process.exit(1);
  }
  console.log("✅ Supabase の設定を取得しました");
  return supabaseConfig;
};

/**
 * 既存ファイルの上書き確認と処理
 */
const handleExistingFile = async (
  isInteractive: boolean,
  forceOverwrite: boolean
): Promise<void> => {
  if (!fs.existsSync(ENV_FILE) || forceOverwrite) {
    return;
  }

  if (isInteractive) {
    const shouldOverwrite = await confirmOverwrite();
    if (!shouldOverwrite) {
      console.log("✅ 処理をキャンセルしました");
      process.exit(0);
    }
  } else {
    console.log("ℹ️  .env は既に存在します。既存の値を保持します");
  }
};

/**
 * 対話的に値を収集する
 */
const collectInteractiveValues = async (
  mergedValues: Record<string, string>,
  templateValues: Record<string, string>
): Promise<Record<string, string>> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let result = await promptRequiredValues(rl, mergedValues);
  result = await promptOptionalValues(rl, result, templateValues);

  rl.close();
  return result;
};

/**
 * バリデーションエラーを表示
 */
const displayValidationErrors = (
  missing: string[],
  fromSupabase: boolean
): void => {
  console.error("\n❌ エラー: 以下の必須環境変数が設定されていません:");
  for (const key of missing) {
    console.error(`  - ${key}`);
  }
  if (fromSupabase) {
    console.error(
      '\nSupabase が起動していることを確認してください: "pnpm exec supabase start"'
    );
  } else {
    console.error("\n対話モードで実行するか、手動で設定してください。");
  }
};

/**
 * メイン処理
 */
const main = async () => {
  // コマンドライン引数の解析
  const args = process.argv.slice(2);
  const isInteractive = !args.includes("--non-interactive");
  const forceOverwrite = args.includes("--force");
  const fromSupabase = args.includes("--from-supabase");

  console.log("🚀 環境変数生成スクリプト\n");

  // テンプレートファイルの存在確認
  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error(`❌ エラー: ${TEMPLATE_FILE} が見つかりません`);
    process.exit(1);
  }

  // テンプレートと既存の値を読み込み
  const templateContent = fs.readFileSync(TEMPLATE_FILE, "utf8");
  const templateValues = parseEnvTemplate(templateContent);
  const existingValues = collectExistingValues(ENV_FILE, fromSupabase);

  // Supabaseから設定を取得
  const supabaseConfig = fromSupabase ? handleSupabaseMode() : null;

  // 既存ファイルの確認
  await handleExistingFile(isInteractive, forceOverwrite);

  // 値のマージ
  let mergedValues = { ...existingValues };

  // Supabaseの設定を適用
  if (supabaseConfig) {
    mergedValues.NEXT_PUBLIC_SUPABASE_URL = supabaseConfig.API_URL;
    mergedValues.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseConfig.ANON_KEY;
    mergedValues.SUPABASE_SERVICE_ROLE_KEY = supabaseConfig.SERVICE_ROLE_KEY;
  }

  // 自動生成シークレット
  mergedValues = generateAutoSecrets(mergedValues);

  // 対話モードでの入力
  if (isInteractive && !fromSupabase) {
    mergedValues = await collectInteractiveValues(mergedValues, templateValues);
  }

  // テンプレートの値をデフォルトとして使用
  mergedValues = mergeTemplateDefaults(mergedValues, templateValues);

  // バリデーション
  const missing = validateRequired(mergedValues);
  if (missing.length > 0) {
    displayValidationErrors(missing, fromSupabase);
    process.exit(1);
  }

  // .env ファイルを生成
  const newContent = generateEnvFile(templateContent, mergedValues);
  fs.writeFileSync(ENV_FILE, newContent);

  console.log("\n✅ .env を生成しました");
  console.log(`\n📄 ファイル: ${ENV_FILE}`);

  if (!fromSupabase) {
    console.log("\n次のステップ:");
    console.log("  1. .env を確認して、必要に応じて編集してください");
    console.log("  2. pnpm dev でアプリケーションを起動してください");
  }
};

// Export functions for testing
export {
  LINE_SPLIT_REGEX,
  QUOTED_VALUE_REGEX,
  generateEnvFile,
  parseEnvTemplate,
  validateRequired,
  wrapWithTemplateQuotes,
};

// Run main only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(
      "\n❌ エラーが発生しました:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  });
}
