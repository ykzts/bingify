import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ENV_FILE = path.join(process.cwd(), ".env.local");
const TEMPLATE_FILE = path.join(process.cwd(), ".env.local.example");
const LINE_SPLIT_REGEX = /\r?\n/;
const QUOTED_VALUE_REGEX = /^(["'])(.*)\1$/;

const collectProcessEnvValues = () => {
  const values: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }

  return values;
};

const parseEnvValues = (content: string) => {
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

const wrapWithTemplateQuotes = (value: string, templateValue: string) => {
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

try {
  console.log("🔄 Fetching Supabase status...");
  const output = execSync("pnpm exec supabase status -o json").toString();
  const supabaseConfig = JSON.parse(output);

  const { API_URL, ANON_KEY, SERVICE_ROLE_KEY } = supabaseConfig ?? {};
  if (!(API_URL && ANON_KEY && SERVICE_ROLE_KEY)) {
    const missing: string[] = [];
    if (!API_URL) {
      missing.push("API_URL");
    }
    if (!ANON_KEY) {
      missing.push("ANON_KEY");
    }
    if (!SERVICE_ROLE_KEY) {
      missing.push("SERVICE_ROLE_KEY");
    }
    throw new Error(
      `Missing required keys in Supabase status output: ${missing.join(", ")}`
    );
  }

  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error(".env.local.example is missing. Cannot build template.");
  }

  const templateContent = fs.readFileSync(TEMPLATE_FILE, "utf8");
  const existingContent = fs.existsSync(ENV_FILE)
    ? fs.readFileSync(ENV_FILE, "utf8")
    : "";

  const existingValues = {
    ...parseEnvValues(existingContent),
    ...collectProcessEnvValues(),
  };
  const updates: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: API_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  };

  const templateLines = templateContent.split(LINE_SPLIT_REGEX);
  const usedKeys = new Set<string>();

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
    usedKeys.add(key);

    if (Object.hasOwn(updates, key)) {
      return `${key}=${wrapWithTemplateQuotes(updates[key], templateValue)}`;
    }

    if (Object.hasOwn(existingValues, key)) {
      return `${key}=${wrapWithTemplateQuotes(
        existingValues[key],
        templateValue
      )}`;
    }

    return line;
  });

  const newContent = renderedLines.join("\n");
  fs.writeFileSync(
    ENV_FILE,
    newContent.endsWith("\n") ? newContent : `${newContent}\n`
  );

  console.log(
    "✅ .env.local has been regenerated from .env.local.example and updated with local Supabase keys."
  );
} catch (error) {
  console.error(
    "❌ Failed to update .env.local:",
    error instanceof Error ? error.message : String(error)
  );
  console.error('Is Supabase running? Try "pnpm exec supabase start" first.');
  process.exit(1);
}
