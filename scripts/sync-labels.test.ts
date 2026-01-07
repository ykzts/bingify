import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const LABELS_PATH = path.join(process.cwd(), ".github", "labels.json");
const HEX_COLOR_REGEX = /^[0-9A-Fa-f]{6}$/;

describe("sync-labels", () => {
  describe("labels.json", () => {
    it(".github/labels.json が存在すること", () => {
      expect(fs.existsSync(LABELS_PATH)).toBe(true);
    });

    it("labels.json が有効な JSON 配列であること", () => {
      const content = fs.readFileSync(LABELS_PATH, "utf8");
      const labels = JSON.parse(content);

      expect(Array.isArray(labels)).toBe(true);
    });

    it("各ラベルが必須プロパティを持つこと", () => {
      const content = fs.readFileSync(LABELS_PATH, "utf8");
      const labels = JSON.parse(content);

      for (const label of labels) {
        expect(label).toHaveProperty("name");
        expect(label).toHaveProperty("color");
        expect(typeof label.name).toBe("string");
        expect(typeof label.color).toBe("string");
        expect(label.name.length).toBeGreaterThan(0);
        expect(label.color.length).toBeGreaterThan(0);
      }
    });

    it("各ラベルの色が有効な16進数カラーコードであること", () => {
      const content = fs.readFileSync(LABELS_PATH, "utf8");
      const labels = JSON.parse(content);

      for (const label of labels) {
        expect(label.color).toMatch(HEX_COLOR_REGEX);
      }
    });

    it("ラベル名が重複していないこと", () => {
      const content = fs.readFileSync(LABELS_PATH, "utf8");
      const labels = JSON.parse(content);

      const names = labels.map((label: { name: string }) =>
        label.name.toLowerCase()
      );
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });

    it("description プロパティが存在する場合は文字列であること", () => {
      const content = fs.readFileSync(LABELS_PATH, "utf8");
      const labels = JSON.parse(content);

      for (const label of labels) {
        if (Object.hasOwn(label, "description")) {
          expect(typeof label.description).toBe("string");
        }
      }
    });

    it("ラベル名がアルファベット順にソートされていること", () => {
      const content = fs.readFileSync(LABELS_PATH, "utf8");
      const labels = JSON.parse(content);

      const names = labels.map((label: { name: string }) =>
        label.name.toLowerCase()
      );
      const sortedNames = [...names].sort();

      expect(names).toEqual(sortedNames);
    });
  });
});
