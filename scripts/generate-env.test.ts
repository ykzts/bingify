import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const TEST_ENV_FILE = path.join(process.cwd(), ".env.local.test");
const TEST_TEMPLATE_FILE = path.join(process.cwd(), ".env.local.example.test");
const LINE_SPLIT_REGEX = /\r?\n/;
const HOOK_SECRET_PREFIX_REGEX = /^v1,whsec_/;

// テスト用のヘルパー関数
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

    if (Object.hasOwn(values, key)) {
      return `${key}=${values[key]}`;
    }

    return line;
  });

  const newContent = renderedLines.join("\n");
  return newContent.endsWith("\n") ? newContent : `${newContent}\n`;
};

describe("generate-env スクリプト", () => {
  beforeEach(() => {
    // テストファイルのクリーンアップ
    if (fs.existsSync(TEST_ENV_FILE)) {
      fs.unlinkSync(TEST_ENV_FILE);
    }
    if (fs.existsSync(TEST_TEMPLATE_FILE)) {
      fs.unlinkSync(TEST_TEMPLATE_FILE);
    }
  });

  afterEach(() => {
    // テストファイルのクリーンアップ
    if (fs.existsSync(TEST_ENV_FILE)) {
      fs.unlinkSync(TEST_ENV_FILE);
    }
    if (fs.existsSync(TEST_TEMPLATE_FILE)) {
      fs.unlinkSync(TEST_TEMPLATE_FILE);
    }
  });

  it("テンプレートから新しい.env.localを生成する", () => {
    const templateContent = `# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# アプリケーション設定
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
`;

    const values: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    };

    const result = generateEnvFile(templateContent, values);
    fs.writeFileSync(TEST_ENV_FILE, result);

    const content = fs.readFileSync(TEST_ENV_FILE, "utf8");
    expect(content).toContain("# Supabase設定");
    expect(content).toContain(
      "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
    );
    expect(content).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key");
    expect(content).toContain(
      "SUPABASE_SERVICE_ROLE_KEY=test-service-role-key"
    );
    expect(content).toContain('NEXT_PUBLIC_SITE_URL="http://localhost:3000"');
  });

  it("既存の値を保持しながら新しい値でマージする", () => {
    const templateContent = `# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CUSTOM_VAR=default-value
`;

    const existingValues: Record<string, string> = {
      CUSTOM_VAR: "existing-value",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "old-anon-key",
    };

    const newValues: Record<string, string> = {
      ...existingValues,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "new-anon-key",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY: "new-service-role-key",
    };

    const result = generateEnvFile(templateContent, newValues);
    fs.writeFileSync(TEST_ENV_FILE, result);

    const content = fs.readFileSync(TEST_ENV_FILE, "utf8");
    expect(content).toContain("CUSTOM_VAR=existing-value");
    expect(content).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=new-anon-key");
    expect(content).toContain(
      "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
    );
    expect(content).not.toContain("old-anon-key");
  });

  it("コメント行を保持する", () => {
    const templateContent = `# ==========================================
# Supabase ローカル開発設定
# ==========================================
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# 認証キー
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# ==========================================
# アプリケーション設定
# ==========================================
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
`;

    const values: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    };

    const result = generateEnvFile(templateContent, values);
    fs.writeFileSync(TEST_ENV_FILE, result);

    const content = fs.readFileSync(TEST_ENV_FILE, "utf8");
    expect(content).toContain("# ==========================================");
    expect(content).toContain("# Supabase ローカル開発設定");
    expect(content).toContain("# 認証キー");
    expect(content).toContain("# アプリケーション設定");
  });

  it("引用符付きの値を正しく処理する", () => {
    const templateContent = `NEXT_PUBLIC_SITE_URL="http://localhost:3000"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
PLAIN_VALUE=test
`;

    const values: Record<string, string> = {
      NEXT_PUBLIC_SITE_URL: '"http://production.com"',
      PLAIN_VALUE: "test-value",
      SMTP_HOST: '"smtp.production.com"',
      SMTP_PORT: '"25"',
    };

    const result = generateEnvFile(templateContent, values);
    fs.writeFileSync(TEST_ENV_FILE, result);

    const content = fs.readFileSync(TEST_ENV_FILE, "utf8");
    expect(content).toContain('NEXT_PUBLIC_SITE_URL="http://production.com"');
    expect(content).toContain('SMTP_HOST="smtp.production.com"');
    expect(content).toContain('SMTP_PORT="25"');
    expect(content).toContain("PLAIN_VALUE=test-value");
  });

  it("空行を保持する", () => {
    const templateContent = `# Section 1
VAR1=value1

# Section 2
VAR2=value2

# Section 3
VAR3=value3
`;

    const values: Record<string, string> = {
      VAR1: "new-value1",
      VAR2: "new-value2",
      VAR3: "new-value3",
    };

    const result = generateEnvFile(templateContent, values);
    const lines = result.split("\n");

    // 空行の確認
    expect(lines[2]).toBe("");
    expect(lines[5]).toBe("");
  });

  it("値に等号(=)を含む環境変数を正しく処理する", () => {
    const templateContent = `BASE64_KEY=
JWT_SECRET=
NORMAL_VAR=value
`;

    const values: Record<string, string> = {
      BASE64_KEY: "aGVsbG8=d29ybGQ=",
      JWT_SECRET: "key==secret==value",
      NORMAL_VAR: "test",
    };

    const result = generateEnvFile(templateContent, values);
    fs.writeFileSync(TEST_ENV_FILE, result);

    const content = fs.readFileSync(TEST_ENV_FILE, "utf8");
    expect(content).toContain("BASE64_KEY=aGVsbG8=d29ybGQ=");
    expect(content).toContain("JWT_SECRET=key==secret==value");
    expect(content).toContain("NORMAL_VAR=test");
  });

  it("ランダムなシークレットを生成する", () => {
    const secret1 = randomBytes(32).toString("base64");
    const secret2 = randomBytes(32).toString("base64");

    expect(secret1).toHaveLength(44); // Base64エンコードされた32バイトは44文字
    expect(secret2).toHaveLength(44);
    expect(secret1).not.toBe(secret2); // 異なるシークレットが生成される
  });

  it("SEND_EMAIL_HOOK_SECRETSのプレフィックスを処理する", () => {
    const secret = `v1,whsec_${randomBytes(32).toString("base64")}`;
    expect(secret).toMatch(HOOK_SECRET_PREFIX_REGEX);
    expect(secret.length).toBeGreaterThan(50);
  });

  it("必須項目のバリデーションを行う", () => {
    const requiredVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    const incompleteValues: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    };

    const missing: string[] = [];
    for (const key of requiredVars) {
      if (!incompleteValues[key] || incompleteValues[key].trim() === "") {
        missing.push(key);
      }
    }

    expect(missing).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(missing).toHaveLength(1);
  });

  it("完全な値セットでバリデーションが成功する", () => {
    const requiredVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    const completeValues: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    };

    const missing: string[] = [];
    for (const key of requiredVars) {
      if (!completeValues[key] || completeValues[key].trim() === "") {
        missing.push(key);
      }
    }

    expect(missing).toHaveLength(0);
  });

  it("テンプレートファイルをパースする", () => {
    const content = `# Comment
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Another section
SUPABASE_SERVICE_ROLE_KEY=
SMTP_HOST="smtp.example.com"
`;

    const parsed = parseEnvTemplate(content);

    expect(parsed.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
    expect(parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("");
    expect(parsed.SUPABASE_SERVICE_ROLE_KEY).toBe("");
    expect(parsed.SMTP_HOST).toBe('"smtp.example.com"');
  });

  it("不正な形式の行をスキップする", () => {
    const content = `# Comment
VALID_VAR=value
INVALID_LINE_WITHOUT_EQUALS
ANOTHER_VALID=123
`;

    const parsed = parseEnvTemplate(content);

    expect(parsed.VALID_VAR).toBe("value");
    expect(parsed.ANOTHER_VALID).toBe("123");
    expect(parsed.INVALID_LINE_WITHOUT_EQUALS).toBeUndefined();
  });

  it("改行コードが混在していても正しくパースする", () => {
    const contentWithMixedLineEndings =
      "VAR1=value1\nVAR2=value2\r\nVAR3=value3\n";
    const parsed = parseEnvTemplate(contentWithMixedLineEndings);

    expect(parsed.VAR1).toBe("value1");
    expect(parsed.VAR2).toBe("value2");
    expect(parsed.VAR3).toBe("value3");
  });
});
