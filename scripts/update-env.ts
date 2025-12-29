import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ENV_FILE = path.join(process.cwd(), ".env.local");

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

  const updates: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: API_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  };

  let envContent = "";
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, "utf8");
  }

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
    ENV_FILE,
    newContent.endsWith("\n") ? newContent : `${newContent}\n`
  );
  console.log("✅ .env.local has been updated with local Supabase keys.");
} catch (error) {
  console.error(
    "❌ Failed to update .env.local:",
    error instanceof Error ? error.message : String(error)
  );
  console.error('Is Supabase running? Try "pnpm exec supabase start" first.');
  process.exit(1);
}
