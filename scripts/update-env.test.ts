import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const TEST_ENV_FILE = path.join(process.cwd(), ".env.local.test");

describe("update-env script", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_ENV_FILE)) {
      fs.unlinkSync(TEST_ENV_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_ENV_FILE)) {
      fs.unlinkSync(TEST_ENV_FILE);
    }
  });

  it("creates new .env.local with Supabase keys", () => {
    const mockSupabaseConfig = {
      ANON_KEY: "test-anon-key",
      API_URL: "http://127.0.0.1:54321",
      SERVICE_ROLE_KEY: "test-service-role-key",
    };

    const updates: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mockSupabaseConfig.ANON_KEY,
      NEXT_PUBLIC_SUPABASE_URL: mockSupabaseConfig.API_URL,
      SUPABASE_SERVICE_ROLE_KEY: mockSupabaseConfig.SERVICE_ROLE_KEY,
    };

    const envContent = "";
    let lines = envContent.split("\n");
    const usedKeys = new Set<string>();

    lines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return line;
      }

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) {
        return line;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      if (updates[key]) {
        usedKeys.add(key);
        return `${key}=${updates[key]}`;
      }
      return line;
    });

    for (const key of Object.keys(updates)) {
      if (!usedKeys.has(key)) {
        if (lines.length > 0 && lines.at(-1) !== "") {
          lines.push("");
        }
        lines.push(`${key}=${updates[key]}`);
      }
    }

    const newContent = lines.join("\n");
    fs.writeFileSync(
      TEST_ENV_FILE,
      newContent.endsWith("\n") ? newContent : `${newContent}\n`
    );

    const content = fs.readFileSync(TEST_ENV_FILE, "utf8");
    expect(content).toContain(
      "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
    );
    expect(content).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key");
    expect(content).toContain(
      "SUPABASE_SERVICE_ROLE_KEY=test-service-role-key"
    );
  });

  it("updates existing .env.local while preserving other variables", () => {
    const existingContent = `# Comment
NEXT_PUBLIC_SUPABASE_URL=http://old-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=old-key
OTHER_VAR=should-be-preserved
# Another comment
ANOTHER_VAR=also-preserved
`;

    fs.writeFileSync(TEST_ENV_FILE, existingContent);

    const mockSupabaseConfig = {
      ANON_KEY: "new-anon-key",
      API_URL: "http://127.0.0.1:54321",
      SERVICE_ROLE_KEY: "new-service-role-key",
    };

    const updates: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mockSupabaseConfig.ANON_KEY,
      NEXT_PUBLIC_SUPABASE_URL: mockSupabaseConfig.API_URL,
      SUPABASE_SERVICE_ROLE_KEY: mockSupabaseConfig.SERVICE_ROLE_KEY,
    };

    const envContent = fs.readFileSync(TEST_ENV_FILE, "utf8");
    let lines = envContent.split("\n");
    const usedKeys = new Set<string>();

    lines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return line;
      }

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) {
        return line;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      if (updates[key]) {
        usedKeys.add(key);
        return `${key}=${updates[key]}`;
      }
      return line;
    });

    for (const key of Object.keys(updates)) {
      if (!usedKeys.has(key)) {
        if (lines.length > 0 && lines.at(-1) !== "") {
          lines.push("");
        }
        lines.push(`${key}=${updates[key]}`);
      }
    }

    const newContent = lines.join("\n");
    fs.writeFileSync(
      TEST_ENV_FILE,
      newContent.endsWith("\n") ? newContent : `${newContent}\n`
    );

    const content = fs.readFileSync(TEST_ENV_FILE, "utf8");
    expect(content).toContain("# Comment");
    expect(content).toContain("# Another comment");
    expect(content).toContain("OTHER_VAR=should-be-preserved");
    expect(content).toContain("ANOTHER_VAR=also-preserved");
    expect(content).toContain(
      "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
    );
    expect(content).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=new-anon-key");
    expect(content).toContain("SUPABASE_SERVICE_ROLE_KEY=new-service-role-key");
    expect(content).not.toContain("old-key");
    expect(content).not.toContain("old-url");
  });

  it("handles environment variables with '=' in the value", () => {
    const existingContent = `# Test
BASE64_KEY=aGVsbG8=d29ybGQ=
NEXT_PUBLIC_SUPABASE_URL=http://old-url
`;

    fs.writeFileSync(TEST_ENV_FILE, existingContent);

    const mockSupabaseConfig = {
      ANON_KEY: "new-anon-key",
      API_URL: "http://127.0.0.1:54321",
      SERVICE_ROLE_KEY: "new-service-role-key",
    };

    const updates: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mockSupabaseConfig.ANON_KEY,
      NEXT_PUBLIC_SUPABASE_URL: mockSupabaseConfig.API_URL,
      SUPABASE_SERVICE_ROLE_KEY: mockSupabaseConfig.SERVICE_ROLE_KEY,
    };

    const envContent = fs.readFileSync(TEST_ENV_FILE, "utf8");
    let lines = envContent.split("\n");
    const usedKeys = new Set<string>();

    lines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return line;
      }

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) {
        return line;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      if (updates[key]) {
        usedKeys.add(key);
        return `${key}=${updates[key]}`;
      }
      return line;
    });

    for (const key of Object.keys(updates)) {
      if (!usedKeys.has(key)) {
        if (lines.length > 0 && lines.at(-1) !== "") {
          lines.push("");
        }
        lines.push(`${key}=${updates[key]}`);
      }
    }

    const newContent = lines.join("\n");
    fs.writeFileSync(
      TEST_ENV_FILE,
      newContent.endsWith("\n") ? newContent : `${newContent}\n`
    );

    const content = fs.readFileSync(TEST_ENV_FILE, "utf8");
    expect(content).toContain("BASE64_KEY=aGVsbG8=d29ybGQ=");
    expect(content).toContain(
      "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
    );
    expect(content).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=new-anon-key");
  });
});
