import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

interface Label {
  name: string;
  color: string;
  description?: string;
}

const LABELS_FILE = path.join(process.cwd(), ".github", "labels.json");

/**
 * GitHub CLI コマンドを実行するヘルパー関数
 */
const execGhCommand = (command: string): string => {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (error instanceof Error && "stderr" in error) {
      throw new Error(
        `GitHub CLI command failed: ${(error as { stderr: Buffer }).stderr.toString()}`
      );
    }
    throw error;
  }
};

/**
 * 定義ファイルからラベルを読み込む
 */
const loadLabelsFromFile = (): Label[] => {
  if (!fs.existsSync(LABELS_FILE)) {
    throw new Error(`Labels file not found: ${LABELS_FILE}`);
  }

  const content = fs.readFileSync(LABELS_FILE, "utf8");
  const labels = JSON.parse(content);

  if (!Array.isArray(labels)) {
    throw new Error("Labels file must contain an array of labels");
  }

  for (const label of labels) {
    const hasValidName = label.name?.trim();
    const hasValidColor = label.color?.trim();

    if (!(hasValidName && hasValidColor)) {
      throw new Error(
        "Each label must have non-empty 'name' and 'color' properties"
      );
    }
  }

  return labels;
};

/**
 * GitHub リポジトリから既存のラベルを取得
 */
const getExistingLabels = (): Label[] => {
  console.log("📋 Fetching existing labels from GitHub...");
  const output = execGhCommand("gh label list --json name,color,description");

  if (!output) {
    return [];
  }

  return JSON.parse(output);
};

/**
 * ラベルを作成
 */
const createLabel = (label: Label): void => {
  console.log(`  ➕ Creating label: ${label.name}`);
  const args = ["label", "create", label.name, "--color", label.color];
  if (label.description) {
    args.push("--description", label.description);
  }
  execGhCommand(
    `gh ${args.map((arg) => `"${arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(" ")}`
  );
};

/**
 * ラベルを更新
 */
const updateLabel = (label: Label): void => {
  console.log(`  🔄 Updating label: ${label.name}`);
  const args = ["label", "edit", label.name, "--color", label.color];
  if (label.description) {
    args.push("--description", label.description);
  }
  execGhCommand(
    `gh ${args.map((arg) => `"${arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(" ")}`
  );
};

/**
 * ラベルを削除
 */
const deleteLabel = (name: string): void => {
  console.log(`  ❌ Deleting label: ${name}`);
  const args = ["label", "delete", name, "--yes"];
  execGhCommand(
    `gh ${args.map((arg) => `"${arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(" ")}`
  );
};

/**
 * 2つのラベルが異なるかチェック
 */
const labelsAreDifferent = (label1: Label, label2: Label): boolean => {
  return (
    label1.color.toLowerCase() !== label2.color.toLowerCase() ||
    (label1.description || "") !== (label2.description || "")
  );
};

/**
 * メイン処理
 */
const main = () => {
  try {
    console.log("🏷️  GitHub Labels Sync Tool");
    console.log("━".repeat(50));

    // GitHub CLI が利用可能かチェック
    try {
      execGhCommand("gh --version");
    } catch {
      throw new Error(
        "GitHub CLI (gh) is not installed or not in PATH. Please install it from https://cli.github.com/"
      );
    }

    // ラベル定義を読み込み
    const definedLabels = loadLabelsFromFile();
    console.log(`📁 Loaded ${definedLabels.length} labels from ${LABELS_FILE}`);

    // 既存のラベルを取得
    const existingLabels = getExistingLabels();
    console.log(`📊 Found ${existingLabels.length} existing labels on GitHub`);

    // 既存ラベルのマップを作成
    const existingLabelsMap = new Map(
      existingLabels.map((label) => [label.name.toLowerCase(), label])
    );

    // 定義ファイルのラベルのマップを作成
    const definedLabelsMap = new Map(
      definedLabels.map((label) => [label.name.toLowerCase(), label])
    );

    console.log("\n🔄 Syncing labels...");

    let created = 0;
    let updated = 0;
    let deleted = 0;
    let unchanged = 0;

    // 定義ファイルのラベルを処理（作成または更新）
    for (const label of definedLabels) {
      const existingLabel = existingLabelsMap.get(label.name.toLowerCase());

      if (!existingLabel) {
        createLabel(label);
        created++;
      } else if (labelsAreDifferent(label, existingLabel)) {
        updateLabel(label);
        updated++;
      } else {
        unchanged++;
      }
    }

    // 定義ファイルにないラベルを削除
    for (const existingLabel of existingLabels) {
      if (!definedLabelsMap.has(existingLabel.name.toLowerCase())) {
        deleteLabel(existingLabel.name);
        deleted++;
      }
    }

    console.log("\n✅ Sync completed!");
    console.log("━".repeat(50));
    console.log(`  Created:   ${created}`);
    console.log(`  Updated:   ${updated}`);
    console.log(`  Deleted:   ${deleted}`);
    console.log(`  Unchanged: ${unchanged}`);
    console.log(`  Total:     ${definedLabels.length}`);
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

main();
